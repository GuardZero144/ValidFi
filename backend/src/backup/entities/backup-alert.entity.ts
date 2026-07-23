import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  BACKUP_FAILED = 'backup_failed',
  BACKUP_HEALTH_WARNING = 'backup_health_warning',
  BACKUP_ROTATION_EXECUTED = 'backup_rotation_executed',
  RESTORATION_TEST_FAILED = 'restoration_test_failed',
  STORAGE_QUOTA_WARNING = 'storage_quota_warning',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('backup_alerts')
export class BackupAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  walletAddress: string;

  @Column({ type: 'enum', enum: AlertType })
  alertType: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.LOW })
  severity: AlertSeverity;

  @Column('text')
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  acknowledged: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
