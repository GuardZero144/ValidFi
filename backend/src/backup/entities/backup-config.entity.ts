import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('backup_configs')
export class BackupConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  walletAddress: string;

  @Column({ default: true })
  autoBackupEnabled: boolean;

  @Column({ type: 'int', default: 24 })
  backupIntervalHours: number;

  @Column({ type: 'int', default: 30 })
  retentionDays: number;

  @Column({ type: 'int', default: 10 })
  maxBackupsToKeep: number;

  @Column({ default: true })
  healthMonitoringEnabled: boolean;

  @Column({ type: 'int', default: 6 })
  healthCheckIntervalHours: number;

  @Column({ default: true })
  alertsEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  alertWebhookUrl: string;

  @Column({ default: true })
  rotationEnabled: boolean;

  @Column({ type: 'int', default: 7 })
  rotationCheckIntervalDays: number;

  @Column({ default: true })
  restorationTestEnabled: boolean;

  @Column({ type: 'int', default: 30 })
  restorationTestIntervalDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
