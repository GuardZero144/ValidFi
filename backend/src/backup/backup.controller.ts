import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { UpdateBackupConfigDto } from './dto/update-backup-config.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  async createBackup(@Body() dto: CreateBackupDto) {
    return this.backupService.createBackup(dto);
  }

  @Get('wallet/:walletAddress')
  async getBackups(@Param('walletAddress') walletAddress: string) {
    return this.backupService.getBackups(walletAddress);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  async restoreBackup(@Body() dto: RestoreBackupDto) {
    return this.backupService.restoreBackup(dto);
  }

  @Get('health')
  async getHealthStatus() {
    return this.backupService.runHealthCheck();
  }

  @Post('rotation')
  @HttpCode(HttpStatus.OK)
  async triggerRotation() {
    return this.backupService.runRotation();
  }

  @Post('restoration-test')
  @HttpCode(HttpStatus.OK)
  async triggerRestorationTest() {
    return this.backupService.runRestorationTests();
  }

  @Get('alerts/:walletAddress')
  async getAlerts(
    @Param('walletAddress') walletAddress: string,
    @Query('unacknowledged') unacknowledged?: string,
  ) {
    return this.backupService.getAlerts(
      walletAddress,
      unacknowledged === 'true',
    );
  }

  @Put('alerts/:alertId/acknowledge')
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    return this.backupService.acknowledgeAlert(alertId);
  }

  @Get('config/:walletAddress')
  async getConfig(@Param('walletAddress') walletAddress: string) {
    return this.backupService.getConfig(walletAddress);
  }

  @Put('config/:walletAddress')
  async updateConfig(
    @Param('walletAddress') walletAddress: string,
    @Body() dto: UpdateBackupConfigDto,
  ) {
    return this.backupService.updateConfig(walletAddress, dto);
  }
}
