import { Test, TestingModule } from '@nestjs/testing';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

describe('BackupController', () => {
  let controller: BackupController;
  let mockBackupService: any;

  beforeEach(async () => {
    mockBackupService = {
      createBackup: jest.fn(),
      getBackups: jest.fn(),
      restoreBackup: jest.fn(),
      runHealthCheck: jest.fn(),
      runRotation: jest.fn(),
      runRestorationTests: jest.fn(),
      getAlerts: jest.fn(),
      acknowledgeAlert: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        { provide: BackupService, useValue: mockBackupService },
      ],
    }).compile();

    controller = module.get<BackupController>(BackupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBackup', () => {
    it('should create a backup', async () => {
      const dto = { walletAddress: 'test-wallet', backupType: 'full' };
      mockBackupService.createBackup.mockResolvedValue({ id: 'test-id' });

      const result = await controller.createBackup(dto as any);

      expect(result).toEqual({ id: 'test-id' });
      expect(mockBackupService.createBackup).toHaveBeenCalledWith(dto);
    });
  });

  describe('getBackups', () => {
    it('should get backups for a wallet', async () => {
      mockBackupService.getBackups.mockResolvedValue([{ id: '1' }]);

      const result = await controller.getBackups('test-wallet');

      expect(result).toEqual([{ id: '1' }]);
      expect(mockBackupService.getBackups).toHaveBeenCalledWith('test-wallet');
    });
  });

  describe('restoreBackup', () => {
    it('should restore a backup', async () => {
      const dto = { backupId: 'test-id', walletAddress: 'test-wallet' };
      mockBackupService.restoreBackup.mockResolvedValue({ success: true, restored: {}, dryRun: false });

      const result = await controller.restoreBackup(dto as any);

      expect(result.success).toBe(true);
      expect(mockBackupService.restoreBackup).toHaveBeenCalledWith(dto);
    });
  });

  describe('getHealthStatus', () => {
    it('should get health status', async () => {
      mockBackupService.runHealthCheck.mockResolvedValue({ checked: 5, healthy: 4 });

      const result = await controller.getHealthStatus();

      expect(result).toEqual({ checked: 5, healthy: 4 });
    });
  });

  describe('triggerRotation', () => {
    it('should trigger rotation', async () => {
      mockBackupService.runRotation.mockResolvedValue({ totalChecked: 10, deleted: 2, kept: 8 });

      const result = await controller.triggerRotation();

      expect(result).toEqual({ totalChecked: 10, deleted: 2, kept: 8 });
    });
  });

  describe('triggerRestorationTest', () => {
    it('should trigger restoration test', async () => {
      mockBackupService.runRestorationTests.mockResolvedValue({ tested: 3, passed: 2, failed: 1 });

      const result = await controller.triggerRestorationTest();

      expect(result).toEqual({ tested: 3, passed: 2, failed: 1 });
    });
  });

  describe('getAlerts', () => {
    it('should get alerts', async () => {
      mockBackupService.getAlerts.mockResolvedValue([{ id: '1', message: 'test' }]);

      const result = await controller.getAlerts('test-wallet', 'true');

      expect(result).toEqual([{ id: '1', message: 'test' }]);
      expect(mockBackupService.getAlerts).toHaveBeenCalledWith('test-wallet', true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      mockBackupService.acknowledgeAlert.mockResolvedValue({ id: '1', acknowledged: true });

      const result = await controller.acknowledgeAlert('1');

      expect(result.acknowledged).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should get config', async () => {
      mockBackupService.getConfig.mockResolvedValue({ walletAddress: 'test-wallet' });

      const result = await controller.getConfig('test-wallet');

      expect(result.walletAddress).toBe('test-wallet');
    });
  });

  describe('updateConfig', () => {
    it('should update config', async () => {
      const dto = { backupIntervalHours: 12 };
      mockBackupService.updateConfig.mockResolvedValue({ walletAddress: 'test-wallet', backupIntervalHours: 12 });

      const result = await controller.updateConfig('test-wallet', dto as any);

      expect(result.backupIntervalHours).toBe(12);
    });
  });
});
