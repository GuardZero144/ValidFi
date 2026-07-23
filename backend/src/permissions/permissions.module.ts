import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';
import { RoleAssignment } from './role-assignment.entity';
import { AdminGuard } from '../audit/guards/admin.guard';

/**
 * Credential access permission system: role-based grants, permission checks,
 * and audited role management. Exports {@link PermissionsService} and
 * {@link PermissionsGuard} so other feature modules can protect their credential
 * routes with `@RequirePermission(...)`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RoleAssignment]), ConfigModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard, AdminGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
