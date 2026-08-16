import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { HealthAuthority, AuthorityAuthType } from './health-authority.entity';
import { CredentialFormat, IssuanceStatus } from './issuance-record.entity';

export interface CredentialIssuanceRequest {
  credentialType: string;
  patientId: string;
  healthData: Record<string, any>;
  expirationDate?: string;
  format: CredentialFormat;
}

export interface AuthorityCredentialResponse {
  requestId: string;
  status: IssuanceStatus;
  credential?: Record<string, any>;
  format: CredentialFormat;
  issuedAt: string;
  expiresAt?: string;
  signature?: string;
  rawResponse: Record<string, any>;
}

@Injectable()
export class HealthAuthorityApiClient {
  private readonly logger = new Logger(HealthAuthorityApiClient.name);
  private readonly clients: Map<string, AxiosInstance> = new Map();

  private getClient(authority: HealthAuthority): AxiosInstance {
    const cached = this.clients.get(authority.id);
    if (cached) return cached;

    const config: AxiosRequestConfig = {
      baseURL: authority.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ValidFi-HealthCredential/1.0',
      },
    };

    const client = axios.create(config);

    client.interceptors.request.use((req) => {
      this.logger.debug(`API Request: ${req.method?.toUpperCase()} ${req.baseURL}${req.url}`);
      return req;
    });

    client.interceptors.response.use(
      (res) => {
        this.logger.debug(`API Response: ${res.status} from ${res.config.url}`);
        return res;
      },
      (error) => {
        this.logger.error(`API Error: ${error.message}`, error.stack);
        throw error;
      },
    );

    this.clients.set(authority.id, client);
    return client;
  }

  async authenticate(authority: HealthAuthority): Promise<string | null> {
    const client = this.getClient(authority);

    switch (authority.authType) {
      case AuthorityAuthType.API_KEY:
        client.defaults.headers['Authorization'] = `Bearer ${authority.apiKey}`;
        return authority.apiKey;

      case AuthorityAuthType.OAUTH2:
        return await this.authenticateOAuth2(authority, client);

      case AuthorityAuthType.JWT_BEARER:
        return await this.authenticateJwtBearer(authority, client);

      case AuthorityAuthType.MUTUAL_TLS:
        this.logger.log(`mTLS authentication configured for authority ${authority.id}`);
        return 'mtls-configured';

      default:
        throw new Error(`Unsupported auth type: ${authority.authType}`);
    }
  }

  private async authenticateOAuth2(
    authority: HealthAuthority,
    client: AxiosInstance,
  ): Promise<string> {
    try {
      const response = await client.post(authority.tokenUrl || '/oauth/token', {
        grant_type: 'client_credentials',
        client_id: authority.clientId,
        client_secret: authority.clientSecret,
        scope: 'credential:issue credential:verify',
      });

      const { access_token, expires_in } = response.data;
      client.defaults.headers['Authorization'] = `Bearer ${access_token}`;

      this.logger.log(`OAuth2 token obtained for authority ${authority.id}, expires in ${expires_in}s`);
      return access_token;
    } catch (error) {
      this.logger.error(`OAuth2 authentication failed for authority ${authority.id}: ${error.message}`);
      throw new Error(`OAuth2 authentication failed: ${error.message}`);
    }
  }

  private async authenticateJwtBearer(
    authority: HealthAuthority,
    client: AxiosInstance,
  ): Promise<string> {
    try {
      const response = await client.post(authority.tokenUrl || '/auth/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: authority.apiKey,
      });

      const { access_token } = response.data;
      client.defaults.headers['Authorization'] = `Bearer ${access_token}`;
      return access_token;
    } catch (error) {
      this.logger.error(`JWT Bearer auth failed for authority ${authority.id}: ${error.message}`);
      throw new Error(`JWT Bearer authentication failed: ${error.message}`);
    }
  }

  async checkHealth(authority: HealthAuthority): Promise<boolean> {
    try {
      const client = this.getClient(authority);
      const response = await client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async requestCredentialIssuance(
    authority: HealthAuthority,
    request: CredentialIssuanceRequest,
  ): Promise<AuthorityCredentialResponse> {
    const client = this.getClient(authority);

    try {
      const response = await client.post('/credentials/issue', {
        type: request.credentialType,
        subject: {
          patientId: request.patientId,
        },
        claims: request.healthData,
        format: request.format,
        expirationDate: request.expirationDate,
      });

      return this.parseCredentialResponse(response.data, request.format);
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `Credential issuance failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new Error(
          `Authority API error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`,
        );
      }
      throw error;
    }
  }

  async getCredentialStatus(
    authority: HealthAuthority,
    requestId: string,
  ): Promise<AuthorityCredentialResponse> {
    const client = this.getClient(authority);

    try {
      const response = await client.get(`/credentials/status/${requestId}`);
      return this.parseCredentialResponse(response.data, CredentialFormat.CUSTOM_JSON);
    } catch (error) {
      this.logger.error(`Status check failed for request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  private parseCredentialResponse(
    data: Record<string, any>,
    format: CredentialFormat,
  ): AuthorityCredentialResponse {
    const statusMap: Record<string, IssuanceStatus> = {
      issued: IssuanceStatus.ISSUED,
      pending: IssuanceStatus.PENDING,
      processing: IssuanceStatus.PROCESSING,
      failed: IssuanceStatus.FAILED,
      revoked: IssuanceStatus.REVOKED,
    };

    return {
      requestId: data.requestId || data.request_id || data.id,
      status: statusMap[data.status?.toLowerCase()] || IssuanceStatus.PROCESSING,
      credential: data.credential || data.verifiableCredential,
      format,
      issuedAt: data.issuedAt || data.issued_at || new Date().toISOString(),
      expiresAt: data.expiresAt || data.expires_at,
      signature: data.signature,
      rawResponse: data,
    };
  }

  clearClient(authorityId: string): void {
    this.clients.delete(authorityId);
  }
}
