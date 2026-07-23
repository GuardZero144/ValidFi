import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { CredentialPermission } from '../permission.model';

export class CheckPermissionDto {
  @IsEnum(CredentialPermission)
  permission: CredentialPermission;

  /**
   * Resource to check the permission against. Omit to check only globally
   * scoped grants.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  resourceId?: string;
}
