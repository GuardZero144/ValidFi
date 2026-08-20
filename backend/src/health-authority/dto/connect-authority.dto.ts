import { IsString, IsNotEmpty, IsUrl, IsOptional, IsEnum } from 'class-validator';

export enum AuthorityAuthType {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  MUTUAL_TLS = 'mutual_tls',
  JWT_BEARER = 'jwt_bearer',
}

export class ConnectAuthorityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @IsNotEmpty()
  apiUrl: string;

  @IsEnum(AuthorityAuthType)
  authType: AuthorityAuthType;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  tokenUrl?: string;

  @IsString()
  @IsOptional()
  certificatePath?: string;

  @IsString()
  @IsOptional()
  jurisdiction?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
