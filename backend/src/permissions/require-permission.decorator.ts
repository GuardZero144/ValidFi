import { SetMetadata } from '@nestjs/common';
import { CredentialPermission } from './permission.model';

export const REQUIRE_PERMISSION_KEY = 'permission:required';

export interface RequirePermissionMetadata {
  permission: CredentialPermission;
  /**
   * Name of the route parameter holding the target resource id. When set, the
   * check is scoped to that resource; when `null`, only globally scoped grants
   * satisfy it. Defaults to `id`.
   */
  resourceIdParam?: string | null;
}

/**
 * Guards a controller handler behind a {@link CredentialPermission}. Combined
 * with {@link PermissionsGuard}, the caller's wallet must hold the permission
 * (via one of its roles) for the request to proceed.
 */
export const RequirePermission = (
  permission: CredentialPermission,
  options: Omit<RequirePermissionMetadata, 'permission'> = {},
) =>
  SetMetadata<string, RequirePermissionMetadata>(REQUIRE_PERMISSION_KEY, {
    permission,
    resourceIdParam:
      options.resourceIdParam === undefined ? 'id' : options.resourceIdParam,
  });
