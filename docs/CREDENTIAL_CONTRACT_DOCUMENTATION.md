# Credential Contract Documentation

## Purpose

The Credential Contract manages:

- credential issuance
- verification
- revocation
- audit tracking
- secure credential ownership

## Architecture

```text
Issuer
   |
Credential Contract
   |
Credential Holder
   |
Verifier
```

## Function Documentation

### issue_credential()

Issues a new credential.

Parameters:

| Name | Type | Description |
|--------|--------|--------|
| issuer | Address | Credential issuer |
| holder | Address | Credential owner |
| hash | BytesN<32> | Credential hash |

Returns:

Credential ID

## Parameter Reference

- `credential_id`: Unique identifier for the credential (BytesN<32>)
- `issuer`: Address of the credential issuer
- `holder`: Address of the credential owner
- `status`: Current status of the credential
- `metadata_hash`: Hash of the credential metadata
- `verification_timestamp`: Timestamp when the credential was verified
- `revocation_reason`: Reason for credential revocation

## Usage Examples

### Issue Credential
```rust
contract.issue_credential(
    issuer,
    holder,
    metadata_hash
);
```

### Verify Credential
```rust
contract.verify_credential(
    credential_id
);
```

### Revoke Credential
```rust
contract.revoke_credential(
    credential_id
);
```

## Security

### Access Control

Only authorized issuers may create credentials.

### Revocation

Revoked credentials remain queryable but invalid.

### Replay Prevention

Credential IDs are unique.

### Auditability

All credential actions emit events.

### Storage Safety

Sensitive health data should remain encrypted off-chain.

## Event Documentation

- `credential_issued`
- `credential_updated`
- `credential_verified`
- `credential_revoked`
- `security_alert`

## Error Reference

- `UnauthorizedIssuer`
- `CredentialNotFound`
- `CredentialRevoked`
- `VerificationFailed`
