import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { BackupType } from '../entities/backup-record.entity';

export class CreateBackupDto {
  @IsString()
  walletAddress: string;

  @IsEnum(BackupType)
  @IsOptional()
  backupType?: BackupType = BackupType.FULL;

  @IsBoolean()
  @IsOptional()
  triggerHealthCheck?: boolean = false;
}
