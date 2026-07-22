import { SetMetadata } from '@nestjs/common';
import { AuditOperation } from './audit-log.entity';

export const AUDIT_METADATA_KEY = 'audit:operation';

export interface AuditMetadata {
  operationType: AuditOperation;
  /**
   * Name of the route parameter holding the target credential id
   * (defaults to `id`). Set to `null` to omit target extraction.
   */
  credentialIdParam?: string | null;
}

/**
 * Marks a controller handler as an audited credential operation. Combined with
 * {@link AuditInterceptor}, every invocation automatically emits an audit
 * record — success or failure — with no per-handler boilerplate.
 */
export const Audit = (
  operationType: AuditOperation,
  options: Omit<AuditMetadata, 'operationType'> = {},
) =>
  SetMetadata<string, AuditMetadata>(AUDIT_METADATA_KEY, {
    operationType,
    credentialIdParam:
      options.credentialIdParam === undefined
        ? 'id'
        : options.credentialIdParam,
  });
