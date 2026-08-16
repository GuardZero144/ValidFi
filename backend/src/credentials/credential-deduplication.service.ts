import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Credential } from './credential.entity';
import { CheckDuplicateDto, UploadCredentialDto } from './dto/check-duplicate.dto';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingCredential?: Credential;
  similarityScore?: number;
  matchedOn?: string[];
}

export interface DeduplicationResult {
  credential: Credential;
  wasDuplicate: boolean;
  action: 'created' | 'merged' | 'rejected';
  duplicateOfId?: string;
}

@Injectable()
export class CredentialDeduplicationService {
  private readonly logger = new Logger(CredentialDeduplicationService.name);

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
  ) {}

  /**
   * Generate a SHA-256 content hash from credential fields.
   * Deterministic: same input always produces the same hash.
   */
  generateContentHash(type: string, issuer: string, holder: string | null, data: Record<string, any>): string {
    const normalized = this.normalizeForHashing(type, issuer, holder, data);
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Normalize credential data into a canonical string for hashing.
   * Sorts object keys recursively to ensure deterministic output.
   */
  private normalizeForHashing(type: string, issuer: string, holder: string | null, data: Record<string, any>): string {
    const canonical = {
      type: type.trim().toLowerCase(),
      issuer: issuer.trim().toLowerCase(),
      holder: holder ? holder.trim().toLowerCase() : null,
      data: this.sortObjectKeys(data),
    };
    return JSON.stringify(canonical);
  }

  /**
   * Recursively sort object keys for deterministic JSON serialization.
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sortObjectKeys(item));
    if (typeof obj === 'object') {
      const sorted: Record<string, any> = {};
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = this.sortObjectKeys(obj[key]);
      }
      return sorted;
    }
    return obj;
  }

  /**
   * Compute a similarity score between two credential data objects.
   * Returns a value between 0 (no similarity) and 1 (identical).
   */
  private computeSimilarity(dataA: Record<string, any>, dataB: Record<string, any>): number {
    const keysA = Object.keys(dataA);
    const keysB = Object.keys(dataB);

    if (keysA.length === 0 && keysB.length === 0) return 1;
    if (keysA.length === 0 || keysB.length === 0) return 0;

    const allKeys = new Set([...keysA, ...keysB]);
    let matchingFields = 0;

    for (const key of allKeys) {
      if (key in dataA && key in dataB) {
        if (JSON.stringify(this.sortObjectKeys(dataA[key])) === JSON.stringify(this.sortObjectKeys(dataB[key]))) {
          matchingFields++;
        }
      }
    }

    return matchingFields / allKeys.size;
  }

  /**
   * Identify which fields match between two credentials.
   */
  private identifyMatches(existing: Credential, candidate: CheckDuplicateDto): string[] {
    const matches: string[] = [];

    if (existing.type.trim().toLowerCase() === candidate.type.trim().toLowerCase()) {
      matches.push('type');
    }
    if (existing.issuer.trim().toLowerCase() === candidate.issuer.trim().toLowerCase()) {
      matches.push('issuer');
    }
    if (existing.holder && candidate.holder &&
        existing.holder.trim().toLowerCase() === candidate.holder.trim().toLowerCase()) {
      matches.push('holder');
    }

    const dataSimilarity = this.computeSimilarity(existing.data, candidate.data);
    if (dataSimilarity > 0.8) {
      matches.push('data');
    }

    return matches;
  }

  /**
   * Check if a credential is an exact duplicate (same content hash).
   */
  async checkExactDuplicate(dto: CheckDuplicateDto): Promise<DuplicateCheckResult> {
    const contentHash = this.generateContentHash(dto.type, dto.issuer, dto.holder || null, dto.data);

    const existing = await this.credentialRepository.findOne({
      where: { contentHash, isDuplicate: false },
    });

    if (existing) {
      this.logger.warn(`Exact duplicate detected: existing=${existing.id}, hash=${contentHash}`);
      return {
        isDuplicate: true,
        existingCredential: existing,
        similarityScore: 1.0,
        matchedOn: ['type', 'issuer', 'holder', 'data'],
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Check for similar credentials (fuzzy matching on type + issuer + data similarity).
   */
  async checkSimilarCredentials(dto: CheckDuplicateDto, threshold = 0.8): Promise<DuplicateCheckResult[]> {
    const candidates = await this.credentialRepository.find({
      where: {
        type: dto.type,
        issuer: dto.issuer,
        isDuplicate: false,
      },
    });

    const results: DuplicateCheckResult[] = [];

    for (const candidate of candidates) {
      const similarity = this.computeSimilarity(candidate.data, dto.data);
      if (similarity >= threshold) {
        const matchedOn = this.identifyMatches(candidate, dto);
        results.push({
          isDuplicate: true,
          existingCredential: candidate,
          similarityScore: similarity,
          matchedOn,
        });
      }
    }

    return results;
  }

  /**
   * Comprehensive duplicate check: exact match + similar credentials.
   */
  async checkForDuplicates(dto: CheckDuplicateDto): Promise<DuplicateCheckResult> {
    const exactMatch = await this.checkExactDuplicate(dto);
    if (exactMatch.isDuplicate) return exactMatch;

    const similarMatches = await this.checkSimilarCredentials(dto);
    if (similarMatches.length > 0) {
      const bestMatch = similarMatches.reduce((best, current) =>
        (current.similarityScore || 0) > (best.similarityScore || 0) ? current : best,
      );

      this.logger.warn(
        `Similar credential found: existing=${bestMatch.existingCredential?.id}, score=${bestMatch.similarityScore}`,
      );
      return bestMatch;
    }

    return { isDuplicate: false };
  }

  /**
   * Upload a credential with duplicate detection.
   * Returns the credential and whether it was a duplicate.
   */
  async uploadWithDeduplication(dto: UploadCredentialDto): Promise<DeduplicationResult> {
    const contentHash = this.generateContentHash(dto.type, dto.issuer, dto.holder || null, dto.data);

    const duplicateCheck = await this.checkForDuplicates({
      type: dto.type,
      issuer: dto.issuer,
      holder: dto.holder,
      data: dto.data,
    });

    if (duplicateCheck.isDuplicate && duplicateCheck.existingCredential) {
      const existing = duplicateCheck.existingCredential;

      if (duplicateCheck.similarityScore === 1.0) {
        this.logger.log(`Exact duplicate rejected: existing=${existing.id}`);
        throw new ConflictException({
          message: 'Credential is an exact duplicate of an existing credential',
          existingCredentialId: existing.id,
          contentHash,
        });
      }

      this.logger.log(
        `Similar credential merged: new data merged into existing=${existing.id}, score=${duplicateCheck.similarityScore}`,
      );

      existing.data = { ...existing.data, ...dto.data };
      existing.duplicateMetadata = {
        mergedAt: new Date().toISOString(),
        similarityScore: duplicateCheck.similarityScore,
        matchedOn: duplicateCheck.matchedOn,
        previousData: existing.data,
      };
      const saved = await this.credentialRepository.save(existing);

      return {
        credential: saved,
        wasDuplicate: true,
        action: 'merged',
        duplicateOfId: existing.id,
      };
    }

    const credential = this.credentialRepository.create({
      type: dto.type,
      issuer: dto.issuer,
      holder: dto.holder,
      data: dto.data,
      systemSource: dto.systemSource,
      contentHash,
      isDuplicate: false,
      status: 'active',
    });
    const saved = await this.credentialRepository.save(credential);

    this.logger.log(`New credential created: id=${saved.id}, hash=${contentHash}`);
    return {
      credential: saved,
      wasDuplicate: false,
      action: 'created',
    };
  }

  /**
   * Prevent duplicate upload by checking before saving.
   * Used by migration service to skip duplicates during batch imports.
   */
  async preventDuplicateUpload(credential: Partial<Credential>): Promise<{ allowed: boolean; reason?: string; existingId?: string }> {
    if (!credential.type || !credential.issuer || !credential.data) {
      return { allowed: false, reason: 'Missing required fields for duplicate check' };
    }

    const contentHash = this.generateContentHash(
      credential.type,
      credential.issuer,
      credential.holder || null,
      credential.data,
    );

    const existing = await this.credentialRepository.findOne({
      where: { contentHash, isDuplicate: false },
    });

    if (existing) {
      this.logger.warn(`Duplicate upload prevented: existing=${existing.id}`);
      return { allowed: false, reason: 'Exact duplicate exists', existingId: existing.id };
    }

    return { allowed: true };
  }

  /**
   * Mark a credential as a duplicate of another.
   */
  async markAsDuplicate(duplicateId: string, originalId: string): Promise<Credential> {
    const duplicate = await this.credentialRepository.findOne({ where: { id: duplicateId } });
    if (!duplicate) {
      throw new Error(`Credential not found: ${duplicateId}`);
    }

    duplicate.isDuplicate = true;
    duplicate.duplicateOfId = originalId;
    duplicate.status = 'duplicate';
    duplicate.duplicateMetadata = {
      markedAt: new Date().toISOString(),
      originalId,
    };

    return await this.credentialRepository.save(duplicate);
  }

  /**
   * Find all duplicates of a given credential.
   */
  async findDuplicatesOf(credentialId: string): Promise<Credential[]> {
    return await this.credentialRepository.find({
      where: { duplicateOfId: credentialId, isDuplicate: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get deduplication statistics.
   */
  async getDeduplicationStats(): Promise<{
    totalCredentials: number;
    uniqueCredentials: number;
    duplicateCredentials: number;
    duplicateRate: number;
  }> {
    const total = await this.credentialRepository.count();
    const duplicates = await this.credentialRepository.count({ where: { isDuplicate: true } });
    const unique = total - duplicates;

    return {
      totalCredentials: total,
      uniqueCredentials: unique,
      duplicateCredentials: duplicates,
      duplicateRate: total > 0 ? duplicates / total : 0,
    };
  }
}
