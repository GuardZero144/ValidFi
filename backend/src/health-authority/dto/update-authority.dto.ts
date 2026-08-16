import { PartialType } from '@nestjs/mapped-types';
import { ConnectAuthorityDto } from './connect-authority.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum AuthorityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export class UpdateAuthorityDto extends PartialType(ConnectAuthorityDto) {
  @IsEnum(AuthorityStatus)
  @IsOptional()
  status?: AuthorityStatus;

  @IsString()
  @IsOptional()
  name?: string;
}
