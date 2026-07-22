import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';
import { AuditLog, AuditOperation, AuditStatus } from './audit-log.entity';

/**
 * In-memory repository backed by a shared array so that `record()` (which
 * writes through the transaction manager) and the read/verify paths (which use
 * the injected repository) operate on the same chain.
 */
function createMockRepo(store: AuditLog[]) {
  return {
    create: jest.fn((partial: Partial<AuditLog>) => ({ ...partial }) as AuditLog),
    save: jest.fn(async (entry: AuditLog) => {
      entry.sequence = String(store.length + 1);
      entry.id = `id-${entry.sequence}`;
      entry.createdAt = new Date();
      store.push(entry);
      return entry;
    }),
    findOne: jest.fn(async ({ order }: any) => {
      if (store.length === 0) return null;
      const sorted = [...store].sort((a, b) =>
        order?.sequence === 'DESC'
          ? Number(b.sequence) - Number(a.sequence)
          : Number(a.sequence) - Number(b.sequence),
      );
      return sorted[0];
    }),
    find: jest.fn(async ({ order }: any = {}) => {
      const sorted = [...store].sort((a, b) =>
        order?.sequence === 'DESC'
          ? Number(b.sequence) - Number(a.sequence)
          : Number(a.sequence) - Number(b.sequence),
      );
      return sorted;
    }),
    findAndCount: jest.fn(async ({ where, skip = 0, take = 20 }: any) => {
      let rows = [...store];
      if (where?.actorId) rows = rows.filter((r) => r.actorId === where.actorId);
      if (where?.operationType)
        rows = rows.filter((r) => r.operationType === where.operationType);
      if (where?.status) rows = rows.filter((r) => r.status === where.status);
      const total = rows.length;
      return [rows.slice(skip, skip + take), total];
    }),
    delete: jest.fn(async () => ({ affected: 0 })),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let store: AuditLog[];
  let mockRepo: ReturnType<typeof createMockRepo>;

  const mockDataSource = {
    transaction: jest.fn(async (cb: any) =>
      cb({
        query: jest.fn().mockResolvedValue(undefined),
        getRepository: () => mockRepo,
      }),
    ),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'AUDIT_HMAC_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    store = [];
    mockRepo = createMockRepo(store);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('record', () => {
    it('anchors the genesis entry with a null previousHash', async () => {
      const entry = await service.record({
        actorId: 'GACTOR1',
        operationType: AuditOperation.ISSUED,
      });
      expect(entry.previousHash).toBeNull();
      expect(entry.hash).toHaveLength(64);
      expect(entry.status).toBe(AuditStatus.SUCCESS);
    });

    it('chains each entry to the previous hash', async () => {
      const first = await service.record({
        actorId: 'GACTOR1',
        operationType: AuditOperation.ISSUED,
      });
      const second = await service.record({
        actorId: 'GACTOR2',
        operationType: AuditOperation.REVOKED,
      });
      expect(second.previousHash).toBe(first.hash);
      expect(second.hash).not.toBe(first.hash);
    });
  });

  describe('verifyIntegrity', () => {
    it('reports a valid, intact chain', async () => {
      await service.record({ actorId: 'A', operationType: AuditOperation.ISSUED });
      await service.record({ actorId: 'B', operationType: AuditOperation.VERIFIED });
      await service.record({ actorId: 'C', operationType: AuditOperation.REVOKED });

      const report = await service.verifyIntegrity();
      expect(report.valid).toBe(true);
      expect(report.checked).toBe(3);
    });

    it('detects a tampered entry', async () => {
      await service.record({ actorId: 'A', operationType: AuditOperation.ISSUED });
      await service.record({ actorId: 'B', operationType: AuditOperation.VERIFIED });

      // Simulate post-hoc modification of a historical record.
      store[0].actorId = 'ATTACKER';

      const report = await service.verifyIntegrity();
      expect(report.valid).toBe(false);
      expect(report.brokenAtSequence).toBe('1');
    });
  });

  describe('query', () => {
    it('filters by operation type and paginates', async () => {
      await service.record({ actorId: 'A', operationType: AuditOperation.ISSUED });
      await service.record({ actorId: 'B', operationType: AuditOperation.REVOKED });
      await service.record({ actorId: 'C', operationType: AuditOperation.ISSUED });

      const result = await service.query({
        operationType: AuditOperation.ISSUED,
        page: 1,
        limit: 20,
      });
      expect(result.total).toBe(2);
      expect(result.data.every((r) => r.operationType === AuditOperation.ISSUED)).toBe(true);
    });
  });

  describe('enforceRetention', () => {
    it('purges entries older than the retention window', async () => {
      mockRepo.delete.mockResolvedValueOnce({ affected: 5 } as any);
      const purged = await service.enforceRetention(90);
      expect(purged).toBe(5);
      expect(mockRepo.delete).toHaveBeenCalled();
    });
  });

  describe('export', () => {
    it('exports JSON', async () => {
      await service.record({ actorId: 'A', operationType: AuditOperation.ISSUED });
      const json = await service.export({}, 'json');
      expect(JSON.parse(json)).toHaveLength(1);
    });

    it('exports CSV with a header row', async () => {
      await service.record({ actorId: 'A', operationType: AuditOperation.ISSUED });
      const csv = await service.export({}, 'csv');
      const lines = csv.split('\n');
      expect(lines[0]).toContain('sequence');
      expect(lines[0]).toContain('operationType');
      expect(lines).toHaveLength(2);
    });
  });
});
