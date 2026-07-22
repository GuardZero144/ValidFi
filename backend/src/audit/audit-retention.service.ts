import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';

/**
 * Background worker that periodically enforces the audit retention policy.
 *
 * Uses a native interval driven by Nest lifecycle hooks so no additional
 * scheduling dependency is required. The interval is configurable via
 * `AUDIT_RETENTION_SWEEP_HOURS` (default 24h) and disabled entirely when
 * `AUDIT_RETENTION_ENABLED` is set to `false`.
 */
@Injectable()
export class AuditRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const enabled =
      this.configService.get<string>('AUDIT_RETENTION_ENABLED') !== 'false';
    if (!enabled) {
      this.logger.log('Audit retention worker disabled by configuration');
      return;
    }

    const sweepHours =
      this.configService.get<number>('AUDIT_RETENTION_SWEEP_HOURS') ?? 24;
    const intervalMs = sweepHours * 60 * 60 * 1000;

    this.timer = setInterval(() => {
      void this.sweep();
    }, intervalMs);
    // Do not keep the event loop alive solely for the retention sweep.
    this.timer.unref?.();

    this.logger.log(
      `Audit retention worker started (sweep every ${sweepHours}h)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Run a single retention sweep. Exposed for manual triggering and tests. */
  async sweep(): Promise<number> {
    try {
      return await this.auditService.enforceRetention();
    } catch (error) {
      this.logger.error(
        `Audit retention sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }
}
