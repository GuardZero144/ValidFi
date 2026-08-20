import { IsString, IsNotEmpty, IsOptional, IsDateString, IsObject } from 'class-validator';

export class RequestCredentialDto {
  @IsString()
  @IsNotEmpty()
  authorityId: string;

  @IsString()
  @IsNotEmpty()
  credentialType: string;

  @IsString()
  @IsNotEmpty()
  patientWalletAddress: string;

  @IsObject()
  @IsNotEmpty()
  healthData: Record<string, any>;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsString()
  @IsOptional()
  issuerNotes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
