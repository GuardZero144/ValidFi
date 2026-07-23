import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CheckPermissionDto } from './dto/check-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../audit/guards/admin.guard';
import { ROLE_PERMISSIONS } from './permission.model';

/**
 * REST surface for the credential access permission system.
 *
 * Role management (assign/revoke/list) is restricted to administrator wallets
 * (`AdminGuard`), which form the root of trust that bootstraps roles. Callers
 * can always inspect and check their own effective permissions.
 */
@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** The static role → permission catalog. */
  @Get('catalog')
  catalog() {
    return ROLE_PERMISSIONS;
  }

  /** The calling wallet's effective roles and permissions for a resource. */
  @Get('me')
  async me(@Request() req, @Query('resourceId') resourceId?: string) {
    const walletAddress = req.user.walletAddress;
    const [roles, permissions] = await Promise.all([
      this.permissionsService.getEffectiveRoles(walletAddress, resourceId),
      this.permissionsService.getEffectivePermissions(
        walletAddress,
        resourceId,
      ),
    ]);
    return { walletAddress, resourceId: resourceId ?? null, roles, permissions };
  }

  /** Check whether the calling wallet holds a specific permission. */
  @Post('check')
  async check(@Body() dto: CheckPermissionDto, @Request() req) {
    const allowed = await this.permissionsService.hasPermission(
      req.user.walletAddress,
      dto.permission,
      dto.resourceId,
    );
    return { allowed };
  }

  @Post('roles')
  @UseGuards(AdminGuard)
  assignRole(@Body() dto: AssignRoleDto, @Request() req) {
    return this.permissionsService.assignRole(
      dto,
      req.user.walletAddress,
      req.ip,
    );
  }

  @Delete('roles/:id')
  @UseGuards(AdminGuard)
  revokeRole(@Param('id') id: string, @Request() req) {
    return this.permissionsService.revokeRole(id, req.user.walletAddress, req.ip);
  }

  @Get('roles')
  @UseGuards(AdminGuard)
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('roles/grantee/:granteeAddress')
  @UseGuards(AdminGuard)
  findByGrantee(@Param('granteeAddress') granteeAddress: string) {
    return this.permissionsService.findByGrantee(granteeAddress);
  }
}
