import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { BackupRecord } from './entities/backup-record.entity';
import { BackupAlert } from './entities/backup-alert.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { IpfsModule } from '../ipfs/ipfs.module';
import { IdentityModule } from '../identity/identity.module';
import { VerificationModule } from '../verification/verification.module';
import { DataSharingModule } from '../data-sharing/data-sharing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BackupRecord, BackupAlert, BackupConfig]),
    ScheduleModule.forRoot(),
    IpfsModule,
    IdentityModule,
    VerificationModule,
    DataSharingModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
