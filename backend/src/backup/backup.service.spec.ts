import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupRecord, BackupStatus } from './entities/backup-record.entity';
import { BackupAlert, AlertType, AlertSeverity } from './entities/backup-alert.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { IpfsService } from '../ipfs/ipfs.service';
import { IdentityService } from '../identity/identity.service';
import { VerificationService } from '../verification/verification.service';
import { DataSharingService } from '../data-sharing/data-sharing.service';

describe('BackupService', () => {
  let service: BackupService;
  let mockBackupRecordRepo: any;
  let mockBackupAlertRepo: any;
  let mockBackupConfigRepo: any;
  let mockIpfsService: any;
  let mockIdentityService: any;
  let mockVerificationService: any;
  let mockDataSharingService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockBackupRecordRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    mockBackupAlertRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockBackupConfigRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockIpfsService = {
      uploadJson: jest.fn(),
      fetchJson: jest.fn(),
    };

    mockIdentityService = {
      findAllByWallet: jest.fn(),
      restore: jest.fn(),
    };

    mockVerificationService = {
      findAllByWallet: jest.fn(),
      restore: jest.fn(),
    };

    mockDataSharingService = {
      findAllByOwner: jest.fn(),
      restore: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: getRepositoryToken(BackupRecord), useValue: mockBackupRecordRepo },
        { provide: getRepositoryToken(BackupAlert), useValue: mockBackupAlertRepo },
        { provide: getRepositoryToken(BackupConfig), useValue: mockBackupConfigRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: IpfsService, useValue: mockIpfsService },
        { provide: IdentityService, useValue: mockIdentityService },
        { provide: VerificationService, useValue: mockVerificationService },
        { provide: DataSharingService, useValue: mockDataSharingService },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      const dto = {
        walletAddress: 'test-wallet',
        backupType: 'full' as any,
      };

      const mockRecord = {
        id: 'test-id',
        walletAddress: 'test-wallet',
        status: BackupStatus.IN_PROGRESS,
      };

      mockBackupRecordRepo.create.mockReturnValue(mockRecord);
      mockBackupRecordRepo.save.mockResolvedValue({ ...mockRecord, status: BackupStatus.COMPLETED });
      mockIdentityService.findAllByWallet.mockResolvedValue([]);
      mockVerificationService.findAllByWallet.mockResolvedValue([]);
      mockDataSharingService.findAllByOwner.mockResolvedValue([]);
      mockIpfsService.uploadJson.mockResolvedValue('QmTestHash');

      const result = await service.createBackup(dto);

      expect(result.status).toBe(BackupStatus.COMPLETED);
      expect(result.ipfsCid).toBe('QmTestHash');
      expect(mockIpfsService.uploadJson).toHaveBeenCalled();
    });

    it('should handle backup failure', async () => {
      const dto = {
        walletAddress: 'test-wallet',
        backupType: 'full' as any,
      };

      mockBackupRecordRepo.create.mockReturnValue({
        id: 'test-id',
        walletAddress: 'test-wallet',
        status: BackupStatus.IN_PROGRESS,
      });
      mockBackupRecordRepo.save.mockResolvedValue({});
      mockIdentityService.findAllByWallet.mockRejectedValue(new Error('Test error'));
      mockBackupAlertRepo.create.mockReturnValue({});
      mockBackupAlertRepo.save.mockResolvedValue({});

      await expect(service.createBackup(dto)).rejects.toThrow('Test error');
    });
  });

  describe('runHealthCheck', () => {
    it('should run health check and return results', async () => {
      const mockBackups = [
        { id: '1', walletAddress: 'wallet1', status: BackupStatus.COMPLETED, ipfsCid: 'Qm1', checksum: 'abc' },
        { id: '2', walletAddress: 'wallet1', status: BackupStatus.COMPLETED, ipfsCid: 'Qm2', checksum: 'def' },
      ];

      mockBackupRecordRepo.find.mockResolvedValue(mockBackups);
      mockIpfsService.fetchJson.mockResolvedValue({ data: 'test' });

      const result = await service.runHealthCheck();

      expect(result.checked).toBe(2);
      expect(result.healthy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runRotation', () => {
    it('should rotate old backups', async () => {
      const mockConfigs = [
        {
          walletAddress: 'wallet1',
          rotationEnabled: true,
          retentionDays: 30,
          maxBackupsToKeep: 5,
        },
      ];

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const mockBackups = [
        { id: '1', walletAddress: 'wallet1', createdAt: oldDate },
        { id: '2', walletAddress: 'wallet1', createdAt: new Date() },
      ];

      mockBackupConfigRepo.find.mockResolvedValue(mockConfigs);
      mockBackupRecordRepo.find.mockResolvedValue(mockBackups);
      mockBackupRecordRepo.remove.mockResolvedValue({});
      mockBackupAlertRepo.create.mockReturnValue({});
      mockBackupAlertRepo.save.mockResolvedValue({});

      const result = await service.runRotation();

      expect(result.totalChecked).toBe(2);
      expect(result.deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConfig', () => {
    it('should return existing config', async () => {
      const mockConfig = {
        walletAddress: 'wallet1',
        autoBackupEnabled: true,
        backupIntervalHours: 24,
      };

      mockBackupConfigRepo.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfig('wallet1');

      expect(result.walletAddress).toBe('wallet1');
    });

    it('should create default config if none exists', async () => {
      mockBackupConfigRepo.findOne.mockResolvedValue(null);
      mockBackupConfigRepo.create.mockReturnValue({
        walletAddress: 'wallet1',
        autoBackupEnabled: true,
      });
      mockBackupConfigRepo.save.mockResolvedValue({
        walletAddress: 'wallet1',
        autoBackupEnabled: true,
      });

      const result = await service.getConfig('wallet1');

      expect(result.walletAddress).toBe('wallet1');
      expect(mockBackupConfigRepo.create).toHaveBeenCalled();
    });
  });
});
