import { Test, TestingModule } from '@nestjs/testing';
import { CredentialMigrationService } from './credential-migration.service';
import { CredentialDeduplicationService } from './credential-deduplication.service';
import { DataSource } from 'typeorm';

describe('CredentialMigrationService', () => {
  let service: CredentialMigrationService;
  let dataSource: jest.Mocked<DataSource>;
  let deduplicationService: jest.Mocked<CredentialDeduplicationService>;
  let queryRunner: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn().mockImplementation((EntityClass, dto) => dto),
        save: jest.fn().mockResolvedValue(true),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    deduplicationService = {
      preventDuplicateUpload: jest.fn().mockResolvedValue({ allowed: true }),
      generateContentHash: jest.fn().mockReturnValue('mock-hash-abc123'),
    } as unknown as jest.Mocked<CredentialDeduplicationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialMigrationService,
        { provide: DataSource, useValue: dataSource },
        { provide: CredentialDeduplicationService, useValue: deduplicationService },
      ],
    }).compile();

    service = module.get<CredentialMigrationService>(CredentialMigrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should migrate valid credentials and commit transaction', async () => {
    const payload = {
      sourceSystem: 'LegacyV1',
      targetSystem: 'ValidFi',
      credentials: [
        { credentialType: 'Degree', issuedBy: 'University X', payload: { GPA: 3.8 } },
      ],
    };

    const result = await service.migrateCredentials(payload);

    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.skippedDuplicates).toBe(0);
  });

  it('should skip duplicate credentials during migration', async () => {
    deduplicationService.preventDuplicateUpload.mockResolvedValueOnce({
      allowed: false,
      reason: 'Exact duplicate exists',
      existingId: 'existing-uuid',
    });

    const payload = {
      sourceSystem: 'LegacyV1',
      targetSystem: 'ValidFi',
      credentials: [
        { credentialType: 'Degree', issuedBy: 'University X', payload: { GPA: 3.8 } },
      ],
    };

    const result = await service.migrateCredentials(payload);

    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.save).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it('should rollback transaction if a credential is invalid', async () => {
    const payload = {
      sourceSystem: 'LegacyV1',
      targetSystem: 'ValidFi',
      credentials: [
        { credentialType: 'Degree', issuedBy: 'University X', payload: { GPA: 3.8 } },
        { issuedBy: 'Unknown' }, // Missing type and payload
      ],
    };

    const result = await service.migrateCredentials(payload);

    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.migratedCount).toBe(0);
    expect(result.failedCount).toBe(2);
  });

  it('should migrate multiple valid credentials with deduplication', async () => {
    deduplicationService.preventDuplicateUpload
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, reason: 'Exact duplicate exists', existingId: 'existing-uuid' })
      .mockResolvedValueOnce({ allowed: true });

    const payload = {
      sourceSystem: 'LegacyV1',
      targetSystem: 'ValidFi',
      credentials: [
        { credentialType: 'Degree', issuedBy: 'University X', payload: { GPA: 3.8 } },
        { credentialType: 'Certificate', issuedBy: 'University Y', payload: { grade: 'A' } },
        { credentialType: 'License', issuedBy: 'Board Z', payload: { valid: true } },
      ],
    };

    const result = await service.migrateCredentials(payload);

    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.skippedDuplicates).toBe(1);
  });
});
