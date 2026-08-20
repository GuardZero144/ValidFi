import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthAuthority } from './health-authority.entity';
import { IssuanceRecord } from './issuance-record.entity';
import { HealthAuthorityService } from './health-authority.service';
import { HealthAuthorityController } from './health-authority.controller';
import { HealthAuthorityApiClient } from './health-authority-api.client';

@Module({
  imports: [TypeOrmModule.forFeature([HealthAuthority, IssuanceRecord])],
  controllers: [HealthAuthorityController],
  providers: [HealthAuthorityService, HealthAuthorityApiClient],
  exports: [HealthAuthorityService, HealthAuthorityApiClient],
})
export class HealthAuthorityModule {}
