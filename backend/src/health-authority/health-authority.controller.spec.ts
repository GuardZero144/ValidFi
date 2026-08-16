import { Test, TestingModule } from '@nestjs/testing';
import { HealthAuthorityController } from './health-authority.controller';
import { HealthAuthorityService } from './health-authority.service';
import { AuthorityAuthType, AuthorityStatus } from './health-authority.entity';
import { IssuanceStatus } from './issuance-record.entity';

const mockService = () => ({
  connectAuthority: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findActive: jest.fn(),
  update: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn(),
  requestCredential: jest.fn(),
  checkIssuanceStatus: jest.fn(),
  findIssuancesByWallet: jest.fn(),
  findIssuancesByAuthority: jest.fn(),
  retryIssuance: jest.fn(),
  revokeIssuance: jest.fn(),
});

describe('HealthAuthorityController', () => {
  let controller: HealthAuthorityController;
  let service: jest.Mocked<ReturnType<typeof mockService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthAuthorityController],
      providers: [{ provide: HealthAuthorityService, useFactory: mockService }],
    }).compile();

    controller = module.get<HealthAuthorityController>(HealthAuthorityController);
    service = module.get(HealthAuthorityService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('connect', () => {
    it('should connect an authority', async () => {
      const dto = {
        name: 'Test',
        apiUrl: 'https://test.com',
        authType: AuthorityAuthType.API_KEY,
      };
      service.connectAuthority.mockResolvedValue({
        id: 'auth-1',
        ...dto,
        status: AuthorityStatus.ACTIVE,
      } as any);

      const result = await controller.connect(dto);
      expect(result.status).toBe(AuthorityStatus.ACTIVE);
    });
  });

  describe('findAll', () => {
    it('should return all authorities', async () => {
      service.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('requestCredential', () => {
    it('should request credential issuance', async () => {
      const dto = {
        authorityId: 'auth-1',
        credentialType: 'vaccination',
        patientWalletAddress: 'GABC123',
        healthData: { vaccine: 'COVID-19' },
      };
      service.requestCredential.mockResolvedValue({
        id: 'issuance-1',
        status: IssuanceStatus.PENDING,
      } as any);

      const result = await controller.requestCredential(dto);
      expect(result.status).toBe(IssuanceStatus.PENDING);
    });
  });

  describe('disconnect', () => {
    it('should disconnect an authority', async () => {
      service.disconnect.mockResolvedValue({ status: AuthorityStatus.INACTIVE } as any);
      const result = await controller.disconnect('auth-1');
      expect(result.status).toBe(AuthorityStatus.INACTIVE);
    });
  });

  describe('retryIssuance', () => {
    it('should retry a failed issuance', async () => {
      service.retryIssuance.mockResolvedValue({
        status: IssuanceStatus.PENDING,
      } as any);
      const result = await controller.retryIssuance('issuance-1');
      expect(result.status).toBe(IssuanceStatus.PENDING);
    });
  });

  describe('revokeIssuance', () => {
    it('should revoke an issuance', async () => {
      service.revokeIssuance.mockResolvedValue({
        status: IssuanceStatus.REVOKED,
      } as any);
      const result = await controller.revokeIssuance('issuance-1');
      expect(result.status).toBe(IssuanceStatus.REVOKED);
    });
  });
});
