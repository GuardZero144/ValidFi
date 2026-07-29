import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialMigrationService } from './credential-migration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Credential])],
  providers: [CredentialMigrationService],
  exports: [CredentialMigrationService],
})
export class CredentialsModule {}
