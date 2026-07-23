import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsISO8601,
} from 'class-validator';
import { CredentialRole } from '../permission.model';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  granteeAddress: string;

  @IsEnum(CredentialRole)
  role: CredentialRole;

  /**
   * Credential resource the role is scoped to. Omit for a global (`*`)
   * assignment that applies to every resource.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  resourceId?: string;

  /** Optional ISO-8601 expiry timestamp. Omit for a non-expiring grant. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
