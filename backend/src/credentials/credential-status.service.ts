import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { CredentialStatusGateway } from './credential-status.gateway';
import { CredentialStatusEvent, CredentialStatusUpdate } from './dto/credential-status.dto';

@Injectable()
export class CredentialStatusService {
  private readonly logger = new Logger(CredentialStatusService.name);

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
    private readonly gateway: CredentialStatusGateway,
  ) {}

  async notifyStatusChange(
    credentialId: string,
    event: CredentialStatusEvent,
    previousStatus: string,
    currentStatus: string,
    metadata?: Record<string, any>,
  ): Promise<CredentialStatusUpdate> {
    const update: CredentialStatusUpdate = {
      credentialId,
      event,
      previousStatus,
      currentStatus,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.gateway.broadcastStatusUpdate(update);
    this.logger.log(`Status change notified: ${event} for credential ${credentialId}`);
    return update;
  }

  async updateCredentialStatus(
    credentialId: string,
    newStatus: string,
    event: CredentialStatusEvent,
    metadata?: Record<string, any>,
  ): Promise<{ credential: Credential; statusUpdate: CredentialStatusUpdate }> {
    const credential = await this.credentialRepository.findOne({ where: { id: credentialId } });
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    const previousStatus = credential.status;
    credential.status = newStatus;
    await this.credentialRepository.save(credential);

    const statusUpdate = await this.notifyStatusChange(
      credentialId,
      event,
      previousStatus,
      newStatus,
      metadata,
    );

    return { credential, statusUpdate };
  }

  async notifyCredentialCreated(credential: Credential): Promise<CredentialStatusUpdate> {
    return this.notifyStatusChange(
      credential.id,
      CredentialStatusEvent.CREATED,
      'none',
      credential.status,
      { type: credential.type, issuer: credential.issuer },
    );
  }

  async notifyCredentialRevoked(credentialId: string, reason?: string): Promise<CredentialStatusUpdate> {
    return this.updateCredentialStatus(
      credentialId,
      'revoked',
      CredentialStatusEvent.REVOKED,
      { reason },
    ).then((result) => result.statusUpdate);
  }

  async notifyDuplicateDetected(credentialId: string, duplicateOfId: string): Promise<CredentialStatusUpdate> {
    return this.notifyStatusChange(
      credentialId,
      CredentialStatusEvent.DUPLICATE_DETECTED,
      'active',
      'duplicate',
      { duplicateOfId },
    );
  }

  getConnectedClientCount(): number {
    return this.gateway.getConnectedClientCount();
  }
}

