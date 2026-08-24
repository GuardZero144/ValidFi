import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialMigrationService } from './credential-migration.service';
import { CredentialDeduplicationService } from './credential-deduplication.service';
import { SecureDeletionService } from './secure-deletion.service';
import { SecureDeletionController } from './secure-deletion.controller';
import { AccessPermission } from '../access-control/access-control.entity';
import { CredentialVersion } from '../credential-versioning/credential-version.entity';
import { CredentialExport } from '../credential-export/credential-export.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

import { CredentialSearchAnalytics } from './credential-search-analytics.entity';
import { CredentialSearchAnalyticsService } from './credential-search-analytics.service';
import { CredentialSearchService } from './credential-search.service';
import { CredentialSearchController } from './credential-search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Credential,
      AccessPermission,
      CredentialVersion,
      CredentialExport,
      CredentialSearchAnalytics,
    ]),
    AuditModule,
    AuthModule,
  ],
  controllers: [SecureDeletionController, CredentialSearchController],
  providers: [
    CredentialMigrationService,
    CredentialDeduplicationService,
    SecureDeletionService,
    CredentialSearchAnalyticsService,
    CredentialSearchService,
  ],
  exports: [
    CredentialMigrationService,
    CredentialDeduplicationService,
    SecureDeletionService,
    CredentialSearchService,
  ],
})
export class CredentialsModule {}
