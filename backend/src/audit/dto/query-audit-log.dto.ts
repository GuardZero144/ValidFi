import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditOperation, AuditStatus } from '../audit-log.entity';

/**
 * Filter and pagination parameters for the audit query interface.
 */
export class QueryAuditLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(AuditOperation)
  operationType?: AuditOperation;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsString()
  targetCredentialId?: string;

  /** Inclusive lower bound on `createdAt` (ISO-8601). */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Inclusive upper bound on `createdAt` (ISO-8601). */
  @IsOptional()
  @IsISO8601()
  to?: string;
}
