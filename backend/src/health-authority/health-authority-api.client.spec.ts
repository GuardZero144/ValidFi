import { Test, TestingModule } from '@nestjs/testing';
import { HealthAuthorityApiClient } from './health-authority-api.client';
import { HealthAuthority, AuthorityAuthType, AuthorityStatus } from './health-authority.entity';
import { CredentialFormat, IssuanceStatus } from './issuance-record.entity';

describe('HealthAuthorityApiClient', () => {
  let client: HealthAuthorityApiClient;

  const mockAuthority: HealthAuthority = {
    id: 'auth-1',
    name: 'Test Authority',
    apiUrl: 'https://api.test.com',
    authType: AuthorityAuthType.API_KEY,
    status: AuthorityStatus.ACTIVE,
    apiKey: 'test-key',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tokenUrl: '/oauth/token',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthAuthorityApiClient],
    }).compile();

    client = module.get<HealthAuthorityApiClient>(HealthAuthorityApiClient);
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  describe('clearClient', () => {
    it('should clear cached client for an authority', () => {
      expect(() => client.clearClient('auth-1')).not.toThrow();
    });
  });

  describe('parseCredentialResponse', () => {
    it('should parse issued status correctly', () => {
      const method = (client as any).parseCredentialResponse.bind(client);
      const result = method(
        {
          requestId: 'req-1',
          status: 'issued',
          credential: { type: 'VaccinationCredential' },
          issuedAt: '2024-01-01T00:00:00Z',
        },
        CredentialFormat.CUSTOM_JSON,
      );

      expect(result.requestId).toBe('req-1');
      expect(result.status).toBe(IssuanceStatus.ISSUED);
      expect(result.credential).toEqual({ type: 'VaccinationCredential' });
    });

    it('should parse pending status correctly', () => {
      const method = (client as any).parseCredentialResponse.bind(client);
      const result = method(
        { requestId: 'req-2', status: 'pending' },
        CredentialFormat.FHIR,
      );

      expect(result.status).toBe(IssuanceStatus.PENDING);
      expect(result.format).toBe(CredentialFormat.FHIR);
    });

    it('should default to processing for unknown status', () => {
      const method = (client as any).parseCredentialResponse.bind(client);
      const result = method(
        { requestId: 'req-3', status: 'unknown' },
        CredentialFormat.W3C_VC,
      );

      expect(result.status).toBe(IssuanceStatus.PROCESSING);
    });
  });
});
