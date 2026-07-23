import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMetadata,
} from './require-permission.decorator';

/**
 * Enforces {@link RequirePermission} metadata on a route. Resolves the caller's
 * wallet (populated by `JwtAuthGuard`) and the optional target resource, then
 * consults {@link PermissionsService} to allow or deny the request.
 *
 * Must be applied after `JwtAuthGuard` so `request.user` is available.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<
      RequirePermissionMetadata | undefined
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const walletAddress: string | undefined = request.user?.walletAddress;
    if (!walletAddress) {
      throw new ForbiddenException('Authentication required');
    }

    const resourceId = metadata.resourceIdParam
      ? request.params?.[metadata.resourceIdParam]
      : undefined;

    const allowed = await this.permissionsService.hasPermission(
      walletAddress,
      metadata.permission,
      resourceId,
    );
    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission: ${metadata.permission}`,
      );
    }
    return true;
  }
}
