import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Between,
  DataSource,
  LessThan,
  MoreThanOrEqual,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { createHmac } from 'crypto';
import {
  AuditLog,
  AuditOperation,
  AuditStatus,
} from './audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

/** Payload accepted when appending a new audit entry. */
export interface RecordAuditInput {
  actorId: string;
  operationType: AuditOperation;
  targetCredentialId?: string | null;
  clientIp?: string | null;
  status?: AuditStatus;
  metadata?: Record<string, any> | null;
}

export interface PaginatedAuditResult {
  data: AuditLog[];
  total: number;
  page: number;
  lastPage: number;
}

export interface IntegrityReport {
  valid: boolean;
  checked: number;
  /** Sequence number of the first tampered entry, when `valid` is false. */
  brokenAtSequence?: string;
  reason?: string;
}

/**
 * Advisory-lock key used to serialize concurrent chain appends so that the
 * `previousHash` linkage is never computed against a stale tail.
 */
const AUDIT_CHAIN_LOCK_KEY = 838150;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly hmacSecret: string;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.hmacSecret =
      this.configService.get<string>('AUDIT_HMAC_SECRET') ??
      this.configService.get<string>('JWT_SECRET') ??
      'insecure-development-audit-secret';
  }

  /**
   * Append a new entry to the audit chain. Serialized via a transaction-scoped
   * advisory lock so concurrent writers cannot fork the hash chain.
   */
  async record(input: RecordAuditInput): Promise<AuditLog> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        AUDIT_CHAIN_LOCK_KEY,
      ]);

      const repo = manager.getRepository(AuditLog);
      const last = await repo.findOne({
        where: {},
        order: { sequence: 'DESC' },
      });
      const previousHash = last ? last.hash : null;

      const entry = repo.create({
        actorId: input.actorId,
        operationType: input.operationType,
        targetCredentialId: input.targetCredentialId ?? null,
        clientIp: input.clientIp ?? null,
        status: input.status ?? AuditStatus.SUCCESS,
        metadata: input.metadata ?? null,
        previousHash,
      });
      entry.hash = this.computeHash(entry, previousHash);

      return repo.save(entry);
    });
  }

  /**
   * Paginated, filtered query over the audit trail. Intended for admin use.
   */
  async query(dto: QueryAuditLogDto): Promise<PaginatedAuditResult> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (dto.actorId) where.actorId = dto.actorId;
    if (dto.operationType) where.operationType = dto.operationType;
    if (dto.status) where.status = dto.status;
    if (dto.targetCredentialId)
      where.targetCredentialId = dto.targetCredentialId;

    if (dto.from && dto.to) {
      where.createdAt = Between(new Date(dto.from), new Date(dto.to));
    } else if (dto.from) {
      where.createdAt = MoreThanOrEqual(new Date(dto.from));
    } else if (dto.to) {
      where.createdAt = LessThanOrEqual(new Date(dto.to));
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      order: { sequence: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  /**
   * Recompute every entry's HMAC and validate the chain linkage to detect any
   * post-hoc modification. Verification starts from the earliest surviving
   * entry, so a retention purge of a contiguous prefix does not raise a false
   * positive.
   */
  async verifyIntegrity(): Promise<IntegrityReport> {
    const entries = await this.auditRepository.find({
      order: { sequence: 'ASC' },
    });

    let previous: AuditLog | null = null;
    for (const entry of entries) {
      const expected = this.computeHash(entry, entry.previousHash);
      if (expected !== entry.hash) {
        return {
          valid: false,
          checked: entries.length,
          brokenAtSequence: entry.sequence,
          reason: 'hash mismatch: entry payload was modified',
        };
      }

      if (previous && entry.previousHash !== previous.hash) {
        return {
          valid: false,
          checked: entries.length,
          brokenAtSequence: entry.sequence,
          reason: 'chain linkage broken: an entry was inserted or removed',
        };
      }
      previous = entry;
    }

    return { valid: true, checked: entries.length };
  }

  /**
   * Enforce the retention policy by purging entries older than the configured
   * threshold. Only a contiguous prefix (the oldest entries) is removed, which
   * preserves the integrity of the remaining chain.
   *
   * @returns the number of entries purged.
   */
  async enforceRetention(retentionDays?: number): Promise<number> {
    const days =
      retentionDays ??
      this.configService.get<number>('AUDIT_RETENTION_DAYS') ??
      365;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { affected } = await this.auditRepository.delete({
      createdAt: LessThan(cutoff),
    });
    const purged = affected ?? 0;
    if (purged > 0) {
      this.logger.log(
        `Retention purge removed ${purged} audit entries older than ${days} days`,
      );
    }
    return purged;
  }

  /**
   * Export matching audit records for compliance review.
   */
  async export(
    dto: QueryAuditLogDto,
    format: 'json' | 'csv',
  ): Promise<string> {
    const where: Record<string, unknown> = {};
    if (dto.actorId) where.actorId = dto.actorId;
    if (dto.operationType) where.operationType = dto.operationType;
    if (dto.status) where.status = dto.status;
    if (dto.targetCredentialId)
      where.targetCredentialId = dto.targetCredentialId;
    if (dto.from && dto.to) {
      where.createdAt = Between(new Date(dto.from), new Date(dto.to));
    } else if (dto.from) {
      where.createdAt = MoreThanOrEqual(new Date(dto.from));
    } else if (dto.to) {
      where.createdAt = LessThanOrEqual(new Date(dto.to));
    }

    const records = await this.auditRepository.find({
      where,
      order: { sequence: 'ASC' },
    });

    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }
    return this.toCsv(records);
  }

  /**
   * Compute the HMAC-SHA256 of an entry's canonical, app-controlled payload
   * chained to the previous entry's hash. DB-generated columns (`sequence`,
   * `createdAt`) are intentionally excluded so the hash is deterministic at
   * insert time and reproducible at verification time.
   */
  private computeHash(
    entry: Pick<
      AuditLog,
      | 'actorId'
      | 'operationType'
      | 'targetCredentialId'
      | 'clientIp'
      | 'status'
      | 'metadata'
    >,
    previousHash: string | null,
  ): string {
    const payload = stableStringify({
      actorId: entry.actorId,
      operationType: entry.operationType,
      targetCredentialId: entry.targetCredentialId ?? null,
      clientIp: entry.clientIp ?? null,
      status: entry.status,
      metadata: entry.metadata ?? null,
      previousHash: previousHash ?? null,
    });
    return createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
  }

  private toCsv(records: AuditLog[]): string {
    const columns: (keyof AuditLog)[] = [
      'sequence',
      'createdAt',
      'actorId',
      'operationType',
      'targetCredentialId',
      'clientIp',
      'status',
      'metadata',
      'previousHash',
      'hash',
    ];
    const header = columns.join(',');
    const rows = records.map((record) =>
      columns
        .map((column) => csvCell(record[column]))
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}

/** Deterministic JSON serialization with recursively sorted object keys. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${stableStringify(
        (value as Record<string, unknown>)[key],
      )}`,
  );
  return `{${entries.join(',')}}`;
}

/** Render a value as a CSV cell, quoting and escaping when required. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
