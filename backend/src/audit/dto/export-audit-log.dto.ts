import { IsOptional, IsIn } from 'class-validator';
import { QueryAuditLogDto } from './query-audit-log.dto';

/**
 * Query filter plus output format for audit trail exports.
 */
export class ExportAuditLogDto extends QueryAuditLogDto {
  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv' = 'json';
}
