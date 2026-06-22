use soroban_sdk::{contracttype, Address, BytesN, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AuditEventType {
    CredentialIssued,
    CredentialUpdated,
    CredentialRevoked,
    CredentialVerified,
    SuspiciousActivityDetected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditRecord {
    pub credential_id: BytesN<32>,
    pub actor: Address,
    pub action: Symbol,
    pub timestamp: u64,
    pub details: String,
}
