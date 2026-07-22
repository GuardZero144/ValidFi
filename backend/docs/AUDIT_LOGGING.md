# Credential Audit Logging

Comprehensive, tamper-evident audit logging for all credential operations
(issuance, verification, revocation, updates, deletion, sharing).

## Overview

The `AuditModule` (`src/audit/`) provides:

- **Automatic capture** of credential operations via an interceptor + decorator,
  so handlers don't carry logging boilerplate.
- **Tamper-evident storage** using HMAC hash-chaining across entries.
- **An admin-only query interface** with filtering, pagination, integrity
  verification and export (JSON/CSV).
- **A retention worker** that purges entries older than a configurable window.

## Data model

`AuditLog` (`audit_logs` table):

| Field                | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `id`                 | UUID primary key                                         |
| `sequence`           | Auto-increment; establishes total chain order            |
| `actorId`            | Wallet address that performed the operation              |
| `operationType`      | `issued` \| `revoked` \| `verified` \| `updated` \| `deleted` \| `shared` \| `accessed` |
| `targetCredentialId` | Credential the operation targeted (nullable)             |
| `clientIp`           | Source IP of the request (nullable)                      |
| `status`             | `success` \| `failure`                                   |
| `metadata`           | Non-sensitive JSON context (method, path, error, …)      |
| `previousHash`       | Hash of the preceding entry (null for genesis)           |
| `hash`               | HMAC-SHA256 of this entry chained to `previousHash`      |
| `createdAt`          | Timestamp                                                |

## Automatic logging

Annotate a credential handler and attach the interceptor — a record is emitted
for every call, success or failure, with no extra code in the handler body:

```ts
@Controller('identities')
@UseInterceptors(AuditInterceptor)
export class IdentityController {
  @Post()
  @Audit(AuditOperation.ISSUED, { credentialIdParam: null })
  create(...) { ... }

  @Patch(':id/revoke')
  @Audit(AuditOperation.REVOKED) // targetCredentialId read from the `id` route param
  revoke(...) { ... }
}
```

The interceptor records the acting wallet (`request.user.walletAddress`), the
client IP, the target credential id (from the configured route param or the
response `id`), and the operation outcome. Auditing failures never interrupt the
underlying operation — they are logged and swallowed.

## Integrity (hash-chaining)

Each entry's `hash` is `HMAC-SHA256(AUDIT_HMAC_SECRET, canonicalPayload || previousHash)`.
Because every entry commits to the previous entry's hash, any post-hoc edit,
insertion or deletion of a historical row breaks the chain.

`GET /audit-logs/verify` recomputes every hash and validates the linkage,
returning `{ valid, checked, brokenAtSequence?, reason? }`. Verification starts
from the earliest surviving entry, so a retention purge of the oldest contiguous
prefix does not raise a false positive.

## Retention

`AuditRetentionService` runs a background sweep (native interval, driven by Nest
lifecycle hooks — no extra scheduler dependency) that purges entries older than
`AUDIT_RETENTION_DAYS`. A sweep can also be triggered on demand via
`POST /audit-logs/retention/sweep`.

## API (admin-only)

All endpoints require a valid JWT **and** a wallet listed in `ADMIN_WALLETS`.

| Method & path                   | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `GET /audit-logs`               | Filtered, paginated query                     |
| `GET /audit-logs/verify`        | Integrity report                              |
| `GET /audit-logs/export`        | Export matching entries (`?format=json\|csv`) |
| `POST /audit-logs/retention/sweep` | Trigger a retention sweep                   |

Query/filter parameters: `page`, `limit`, `actorId`, `operationType`, `status`,
`targetCredentialId`, `from` (ISO-8601), `to` (ISO-8601).

## Configuration

| Variable                      | Default | Description                                    |
| ----------------------------- | ------- | ---------------------------------------------- |
| `AUDIT_HMAC_SECRET`           | `JWT_SECRET` | Secret used to HMAC-chain entries          |
| `ADMIN_WALLETS`               | (empty) | Comma-separated admin wallet allowlist         |
| `AUDIT_RETENTION_DAYS`        | `365`   | Age threshold for purging entries              |
| `AUDIT_RETENTION_SWEEP_HOURS` | `24`    | Interval between retention sweeps               |
| `AUDIT_RETENTION_ENABLED`     | `true`  | Set to `false` to disable the retention worker |
