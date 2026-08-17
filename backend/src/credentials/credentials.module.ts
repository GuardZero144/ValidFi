import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialMigrationService } from './credential-migration.service';
import { CredentialDeduplicationService } from './credential-deduplication.service';

@Module({
  imports: [TypeOrmModule.forFeature([Credential])],
  providers: [CredentialMigrationService, CredentialDeduplicationService],
  exports: [CredentialMigrationService, CredentialDeduplicationService],
})
export class CredentialsModule {}
