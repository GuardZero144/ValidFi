import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialStatusService } from './credential-status.service';
import { CredentialStatusGateway } from './credential-status.gateway';
import { CredentialReconnectionManager } from './credential-reconnection.manager';
import { CredentialStatusEvent } from './dto/credential-status.dto';

describe('CredentialStatusService', () => {
  let service: CredentialStatusService;
  let mockRepository: any;
  let gateway: CredentialStatusGateway;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialStatusService,
        CredentialStatusGateway,
        CredentialReconnectionManager,
        { provide: getRepositoryToken(Credential), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CredentialStatusService>(CredentialStatusService);
    gateway = module.get<CredentialStatusGateway>(CredentialStatusGateway);
    gateway.server = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should notify status change and broadcast', async () => {
    const update = await service.notifyStatusChange(
      'cred-123',
      CredentialStatusEvent.CREATED,
      'none',
      'active',
    );

    expect(update.credentialId).toBe('cred-123');
    expect(update.event).toBe(CredentialStatusEvent.CREATED);
    expect(update.currentStatus).toBe('active');
    expect(gateway.server.emit).toHaveBeenCalled();
  });

  it('should throw on updateCredentialStatus when credential not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(
      service.updateCredentialStatus('missing', 'revoked', CredentialStatusEvent.REVOKED),
    ).rejects.toThrow('Credential not found');
  });

  it('should update credential status and broadcast', async () => {
    const credential = { id: 'cred-1', status: 'active' } as Credential;
    mockRepository.findOne.mockResolvedValue(credential);
    mockRepository.save.mockResolvedValue({ ...credential, status: 'revoked' });

    const result = await service.updateCredentialStatus(
      'cred-1',
      'revoked',
      CredentialStatusEvent.REVOKED,
    );

    expect(result.statusUpdate.previousStatus).toBe('active');
    expect(result.statusUpdate.currentStatus).toBe('revoked');
  });

  it('should return connected client count', () => {
    expect(service.getConnectedClientCount()).toBe(0);
  });
});
