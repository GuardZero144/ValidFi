import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleAssignment } from './role-assignment.entity';
import { AssignRoleDto } from './dto/assign-role.dto';
import {
  CredentialPermission,
  CredentialRole,
  GLOBAL_SCOPE,
  permissionsForRole,
} from './permission.model';
import { AuditService } from '../audit/audit.service';
import { AuditOperation, AuditStatus } from '../audit/audit-log.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RoleAssignment)
    private readonly roleAssignmentRepository: Repository<RoleAssignment>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Grant a role to a wallet, optionally scoped to a single resource and with an
   * optional expiry. Re-granting an existing (grantee, resource, role) triple
   * reactivates and refreshes it rather than creating a duplicate. Every grant
   * is recorded on the tamper-evident audit trail.
   */
  async assignRole(
    dto: AssignRoleDto,
    grantedByAddress: string,
    clientIp?: string | null,
  ): Promise<RoleAssignment> {
    const expiresAt = this.parseExpiry(dto.expiresAt);
    const resourceId = dto.resourceId ?? GLOBAL_SCOPE;

    const existing = await this.roleAssignmentRepository.findOne({
      where: { granteeAddress: dto.granteeAddress, resourceId, role: dto.role },
    });

    const assignment =
      existing ??
      this.roleAssignmentRepository.create({
        granteeAddress: dto.granteeAddress,
        role: dto.role,
        resourceId,
      });

    assignment.grantedByAddress = grantedByAddress;
    assignment.isActive = true;
    assignment.expiresAt = expiresAt;

    const saved = await this.roleAssignmentRepository.save(assignment);

    await this.auditService.record({
      actorId: grantedByAddress,
      operationType: AuditOperation.ROLE_ASSIGNED,
      targetCredentialId: resourceId === GLOBAL_SCOPE ? null : resourceId,
      clientIp: clientIp ?? null,
      status: AuditStatus.SUCCESS,
      metadata: {
        granteeAddress: dto.granteeAddress,
        role: dto.role,
        resourceId,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });

    return saved;
  }

  /**
   * Revoke a role assignment by id. Deactivates the grant (preserving history)
   * and records the change on the audit trail.
   */
  async revokeRole(
    id: string,
    revokedByAddress: string,
    clientIp?: string | null,
  ): Promise<RoleAssignment> {
    const assignment = await this.findOne(id);
    assignment.isActive = false;
    const saved = await this.roleAssignmentRepository.save(assignment);

    await this.auditService.record({
      actorId: revokedByAddress,
      operationType: AuditOperation.ROLE_REVOKED,
      targetCredentialId:
        assignment.resourceId === GLOBAL_SCOPE ? null : assignment.resourceId,
      clientIp: clientIp ?? null,
      status: AuditStatus.SUCCESS,
      metadata: {
        assignmentId: assignment.id,
        granteeAddress: assignment.granteeAddress,
        role: assignment.role,
        resourceId: assignment.resourceId,
      },
    });

    return saved;
  }

  async findOne(id: string): Promise<RoleAssignment> {
    const assignment = await this.roleAssignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }
    return assignment;
  }

  findAll(): Promise<RoleAssignment[]> {
    return this.roleAssignmentRepository.find({
      order: { grantedAt: 'DESC' },
    });
  }

  findByGrantee(granteeAddress: string): Promise<RoleAssignment[]> {
    return this.roleAssignmentRepository.find({
      where: { granteeAddress },
      order: { grantedAt: 'DESC' },
    });
  }

  /**
   * The distinct roles a wallet currently, effectively holds for a resource —
   * i.e. active, unexpired grants that are either global or scoped to that
   * resource.
   */
  async getEffectiveRoles(
    granteeAddress: string,
    resourceId?: string,
  ): Promise<CredentialRole[]> {
    const assignments = await this.activeAssignments(
      granteeAddress,
      resourceId,
    );
    return [...new Set(assignments.map((a) => a.role))];
  }

  /**
   * The union of permissions a wallet effectively has for a resource, resolved
   * from its active roles.
   */
  async getEffectivePermissions(
    granteeAddress: string,
    resourceId?: string,
  ): Promise<CredentialPermission[]> {
    const roles = await this.getEffectiveRoles(granteeAddress, resourceId);
    const permissions = new Set<CredentialPermission>();
    for (const role of roles) {
      for (const permission of permissionsForRole(role)) {
        permissions.add(permission);
      }
    }
    return [...permissions];
  }

  /**
   * Whether a wallet holds a specific permission for a resource. A globally
   * scoped grant satisfies checks for any resource.
   */
  async hasPermission(
    granteeAddress: string,
    permission: CredentialPermission,
    resourceId?: string,
  ): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(
      granteeAddress,
      resourceId,
    );
    return permissions.includes(permission);
  }

  /**
   * Fetch the active, unexpired assignments for a wallet that apply to the given
   * resource (global grants always apply).
   */
  private activeAssignments(
    granteeAddress: string,
    resourceId?: string,
  ): Promise<RoleAssignment[]> {
    const query = this.roleAssignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.granteeAddress = :granteeAddress', { granteeAddress })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .andWhere(
        '(assignment.expiresAt IS NULL OR assignment.expiresAt > :now)',
        { now: new Date() },
      );

    if (resourceId && resourceId !== GLOBAL_SCOPE) {
      query.andWhere(
        '(assignment.resourceId = :global OR assignment.resourceId = :resourceId)',
        { global: GLOBAL_SCOPE, resourceId },
      );
    } else {
      query.andWhere('assignment.resourceId = :global', {
        global: GLOBAL_SCOPE,
      });
    }

    return query.getMany();
  }

  private parseExpiry(expiresAt?: string): Date | null {
    if (!expiresAt) {
      return null;
    }
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid expiresAt timestamp');
    }
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
    return date;
  }
}
