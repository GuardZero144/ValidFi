import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthAuthorityService } from './health-authority.service';
import { HealthAuthority, AuthorityStatus, AuthorityAuthType } from './health-authority.entity';
import { IssuanceRecord, IssuanceStatus, CredentialFormat } from './issuance-record.entity';
import { HealthAuthorityApiClient } from './health-authority-api.client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockAuthorityRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockIssuanceRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockApiClient = () => ({
  authenticate: jest.fn(),
  checkHealth: jest.fn(),
  requestCredentialIssuance: jest.fn(),
  getCredentialStatus: jest.fn(),
  clearClient: jest.fn(),
});

describe('HealthAuthorityService', () => {
  let service: HealthAuthorityService;
  let authorityRepo: jest.Mocked<Repository<HealthAuthority>>;
  let issuanceRepo: jest.Mocked<Repository<IssuanceRecord>>;
  let apiClient: jest.Mocked<HealthAuthorityApiClient>;

  const mockAuthority: HealthAuthority = {
    id: 'auth-1',
    name: 'Test Health Authority',
    apiUrl: 'https://api.healthauthority.test',
    authType: AuthorityAuthType.API_KEY,
    status: AuthorityStatus.ACTIVE,
    apiKey: 'test-api-key',
    clientId: null,
    clientSecret: null,
    tokenUrl: null,
    certificatePath: null,
    jurisdiction: 'US',
    accessToken: null,
    tokenExpiresAt: null,
    metadata: {},
    credentialsIssued: 0,
    lastConnectedAt: new Date(),
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIssuance: IssuanceRecord = {
    id: 'issuance-1',
    authorityId: 'auth-1',
    authority: mockAuthority,
    patientWalletAddress: 'GABC123',
    credentialType: 'vaccination',
    format: CredentialFormat.CUSTOM_JSON,
    status: IssuanceStatus.PENDING,
    healthData: { vaccine: 'COVID-19', dose: 1 },
    issuedCredential: null,
    credentialHash: null,
    externalRequestId: null,
    expirationDate: null,
    failureReason: null,
    retryCount: 0,
    issuerNotes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAuthorityService,
        { provide: getRepositoryToken(HealthAuthority), useFactory: mockAuthorityRepository },
        { provide: getRepositoryToken(IssuanceRecord), useFactory: mockIssuanceRepository },
        { provide: HealthAuthorityApiClient, useFactory: mockApiClient },
      ],
    }).compile();

    service = module.get<HealthAuthorityService>(HealthAuthorityService);
    authorityRepo = module.get(getRepositoryToken(HealthAuthority));
    issuanceRepo = module.get(getRepositoryToken(IssuanceRecord));
    apiClient = module.get(HealthAuthorityApiClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connectAuthority', () => {
    it('should connect a new authority', async () => {
      const dto = {
        name: 'Test Authority',
        apiUrl: 'https://api.test.com',
        authType: AuthorityAuthType.API_KEY,
        apiKey: 'test-key',
      };

      authorityRepo.findOne.mockResolvedValue(null);
      authorityRepo.create.mockReturnValue(mockAuthority);
      authorityRepo.save.mockResolvedValue(mockAuthority);
      apiClient.authenticate.mockResolvedValue('token');
      apiClient.checkHealth.mockResolvedValue(true);

      const result = await service.connectAuthority(dto);

      expect(result).toBeDefined();
      expect(authorityRepo.create).toHaveBeenCalledWith(dto);
      expect(authorityRepo.save).toHaveBeenCalled();
    });

    it('should throw if authority already exists', async () => {
      const dto = {
        name: 'Test Authority',
        apiUrl: 'https://api.test.com',
        authType: AuthorityAuthType.API_KEY,
      };

      authorityRepo.findOne.mockResolvedValue(mockAuthority);

      await expect(service.connectAuthority(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all authorities', async () => {
      authorityRepo.find.mockResolvedValue([mockAuthority]);
      const result = await service.findAll();
      expect(result).toEqual([mockAuthority]);
    });
  });

  describe('findOne', () => {
    it('should return a single authority', async () => {
      authorityRepo.findOne.mockResolvedValue(mockAuthority);
      const result = await service.findOne('auth-1');
      expect(result).toEqual(mockAuthority);
    });

    it('should throw NotFoundException if authority not found', async () => {
      authorityRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('should return only active authorities', async () => {
      authorityRepo.find.mockResolvedValue([mockAuthority]);
      const result = await service.findActive();
      expect(result).toEqual([mockAuthority]);
      expect(authorityRepo.find).toHaveBeenCalledWith({
        where: { status: AuthorityStatus.ACTIVE },
        order: { name: 'ASC' },
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect an authority', async () => {
      authorityRepo.findOne.mockResolvedValue(mockAuthority);
      authorityRepo.save.mockResolvedValue({ ...mockAuthority, status: AuthorityStatus.INACTIVE });

      const result = await service.disconnect('auth-1');

      expect(result.status).toBe(AuthorityStatus.INACTIVE);
      expect(apiClient.clearClient).toHaveBeenCalledWith('auth-1');
    });
  });

  describe('reconnect', () => {
    it('should reconnect an authority successfully', async () => {
      authorityRepo.findOne.mockResolvedValue(mockAuthority);
      apiClient.authenticate.mockResolvedValue('token');
      apiClient.checkHealth.mockResolvedValue(true);
      authorityRepo.save.mockResolvedValue({ ...mockAuthority, status: AuthorityStatus.ACTIVE });

      const result = await service.reconnect('auth-1');

      expect(result.status).toBe(AuthorityStatus.ACTIVE);
    });

    it('should set inactive on reconnect failure', async () => {
      authorityRepo.findOne.mockResolvedValue(mockAuthority);
      apiClient.authenticate.mockRejectedValue(new Error('Auth failed'));
      authorityRepo.save.mockResolvedValue({
        ...mockAuthority,
        status: AuthorityStatus.INACTIVE,
        lastError: 'Auth failed',
      });

      const result = await service.reconnect('auth-1');

      expect(result.status).toBe(AuthorityStatus.INACTIVE);
    });
  });

  describe('requestCredential', () => {
    it('should create a credential issuance request', async () => {
      const dto = {
        authorityId: 'auth-1',
        credentialType: 'vaccination',
        patientWalletAddress: 'GABC123',
        healthData: { vaccine: 'COVID-19' },
      };

      authorityRepo.findOne.mockResolvedValue(mockAuthority);
      issuanceRepo.create.mockReturnValue(mockIssuance);
      issuanceRepo.save.mockResolvedValue(mockIssuance);

      const result = await service.requestCredential(dto);

      expect(result).toBeDefined();
      expect(issuanceRepo.create).toHaveBeenCalled();
    });

    it('should throw if authority is not active', async () => {
      const dto = {
        authorityId: 'auth-1',
        credentialType: 'vaccination',
        patientWalletAddress: 'GABC123',
        healthData: { vaccine: 'COVID-19' },
      };

      authorityRepo.findOne.mockResolvedValue({
        ...mockAuthority,
        status: AuthorityStatus.INACTIVE,
      });

      await expect(service.requestCredential(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retryIssuance', () => {
    it('should retry a failed issuance', async () => {
      const failedIssuance = {
        ...mockIssuance,
        status: IssuanceStatus.FAILED,
        authority: mockAuthority,
      };

      issuanceRepo.findOne.mockResolvedValue(failedIssuance);
      issuanceRepo.save.mockResolvedValue({
        ...failedIssuance,
        status: IssuanceStatus.PENDING,
        retryCount: 0,
      });

      const result = await service.retryIssuance('issuance-1');

      expect(result.status).toBe(IssuanceStatus.PENDING);
    });

    it('should throw if issuance is not failed', async () => {
      issuanceRepo.findOne.mockResolvedValue(mockIssuance);

      await expect(service.retryIssuance('issuance-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeIssuance', () => {
    it('should revoke an issued credential', async () => {
      const issuedIssuance = {
        ...mockIssuance,
        status: IssuanceStatus.ISSUED,
      };

      issuanceRepo.findOne.mockResolvedValue(issuedIssuance);
      issuanceRepo.save.mockResolvedValue({
        ...issuedIssuance,
        status: IssuanceStatus.REVOKED,
      });

      const result = await service.revokeIssuance('issuance-1');

      expect(result.status).toBe(IssuanceStatus.REVOKED);
    });

    it('should throw if credential is not issued', async () => {
      issuanceRepo.findOne.mockResolvedValue(mockIssuance);

      await expect(service.revokeIssuance('issuance-1')).rejects.toThrow(BadRequestException);
    });
  });
});
