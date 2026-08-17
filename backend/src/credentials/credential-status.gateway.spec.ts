import { Test, TestingModule } from '@nestjs/testing';
import { CredentialStatusGateway } from './credential-status.gateway';
import { CredentialReconnectionManager } from './credential-reconnection.manager';
import { CredentialStatusEvent } from './dto/credential-status.dto';

describe('CredentialStatusGateway', () => {
  let gateway: CredentialStatusGateway;
  let reconnectionManager: CredentialReconnectionManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CredentialStatusGateway, CredentialReconnectionManager],
    }).compile();

    gateway = module.get<CredentialStatusGateway>(CredentialStatusGateway);
    reconnectionManager = module.get<CredentialReconnectionManager>(CredentialReconnectionManager);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  afterEach(() => {
    reconnectionManager.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should track connected clients on handleConnection', () => {
    const mockClient = {
      id: 'test-client-1',
      emit: jest.fn(),
      join: jest.fn(),
    } as any;

    gateway.handleConnection(mockClient);
    expect(gateway.getConnectedClientCount()).toBe(1);
    expect(mockClient.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
      clientId: 'test-client-1',
    }));
  });

  it('should remove client on handleDisconnect', () => {
    const mockClient = { id: 'test-client-2', emit: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(mockClient);
    expect(gateway.getConnectedClientCount()).toBe(1);

    gateway.handleDisconnect(mockClient);
    expect(gateway.getConnectedClientCount()).toBe(0);
  });

  it('should handle subscription to a specific credential', () => {
    const mockClient = { id: 'test-client-3', emit: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(mockClient);

    const result = gateway.handleSubscribe(mockClient, { credentialId: 'cred-123' });
    expect(mockClient.join).toHaveBeenCalledWith('credential:cred-123');
    expect(result.event).toBe('subscribed');
  });

  it('should handle subscription to holder', () => {
    const mockClient = { id: 'test-client-4', emit: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(mockClient);

    const result = gateway.handleSubscribe(mockClient, { holder: 'holder-abc' });
    expect(mockClient.join).toHaveBeenCalledWith('holder:holder-abc');
  });

  it('should broadcast status update to subscribed rooms', () => {
    const update = {
      credentialId: 'cred-123',
      event: CredentialStatusEvent.CREATED,
      currentStatus: 'active',
      timestamp: new Date().toISOString(),
    };

    gateway.broadcastStatusUpdate(update);
    expect(gateway.server.to).toHaveBeenCalledWith('credential:cred-123');
    expect(gateway.server.emit).toHaveBeenCalled();
  });
});
