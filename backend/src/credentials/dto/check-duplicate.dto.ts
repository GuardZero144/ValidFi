import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CheckDuplicateDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  issuer: string;

  @IsString()
  @IsOptional()
  holder?: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}

export class UploadCredentialDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  issuer: string;

  @IsString()
  @IsOptional()
  holder?: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @IsString()
  @IsOptional()
  systemSource?: string;
}
