import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditRetentionService } from './audit-retention.service';
import { AdminGuard } from './guards/admin.guard';

/**
 * Credential audit logging.
 *
 * Declared `@Global` so the {@link AuditInterceptor} and {@link AuditService}
 * can be attached to credential operations in any feature module without
 * re-importing this module everywhere.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditRetentionService,
    AdminGuard,
  ],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
