import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class RestoreBackupDto {
  @IsUUID()
  backupId: string;

  @IsString()
  walletAddress: string;

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = false;
}
