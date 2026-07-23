import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import {
  BackupRecord,
  BackupStatus,
  BackupType,
} from './entities/backup-record.entity';
import {
  BackupAlert,
  AlertType,
  AlertSeverity,
} from './entities/backup-alert.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { IpfsService } from '../ipfs/ipfs.service';
import { IdentityService } from '../identity/identity.service';
import { VerificationService } from '../verification/verification.service';
import { DataSharingService } from '../data-sharing/data-sharing.service';

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private restorationTestTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRecordRepo: Repository<BackupRecord>,
    @InjectRepository(BackupAlert)
    private readonly backupAlertRepo: Repository<BackupAlert>,
    @InjectRepository(BackupConfig)
    private readonly backupConfigRepo: Repository<BackupConfig>,
    private readonly configService: ConfigService,
    private readonly ipfsService: IpfsService,
    private readonly identityService: IdentityService,
    private readonly verificationService: VerificationService,
    private readonly dataSharingService: DataSharingService,
  ) {}

  onModuleInit(): void {
    this.startScheduledTasks();
  }

  onModuleDestroy(): void {
    this.stopScheduledTasks();
  }

  private startScheduledTasks(): void {
    const healthCheckEnabled =
      this.configService.get<string>('BACKUP_HEALTH_CHECK_ENABLED') !== 'false';
    const healthCheckHours =
      this.configService.get<number>('BACKUP_HEALTH_CHECK_INTERVAL_HOURS') ?? 6;
    const rotationEnabled =
      this.configService.get<string>('BACKUP_ROTATION_ENABLED') !== 'false';
    const rotationDays =
      this.configService.get<number>('BACKUP_ROTATION_CHECK_INTERVAL_DAYS') ?? 7;
    const restorationTestEnabled =
      this.configService.get<string>('BACKUP_RESTORATION_TEST_ENABLED') !==
      'false';
    const restorationTestDays =
      this.configService.get<number>(
        'BACKUP_RESTORATION_TEST_INTERVAL_DAYS',
      ) ?? 30;

    if (healthCheckEnabled) {
      this.healthCheckTimer = setInterval(
        () => void this.runHealthCheck(),
        healthCheckHours * 60 * 60 * 1000,
      );
      this.healthCheckTimer.unref?.();
      this.logger.log(
        `Backup health check started (every ${healthCheckHours}h)`,
      );
    }

    if (rotationEnabled) {
      this.rotationTimer = setInterval(
        () => void this.runRotation(),
        rotationDays * 24 * 60 * 60 * 1000,
      );
      this.rotationTimer.unref?.();
      this.logger.log(`Backup rotation started (every ${rotationDays}d)`);
    }

    if (restorationTestEnabled) {
      this.restorationTestTimer = setInterval(
        () => void this.runRestorationTests(),
        restorationTestDays * 24 * 60 * 60 * 1000,
      );
      this.restorationTestTimer.unref?.();
      this.logger.log(
        `Backup restoration tests started (every ${restorationTestDays}d)`,
      );
    }
  }

  private stopScheduledTasks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    if (this.restorationTestTimer) {
      clearInterval(this.restorationTestTimer);
      this.restorationTestTimer = null;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledBackup(): Promise<void> {
    const enabled =
      this.configService.get<string>('BACKUP_AUTO_ENABLED') !== 'false';
    if (!enabled) return;

    const configs = await this.backupConfigRepo.find({
      where: { autoBackupEnabled: true },
    });

    for (const config of configs) {
      const lastBackup = await this.backupRecordRepo.findOne({
        where: { walletAddress: config.walletAddress },
        order: { createdAt: 'DESC' },
      });

      const intervalMs = config.backupIntervalHours * 60 * 60 * 1000;
      const shouldBackup =
        !lastBackup ||
        Date.now() - lastBackup.createdAt.getTime() >= intervalMs;

      if (shouldBackup) {
        await this.createBackup({
          walletAddress: config.walletAddress,
          backupType: BackupType.FULL,
        });
      }
    }
  }

  async createBackup(dto: CreateBackupDto): Promise<BackupRecord> {
    const record = this.backupRecordRepo.create({
      walletAddress: dto.walletAddress,
      backupType: dto.backupType || BackupType.FULL,
      status: BackupStatus.IN_PROGRESS,
    });

    try {
      const identities = await this.identityService.findAllByWallet(
        dto.walletAddress,
      );
      const verifications = await this.verificationService.findAllByWallet(
        dto.walletAddress,
      );
      const sharedData = await this.dataSharingService.findAllByOwner(
        dto.walletAddress,
      );

      const backupData = {
        walletAddress: dto.walletAddress,
        backupType: dto.backupType,
        timestamp: new Date().toISOString(),
        identities,
        verifications,
        sharedData,
      };

      const jsonContent = JSON.stringify(backupData, null, 2);
      const checksum = crypto
        .createHash('sha256')
        .update(jsonContent)
        .digest('hex');

      const ipfsCid = await this.ipfsService.uploadJson(backupData);

      record.ipfsCid = ipfsCid;
      record.sizeBytes = Buffer.byteLength(jsonContent);
      record.checksum = checksum;
      record.manifest = {
        identitiesCount: identities.length,
        verificationsCount: verifications.length,
        sharedDataCount: sharedData.length,
      };
      record.status = BackupStatus.COMPLETED;

      await this.backupRecordRepo.save(record);

      this.logger.log(
        `Backup created for ${dto.walletAddress}: ${ipfsCid}`,
      );

      if (dto.triggerHealthCheck) {
        await this.checkBackupHealth(record);
      }

      return record;
    } catch (error) {
      record.status = BackupStatus.FAILED;
      record.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.backupRecordRepo.save(record);

      await this.createAlert({
        walletAddress: dto.walletAddress,
        alertType: AlertType.BACKUP_FAILED,
        severity: AlertSeverity.HIGH,
        message: `Backup failed: ${record.errorMessage}`,
        metadata: { backupId: record.id },
      });

      throw error;
    }
  }

  async restoreBackup(dto: RestoreBackupDto): Promise<{
    success: boolean;
    restored: Record<string, number>;
    dryRun: boolean;
  }> {
    const backup = await this.backupRecordRepo.findOne({
      where: { id: dto.backupId },
    });

    if (!backup) {
      throw new Error(`Backup ${dto.backupId} not found`);
    }

    if (backup.walletAddress !== dto.walletAddress) {
      throw new Error('Wallet address mismatch');
    }

    const backupData = await this.ipfsService.fetchJson(backup.ipfsCid);

    if (backup.checksum) {
      const jsonContent = JSON.stringify(backupData, null, 2);
      const currentChecksum = crypto
        .createHash('sha256')
        .update(jsonContent)
        .digest('hex');

      if (currentChecksum !== backup.checksum) {
        await this.createAlert({
          walletAddress: dto.walletAddress,
          alertType: AlertType.RESTORATION_TEST_FAILED,
          severity: AlertSeverity.CRITICAL,
          message: `Backup integrity check failed for ${backup.id}`,
          metadata: {
            backupId: backup.id,
            expectedChecksum: backup.checksum,
            actualChecksum: currentChecksum,
          },
        });
        throw new Error('Backup integrity check failed');
      }
    }

    const restored = {
      identities: 0,
      verifications: 0,
      sharedData: 0,
    };

    if (!dto.dryRun) {
      if (backupData.identities?.length) {
        for (const identity of backupData.identities) {
          await this.identityService.restore(identity);
          restored.identities++;
        }
      }

      if (backupData.verifications?.length) {
        for (const verification of backupData.verifications) {
          await this.verificationService.restore(verification);
          restored.verifications++;
        }
      }

      if (backupData.sharedData?.length) {
        for (const shared of backupData.sharedData) {
          await this.dataSharingService.restore(shared);
          restored.sharedData++;
        }
      }

      backup.status = BackupStatus.RESTORED;
      backup.restoreAttempts++;
      backup.lastRestoreTest = new Date();
      await this.backupRecordRepo.save(backup);
    }

    return {
      success: true,
      restored,
      dryRun: dto.dryRun || false,
    };
  }

  async checkBackupHealth(backup: BackupRecord): Promise<boolean> {
    try {
      const backupData = await this.ipfsService.fetchJson(backup.ipfsCid);

      const jsonContent = JSON.stringify(backupData, null, 2);
      const currentChecksum = crypto
        .createHash('sha256')
        .update(jsonContent)
        .digest('hex');

      if (backup.checksum && currentChecksum !== backup.checksum) {
        await this.createAlert({
          walletAddress: backup.walletAddress,
          alertType: AlertType.BACKUP_HEALTH_WARNING,
          severity: AlertSeverity.HIGH,
          message: `Backup integrity check failed for ${backup.id}`,
          metadata: {
            backupId: backup.id,
            expectedChecksum: backup.checksum,
            actualChecksum: currentChecksum,
          },
        });
        return false;
      }

      return true;
    } catch (error) {
      await this.createAlert({
        walletAddress: backup.walletAddress,
        alertType: AlertType.BACKUP_HEALTH_WARNING,
        severity: AlertSeverity.MEDIUM,
        message: `Backup health check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        metadata: { backupId: backup.id },
      });
      return false;
    }
  }

  async runHealthCheck(): Promise<{ checked: number; healthy: number }> {
    const backups = await this.backupRecordRepo.find({
      where: { status: BackupStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    let healthy = 0;
    for (const backup of backups) {
      const isHealthy = await this.checkBackupHealth(backup);
      if (isHealthy) healthy++;
    }

    return { checked: backups.length, healthy };
  }

  async runRotation(): Promise<{
    totalChecked: number;
    deleted: number;
    kept: number;
  }> {
    const configs = await this.backupConfigRepo.find({
      where: { rotationEnabled: true },
    });

    let totalChecked = 0;
    let deleted = 0;
    let kept = 0;

    for (const config of configs) {
      const backups = await this.backupRecordRepo.find({
        where: { walletAddress: config.walletAddress },
        order: { createdAt: 'DESC' },
      });

      totalChecked += backups.length;

      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - config.retentionDays);

      const backupsToDelete: BackupRecord[] = [];
      const backupsToKeep: BackupRecord[] = [];

      for (const backup of backups) {
        if (
          backup.createdAt < retentionDate &&
          backupsToKeep.length >= config.maxBackupsToKeep
        ) {
          backupsToDelete.push(backup);
        } else {
          backupsToKeep.push(backup);
        }
      }

      for (const backup of backupsToDelete) {
        await this.backupRecordRepo.remove(backup);
        deleted++;
      }

      kept += backupsToKeep.length;

      if (backupsToDelete.length > 0) {
        await this.createAlert({
          walletAddress: config.walletAddress,
          alertType: AlertType.BACKUP_ROTATION_EXECUTED,
          severity: AlertSeverity.LOW,
          message: `Rotation executed: deleted ${backupsToDelete.length} old backups`,
          metadata: {
            deletedCount: backupsToDelete.length,
            keptCount: backupsToKeep.length,
          },
        });
      }
    }

    this.logger.log(
      `Rotation completed: checked ${totalChecked}, deleted ${deleted}, kept ${kept}`,
    );

    return { totalChecked, deleted, kept };
  }

  async runRestorationTests(): Promise<{
    tested: number;
    passed: number;
    failed: number;
  }> {
    const configs = await this.backupConfigRepo.find({
      where: { restorationTestEnabled: true },
    });

    let tested = 0;
    let passed = 0;
    let failed = 0;

    for (const config of configs) {
      const latestBackup = await this.backupRecordRepo.findOne({
        where: {
          walletAddress: config.walletAddress,
          status: BackupStatus.COMPLETED,
        },
        order: { createdAt: 'DESC' },
      });

      if (latestBackup) {
        tested++;
        try {
          const result = await this.restoreBackup({
            backupId: latestBackup.id,
            walletAddress: config.walletAddress,
            dryRun: true,
          });

          if (result.success) {
            passed++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          await this.createAlert({
            walletAddress: config.walletAddress,
            alertType: AlertType.RESTORATION_TEST_FAILED,
            severity: AlertSeverity.HIGH,
            message: `Restoration test failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            metadata: { backupId: latestBackup.id },
          });
        }
      }
    }

    this.logger.log(
      `Restoration tests: tested ${tested}, passed ${passed}, failed ${failed}`,
    );

    return { tested, passed, failed };
  }

  async createAlert(data: {
    walletAddress: string;
    alertType: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<BackupAlert> {
    const alert = this.backupAlertRepo.create(data);
    const saved = await this.backupAlertRepo.save(alert);

    const config = await this.backupConfigRepo.findOne({
      where: { walletAddress: data.walletAddress },
    });

    if (config?.alertWebhookUrl) {
      await this.sendWebhook(config.alertWebhookUrl, saved);
    }

    return saved;
  }

  private async sendWebhook(url: string, alert: BackupAlert): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          walletAddress: alert.walletAddress,
          metadata: alert.metadata,
          timestamp: alert.createdAt,
        }),
      });
    } catch (error) {
      this.logger.error(
        `Webhook failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getBackups(walletAddress: string): Promise<BackupRecord[]> {
    return this.backupRecordRepo.find({
      where: { walletAddress },
      order: { createdAt: 'DESC' },
    });
  }

  async getAlerts(
    walletAddress: string,
    unacknowledgedOnly = false,
  ): Promise<BackupAlert[]> {
    const where: any = { walletAddress };
    if (unacknowledgedOnly) {
      where.acknowledged = false;
    }
    return this.backupAlertRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async acknowledgeAlert(alertId: string): Promise<BackupAlert> {
    const alert = await this.backupAlertRepo.findOne({
      where: { id: alertId },
    });
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    alert.acknowledged = true;
    return this.backupAlertRepo.save(alert);
  }

  async getConfig(walletAddress: string): Promise<BackupConfig> {
    let config = await this.backupConfigRepo.findOne({
      where: { walletAddress },
    });

    if (!config) {
      config = this.backupConfigRepo.create({
        walletAddress,
        autoBackupEnabled: true,
        backupIntervalHours: 24,
        retentionDays: 30,
        maxBackupsToKeep: 10,
        healthMonitoringEnabled: true,
        healthCheckIntervalHours: 6,
        alertsEnabled: true,
        rotationEnabled: true,
        rotationCheckIntervalDays: 7,
        restorationTestEnabled: true,
        restorationTestIntervalDays: 30,
      });
      await this.backupConfigRepo.save(config);
    }

    return config;
  }

  async updateConfig(
    walletAddress: string,
    updates: Partial<BackupConfig>,
  ): Promise<BackupConfig> {
    const config = await this.getConfig(walletAddress);
    Object.assign(config, updates);
    return this.backupConfigRepo.save(config);
  }
}
