import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSharedDataDto {
  @IsString()
  @IsNotEmpty()
  ownerAddress: string;

  @IsString()
  @IsNotEmpty()
  recipientAddress: string;

  @IsString()
  @IsNotEmpty()
  documentHash: string;

  @IsString()
  @IsNotEmpty()
  encryptedKey: string;

  @IsNumber()
  @IsNotEmpty()
  durationSeconds: number;

  @IsOptional()
  metadata?: Record<string, any>;
}
