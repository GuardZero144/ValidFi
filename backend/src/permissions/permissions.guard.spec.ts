import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { CredentialPermission } from './permission.model';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionsService: { hasPermission: jest.Mock };

  const contextFor = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsService = { hasPermission: jest.fn() };
    guard = new PermissionsGuard(
      reflector,
      permissionsService as unknown as PermissionsService,
    );
  });

  it('allows the route when no permission metadata is present', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      permission: CredentialPermission.READ,
      resourceIdParam: 'id',
    });
    await expect(guard.canActivate(contextFor({ params: {} }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows when the wallet holds the permission for the scoped resource', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      permission: CredentialPermission.VERIFY,
      resourceIdParam: 'id',
    });
    permissionsService.hasPermission.mockResolvedValue(true);

    const request = {
      user: { walletAddress: 'GVERIFIER' },
      params: { id: 'cred-1' },
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(permissionsService.hasPermission).toHaveBeenCalledWith(
      'GVERIFIER',
      CredentialPermission.VERIFY,
      'cred-1',
    );
  });

  it('denies when the wallet lacks the permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      permission: CredentialPermission.ISSUE,
      resourceIdParam: null,
    });
    permissionsService.hasPermission.mockResolvedValue(false);

    const request = { user: { walletAddress: 'GVIEWER' }, params: {} };
    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      'Missing required permission',
    );
  });
});
