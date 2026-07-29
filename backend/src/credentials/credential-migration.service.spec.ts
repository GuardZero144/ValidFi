import { Test, TestingModule } from '@nestjs/testing';
import { CredentialMigrationService } from './credential-migration.service';
import { DataSource } from 'typeorm';

describe('CredentialMigrationService', () => {
  let service: CredentialMigrationService;
  let dataSource: jest.Mocked<DataSource>;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialMigrationService,
        { provide: DataSource, useValue: dataSource },
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
    expect(queryRunner.manager.save).toHaveBeenCalledTimes(1); // Saves first one
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.migratedCount).toBe(0);
    expect(result.failedCount).toBe(2);
  });
});
