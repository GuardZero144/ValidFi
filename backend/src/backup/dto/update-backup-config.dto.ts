import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateBackupConfigDto {
  @IsBoolean()
  @IsOptional()
  autoBackupEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(168)
  backupIntervalHours?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  maxBackupsToKeep?: number;

  @IsBoolean()
  @IsOptional()
  healthMonitoringEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(168)
  healthCheckIntervalHours?: number;

  @IsBoolean()
  @IsOptional()
  alertsEnabled?: boolean;

  @IsString()
  @IsOptional()
  alertWebhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  rotationEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  rotationCheckIntervalDays?: number;

  @IsBoolean()
  @IsOptional()
  restorationTestEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  restorationTestIntervalDays?: number;
}
