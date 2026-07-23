import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RESTORED = 'restored',
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  SELECTIVE = 'selective',
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  walletAddress: string;

  @Column({ type: 'enum', enum: BackupType, default: BackupType.FULL })
  backupType: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column()
  ipfsCid: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'json', nullable: true })
  manifest: Record<string, any>;

  @Column({ nullable: true })
  checksum: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  restoreAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRestoreTest: Date;

  @Column({ type: 'boolean', default: true })
  isRotatable: boolean;

  @Column({ type: 'int', default: 0 })
  retentionDays: number;

  @CreateDateColumn()
  createdAt: Date;
}
