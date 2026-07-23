import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionsService } from './permissions.service';
import { RoleAssignment } from './role-assignment.entity';
import { AuditService } from '../audit/audit.service';
import { AuditOperation } from '../audit/audit-log.entity';
import {
  CredentialPermission,
  CredentialRole,
  GLOBAL_SCOPE,
} from './permission.model';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repo: Repository<RoleAssignment>;
  let audit: AuditService;

  const baseAssignment: RoleAssignment = {
    id: 'uuid-1',
    granteeAddress: 'GGRANTEE',
    role: CredentialRole.VERIFIER,
    resourceId: GLOBAL_SCOPE,
    grantedByAddress: 'GADMIN',
    isActive: true,
    expiresAt: null,
    grantedAt: new Date(),
    updatedAt: new Date(),
  };

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([baseAssignment]),
  };

  const mockRepo = {
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn((v) => Promise.resolve({ ...baseAssignment, ...v })),
    find: jest.fn().mockResolvedValue([baseAssignment]),
    findOne: jest.fn().mockResolvedValue(baseAssignment),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const mockAudit = { record: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.getMany.mockResolvedValue([baseAssignment]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: getRepositoryToken(RoleAssignment), useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(PermissionsService);
    repo = module.get(getRepositoryToken(RoleAssignment));
    audit = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignRole', () => {
    it('creates a new grant and writes an audit record', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(null);
      const result = await service.assignRole(
        { granteeAddress: 'GNEW', role: CredentialRole.ISSUER },
        'GADMIN',
        '127.0.0.1',
      );
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'GADMIN',
          operationType: AuditOperation.ROLE_ASSIGNED,
        }),
      );
      expect(result.isActive).toBe(true);
    });

    it('reactivates an existing assignment instead of duplicating', async () => {
      await service.assignRole(
        { granteeAddress: 'GGRANTEE', role: CredentialRole.VERIFIER },
        'GADMIN',
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('defaults an omitted resourceId to the global scope', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(null);
      await service.assignRole(
        { granteeAddress: 'GNEW', role: CredentialRole.VIEWER },
        'GADMIN',
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: GLOBAL_SCOPE }),
      );
    });

    it('rejects an expiry in the past', async () => {
      await expect(
        service.assignRole(
          {
            granteeAddress: 'GNEW',
            role: CredentialRole.VIEWER,
            expiresAt: '2000-01-01T00:00:00.000Z',
          },
          'GADMIN',
        ),
      ).rejects.toThrow('expiresAt must be in the future');
    });
  });

  describe('revokeRole', () => {
    it('deactivates the assignment and audits the change', async () => {
      const result = await service.revokeRole('uuid-1', 'GADMIN');
      expect(result.isActive).toBe(false);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: AuditOperation.ROLE_REVOKED,
        }),
      );
    });

    it('throws when the assignment does not exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValueOnce(null);
      await expect(service.revokeRole('missing', 'GADMIN')).rejects.toThrow(
        'Role assignment not found',
      );
    });
  });

  describe('permission resolution', () => {
    it('resolves effective permissions from active roles', async () => {
      const permissions = await service.getEffectivePermissions('GGRANTEE');
      // VERIFIER grants READ + VERIFY
      expect(permissions).toEqual(
        expect.arrayContaining([
          CredentialPermission.READ,
          CredentialPermission.VERIFY,
        ]),
      );
      expect(permissions).not.toContain(CredentialPermission.ISSUE);
    });

    it('grants a held permission', async () => {
      const allowed = await service.hasPermission(
        'GGRANTEE',
        CredentialPermission.VERIFY,
      );
      expect(allowed).toBe(true);
    });

    it('denies a permission not covered by any role', async () => {
      const allowed = await service.hasPermission(
        'GGRANTEE',
        CredentialPermission.MANAGE,
      );
      expect(allowed).toBe(false);
    });

    it('denies when the wallet has no active assignments', async () => {
      queryBuilder.getMany.mockResolvedValueOnce([]);
      const allowed = await service.hasPermission(
        'GNOBODY',
        CredentialPermission.READ,
      );
      expect(allowed).toBe(false);
    });

    it('dedupes roles when resolving effective roles', async () => {
      queryBuilder.getMany.mockResolvedValueOnce([
        baseAssignment,
        { ...baseAssignment, id: 'uuid-2' },
      ]);
      const roles = await service.getEffectiveRoles('GGRANTEE');
      expect(roles).toEqual([CredentialRole.VERIFIER]);
    });
  });
});
