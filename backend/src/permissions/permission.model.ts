/**
 * Credential access permission model.
 *
 * The system is role-based: a wallet is assigned one or more {@link CredentialRole}s
 * (optionally scoped to a single credential resource), and each role expands to a
 * fixed set of granular {@link CredentialPermission}s. Access checks resolve the
 * union of permissions granted by a wallet's active, unexpired role assignments.
 */

/**
 * Granular, action-level permissions that can be required by a protected
 * operation. These are the atoms an access check is expressed against.
 */
export enum CredentialPermission {
  /** View credential metadata and encrypted payload references. */
  READ = 'credential:read',
  /** Verify a credential / validate a zero-knowledge proof. */
  VERIFY = 'credential:verify',
  /** Issue new credentials (reserved for certified authorities). */
  ISSUE = 'credential:issue',
  /** Revoke an existing credential. */
  REVOKE = 'credential:revoke',
  /** Share a credential or grant another party scoped access. */
  SHARE = 'credential:share',
  /** Assign or revoke roles for other wallets. */
  MANAGE = 'permission:manage',
  /** Read the audit trail. */
  AUDIT_READ = 'audit:read',
}

/**
 * Named roles a wallet can hold. Ordered loosely from least to most privileged.
 */
export enum CredentialRole {
  /** Read-only access to credentials that have been shared with the wallet. */
  VIEWER = 'viewer',
  /** Can read and verify credentials — e.g. a venue or travel authority. */
  VERIFIER = 'verifier',
  /** A certified health authority that can issue, revoke and share credentials. */
  ISSUER = 'issuer',
  /** Full control, including managing other wallets' roles. */
  ADMIN = 'admin',
}

/**
 * Static mapping from each role to the set of permissions it grants. This is the
 * single source of truth for role capabilities; changing a role's powers is a
 * one-line edit here rather than a data migration.
 */
export const ROLE_PERMISSIONS: Readonly<
  Record<CredentialRole, readonly CredentialPermission[]>
> = {
  [CredentialRole.VIEWER]: [CredentialPermission.READ],
  [CredentialRole.VERIFIER]: [
    CredentialPermission.READ,
    CredentialPermission.VERIFY,
  ],
  [CredentialRole.ISSUER]: [
    CredentialPermission.READ,
    CredentialPermission.VERIFY,
    CredentialPermission.ISSUE,
    CredentialPermission.REVOKE,
    CredentialPermission.SHARE,
  ],
  [CredentialRole.ADMIN]: [
    CredentialPermission.READ,
    CredentialPermission.VERIFY,
    CredentialPermission.ISSUE,
    CredentialPermission.REVOKE,
    CredentialPermission.SHARE,
    CredentialPermission.MANAGE,
    CredentialPermission.AUDIT_READ,
  ],
};

/**
 * Expand a role into its concrete set of permissions.
 */
export function permissionsForRole(
  role: CredentialRole,
): readonly CredentialPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Sentinel `resourceId` denoting a role that applies to every credential
 * resource rather than a single one.
 */
export const GLOBAL_SCOPE = '*';
