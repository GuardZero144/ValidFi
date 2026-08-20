import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthAuthority, AuthorityStatus } from './health-authority.entity';
import { IssuanceRecord, IssuanceStatus } from './issuance-record.entity';
import { HealthAuthorityApiClient, CredentialIssuanceRequest } from './health-authority-api.client';
import { ConnectAuthorityDto } from './dto/connect-authority.dto';
import { RequestCredentialDto } from './dto/request-credential.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';
import { createHash } from 'crypto';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class HealthAuthorityService {
  private readonly logger = new Logger(HealthAuthorityService.name);

  constructor(
    @InjectRepository(HealthAuthority)
    private readonly authorityRepository: Repository<HealthAuthority>,
    @InjectRepository(IssuanceRecord)
    private readonly issuanceRepository: Repository<IssuanceRecord>,
    private readonly apiClient: HealthAuthorityApiClient,
  ) {}

  async connectAuthority(dto: ConnectAuthorityDto): Promise<HealthAuthority> {
    const existing = await this.authorityRepository.findOne({
      where: { name: dto.name, apiUrl: dto.apiUrl },
    });

    if (existing) {
      throw new BadRequestException('Authority with this name and URL already exists');
    }

    const authority = this.authorityRepository.create(dto);
    authority.status = AuthorityStatus.PENDING_VERIFICATION;

    const saved = await this.authorityRepository.save(authority);

    try {
      await this.verifyConnection(saved);
      saved.status = AuthorityStatus.ACTIVE;
      saved.lastConnectedAt = new Date();
    } catch (error) {
      saved.status = AuthorityStatus.INACTIVE;
      saved.lastError = error.message;
      this.logger.warn(`Initial connection verification failed for authority ${saved.id}: ${error.message}`);
    }

    return await this.authorityRepository.save(saved);
  }

  async verifyConnection(authority: HealthAuthority): Promise<boolean> {
    try {
      await this.apiClient.authenticate(authority);
      const isHealthy = await this.apiClient.checkHealth(authority);

      if (!isHealthy) {
        throw new Error('Health check endpoint returned unhealthy status');
      }

      return true;
    } catch (error) {
      this.logger.error(`Connection verification failed for authority ${authority.id}: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<HealthAuthority[]> {
    return await this.authorityRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<HealthAuthority> {
    const authority = await this.authorityRepository.findOne({ where: { id } });
    if (!authority) {
      throw new NotFoundException(`Health authority ${id} not found`);
    }
    return authority;
  }

  async findActive(): Promise<HealthAuthority[]> {
    return await this.authorityRepository.find({
      where: { status: AuthorityStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateAuthorityDto): Promise<HealthAuthority> {
    const authority = await this.findOne(id);
    Object.assign(authority, dto);
    return await this.authorityRepository.save(authority);
  }

  async disconnect(id: string): Promise<HealthAuthority> {
    const authority = await this.findOne(id);
    authority.status = AuthorityStatus.INACTIVE;
    authority.accessToken = null;
    authority.tokenExpiresAt = null;
    this.apiClient.clearClient(id);
    return await this.authorityRepository.save(authority);
  }

  async reconnect(id: string): Promise<HealthAuthority> {
    const authority = await this.findOne(id);

    try {
      await this.verifyConnection(authority);
      authority.status = AuthorityStatus.ACTIVE;
      authority.lastConnectedAt = new Date();
      authority.lastError = null;
    } catch (error) {
      authority.status = AuthorityStatus.INACTIVE;
      authority.lastError = error.message;
    }

    return await this.authorityRepository.save(authority);
  }

  async requestCredential(dto: RequestCredentialDto): Promise<IssuanceRecord> {
    const authority = await this.findOne(dto.authorityId);

    if (authority.status !== AuthorityStatus.ACTIVE) {
      throw new BadRequestException(
        `Authority ${authority.name} is not active (status: ${authority.status})`,
      );
    }

    const issuance = this.issuanceRepository.create({
      authorityId: dto.authorityId,
      patientWalletAddress: dto.patientWalletAddress,
      credentialType: dto.credentialType,
      healthData: dto.healthData,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      issuerNotes: dto.issuerNotes,
      metadata: dto.metadata,
      status: IssuanceStatus.PENDING,
    });

    const saved = await this.issuanceRepository.save(issuance);

    this.processIssuance(saved, authority).catch((error) => {
      this.logger.error(`Background issuance failed for ${saved.id}: ${error.message}`);
    });

    return saved;
  }

  private async processIssuance(
    issuance: IssuanceRecord,
    authority: HealthAuthority,
  ): Promise<void> {
    const request: CredentialIssuanceRequest = {
      credentialType: issuance.credentialType,
      patientId: issuance.patientWalletAddress,
      healthData: issuance.healthData,
      expirationDate: issuance.expirationDate?.toISOString(),
      format: issuance.format,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        issuance.status = IssuanceStatus.PROCESSING;
        issuance.retryCount = attempt;
        await this.issuanceRepository.save(issuance);

        await this.apiClient.authenticate(authority);

        const response = await this.apiClient.requestCredentialIssuance(authority, request);

        issuance.status = response.status;
        issuance.issuedCredential = response.credential;
        issuance.externalRequestId = response.requestId;
        issuance.credentialHash = response.credential
          ? this.computeCredentialHash(response.credential)
          : null;

        if (response.status === IssuanceStatus.ISSUED) {
          authority.credentialsIssued += 1;
          await this.authorityRepository.save(authority);
        }

        await this.issuanceRepository.save(issuance);
        this.logger.log(`Credential issuance ${issuance.id} completed with status: ${response.status}`);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Issuance attempt ${attempt + 1}/${MAX_RETRIES} failed for ${issuance.id}: ${error.message}`,
        );

        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    issuance.status = IssuanceStatus.FAILED;
    issuance.failureReason = lastError?.message || 'Unknown error after max retries';
    await this.issuanceRepository.save(issuance);
    this.logger.error(`Credential issuance ${issuance.id} failed after ${MAX_RETRIES} attempts`);
  }

  async checkIssuanceStatus(issuanceId: string): Promise<IssuanceRecord> {
    const issuance = await this.issuanceRepository.findOne({
      where: { id: issuanceId },
      relations: ['authority'],
    });

    if (!issuance) {
      throw new NotFoundException(`Issuance record ${issuanceId} not found`);
    }

    if (issuance.status === IssuanceStatus.PROCESSING && issuance.externalRequestId) {
      try {
        const response = await this.apiClient.getCredentialStatus(
          issuance.authority,
          issuance.externalRequestId,
        );

        if (response.status !== issuance.status) {
          issuance.status = response.status;
          issuance.issuedCredential = response.credential || issuance.issuedCredential;
          await this.issuanceRepository.save(issuance);
        }
      } catch (error) {
        this.logger.warn(`Status sync failed for issuance ${issuanceId}: ${error.message}`);
      }
    }

    return issuance;
  }

  async findAllIssuances(): Promise<IssuanceRecord[]> {
    return await this.issuanceRepository.find({
      relations: ['authority'],
      order: { createdAt: 'DESC' },
    });
  }

  async findIssuancesByWallet(walletAddress: string): Promise<IssuanceRecord[]> {
    return await this.issuanceRepository.find({
      where: { patientWalletAddress: walletAddress },
      relations: ['authority'],
      order: { createdAt: 'DESC' },
    });
  }

  async findIssuancesByAuthority(authorityId: string): Promise<IssuanceRecord[]> {
    return await this.issuanceRepository.find({
      where: { authorityId },
      relations: ['authority'],
      order: { createdAt: 'DESC' },
    });
  }

  async retryIssuance(issuanceId: string): Promise<IssuanceRecord> {
    const issuance = await this.issuanceRepository.findOne({
      where: { id: issuanceId },
      relations: ['authority'],
    });

    if (!issuance) {
      throw new NotFoundException(`Issuance record ${issuanceId} not found`);
    }

    if (issuance.status !== IssuanceStatus.FAILED) {
      throw new BadRequestException('Only failed issuances can be retried');
    }

    issuance.status = IssuanceStatus.PENDING;
    issuance.failureReason = null;
    issuance.retryCount = 0;
    const saved = await this.issuanceRepository.save(issuance);

    this.processIssuance(saved, issuance.authority).catch((error) => {
      this.logger.error(`Retry issuance failed for ${saved.id}: ${error.message}`);
    });

    return saved;
  }

  async revokeIssuance(issuanceId: string): Promise<IssuanceRecord> {
    const issuance = await this.issuanceRepository.findOne({
      where: { id: issuanceId },
    });

    if (!issuance) {
      throw new NotFoundException(`Issuance record ${issuanceId} not found`);
    }

    if (issuance.status !== IssuanceStatus.ISSUED) {
      throw new BadRequestException('Only issued credentials can be revoked');
    }

    issuance.status = IssuanceStatus.REVOKED;
    return await this.issuanceRepository.save(issuance);
  }

  private computeCredentialHash(credential: Record<string, any>): string {
    const serialized = JSON.stringify(credential, Object.keys(credential).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
