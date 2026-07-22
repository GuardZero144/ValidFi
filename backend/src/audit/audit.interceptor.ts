import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuditService } from './audit.service';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from './audit.decorator';
import { AuditStatus } from './audit-log.entity';

/**
 * Automatically records an audit entry for any handler annotated with
 * {@link Audit}. The record captures the acting wallet, client IP, target
 * credential id and operation outcome, then forwards the original result or
 * error untouched.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const actorId = request.user?.walletAddress ?? 'anonymous';
    const clientIp = request.ip ?? request.socket?.remoteAddress ?? null;
    const paramName = meta.credentialIdParam;
    const targetFromParam =
      paramName && request.params ? request.params[paramName] : null;

    return next.handle().pipe(
      tap((response) => {
        void this.emit({
          actorId,
          clientIp,
          operationType: meta.operationType,
          status: AuditStatus.SUCCESS,
          targetCredentialId:
            targetFromParam ?? this.extractId(response) ?? null,
          metadata: { method: request.method, path: request.url },
        });
      }),
      catchError((error) => {
        void this.emit({
          actorId,
          clientIp,
          operationType: meta.operationType,
          status: AuditStatus.FAILURE,
          targetCredentialId: targetFromParam ?? null,
          metadata: {
            method: request.method,
            path: request.url,
            error: error?.message ?? 'unknown error',
          },
        });
        return throwError(() => error);
      }),
    );
  }

  private extractId(response: unknown): string | null {
    if (response && typeof response === 'object' && 'id' in response) {
      const id = (response as { id: unknown }).id;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  private async emit(input: Parameters<AuditService['record']>[0]) {
    try {
      await this.auditService.record(input);
    } catch (error) {
      // Auditing must never break the underlying operation; log and move on.
      this.logger.error(
        `Failed to record audit entry: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
