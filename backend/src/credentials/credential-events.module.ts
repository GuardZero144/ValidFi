import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialStatusGateway } from './credential-status.gateway';
import { CredentialStatusService } from './credential-status.service';
import { CredentialReconnectionManager } from './credential-reconnection.manager';
import { CredentialStatusController } from './credential-status.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Credential])],
  controllers: [CredentialStatusController],
  providers: [CredentialStatusGateway, CredentialStatusService, CredentialReconnectionManager],
  exports: [CredentialStatusService],
})
export class CredentialEventsModule {}
