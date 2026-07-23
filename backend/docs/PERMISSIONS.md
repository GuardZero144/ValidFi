# Credential Access Permission System

Granular, role-based access control for credential operations: define permission
levels, assign roles to wallets, enforce permission checks on routes, and audit
every permission change.

## Overview

The `PermissionsModule` (`src/permissions/`) provides:

- **A permission model** — granular action-level permissions (`CredentialPermission`)
  and named roles (`CredentialRole`) with a static role → permission mapping.
- **Role-based grants** — assign a role to a wallet, globally or scoped to a single
  credential resource, with an optional expiry.
- **Permission checks** — resolve a wallet's effective permissions and answer
  `hasPermission(wallet, permission, resourceId?)`.
- **Declarative enforcement** — a `@RequirePermission(...)` decorator + `PermissionsGuard`
  that other feature modules attach to their credential routes.
- **Audited changes** — every role grant and revocation is written to the
  tamper-evident audit trail via the `AuditService`.

## Permission model

Permissions are granular actions. Roles bundle permissions; a wallet holds roles,
not raw permissions.

| Permission            | Meaning                                          |
| --------------------- | ------------------------------------------------ |
| `credential:read`     | View credential metadata / encrypted references  |
| `credential:verify`   | Verify a credential / validate a zk proof        |
| `credential:issue`    | Issue new credentials                            |
| `credential:revoke`   | Revoke an existing credential                    |
| `credential:share`    | Share a credential or grant scoped access        |
| `permission:manage`   | Assign or revoke roles for other wallets         |
| `audit:read`          | Read the audit trail                             |

| Role       | Permissions                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `viewer`   | `read`                                                                          |
| `verifier` | `read`, `verify`                                                                |
| `issuer`   | `read`, `verify`, `issue`, `revoke`, `share`                                    |
| `admin`    | all of the above plus `permission:manage`, `audit:read`                         |

The mapping lives in `ROLE_PERMISSIONS` (`permission.model.ts`) — the single source
of truth. Changing a role's powers is a one-line edit, not a data migration.

## Data model

`RoleAssignment` (`role_assignments` table):

| Field              | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `id`               | UUID primary key                                                |
| `granteeAddress`   | Wallet the role is granted to                                   |
| `role`             | `viewer` \| `verifier` \| `issuer` \| `admin`                   |
| `resourceId`       | Credential resource id, or `*` (`GLOBAL_SCOPE`) for all         |
| `grantedByAddress` | Wallet that granted the role                                    |
| `isActive`         | Grants are revoked by flipping this to `false`, preserving history |
| `expiresAt`        | Optional expiry (`null` = never expires)                        |
| `grantedAt`        | Timestamp                                                       |
| `updatedAt`        | Timestamp                                                       |

A `(granteeAddress, resourceId, role)` triple is unique — re-granting reactivates
and refreshes the existing row instead of duplicating it.

## Scoping

An assignment is either **global** (`resourceId = '*'`) — applies to every
credential — or **resource-scoped** to one credential id. A permission check for a
specific resource is satisfied by a matching resource-scoped grant **or** any
global grant.

## Enforcing checks on routes

Other feature modules protect their credential handlers declaratively:

```ts
@Controller('credentials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CredentialsController {
  @Post(':id/verify')
  @RequirePermission(CredentialPermission.VERIFY) // scoped to the `id` route param
  verify(...) { ... }

  @Post()
  @RequirePermission(CredentialPermission.ISSUE, { resourceIdParam: null }) // global check
  issue(...) { ... }
}
```

`PermissionsGuard` reads the caller's wallet (`request.user.walletAddress`,
populated by `JwtAuthGuard`), resolves the optional target resource from the route
param, and denies with `403` when the permission is not held.

## API

All endpoints require a valid JWT. Role management additionally requires a wallet
listed in `ADMIN_WALLETS` (the root of trust that bootstraps roles).

| Method & path                              | Guard      | Description                                   |
| ------------------------------------------ | ---------- | --------------------------------------------- |
| `GET /permissions/catalog`                 | JWT        | The static role → permission map              |
| `GET /permissions/me?resourceId=`          | JWT        | Caller's effective roles & permissions        |
| `POST /permissions/check`                  | JWT        | Check a permission for the caller             |
| `POST /permissions/roles`                  | JWT + admin | Assign a role                                |
| `DELETE /permissions/roles/:id`            | JWT + admin | Revoke a role assignment                     |
| `GET /permissions/roles`                   | JWT + admin | List all assignments                         |
| `GET /permissions/roles/grantee/:address`  | JWT + admin | List a wallet's assignments                  |

`POST /permissions/roles` body: `{ granteeAddress, role, resourceId?, expiresAt? }`
(`resourceId` defaults to global; `expiresAt` is an ISO-8601 timestamp).

## Auditing

Role grants and revocations call `AuditService.record` with the
`role_assigned` / `role_revoked` operation types, capturing the actor, target
resource, and the grant details (grantee, role, scope, expiry) in metadata. These
entries are hash-chained alongside all other credential operations — see
[AUDIT_LOGGING.md](./AUDIT_LOGGING.md).

## Configuration

| Variable        | Default | Description                            |
| --------------- | ------- | -------------------------------------- |
| `ADMIN_WALLETS` | (empty) | Comma-separated admin wallet allowlist |
