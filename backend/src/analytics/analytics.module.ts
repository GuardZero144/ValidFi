import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Identity } from '../identity/identity.entity';
import { Verification } from '../verification/verification.entity';
import { SharedData } from '../data-sharing/data-sharing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Identity, Verification, SharedData]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
