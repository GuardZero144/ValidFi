use soroban_sdk::{contracttype, Address, BytesN, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SharingPermission {
    View,
    Download,
    ReShare,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CredentialShareEvent {
    pub share_id: u64,
    pub owner: Address,
    pub recipient: Address,
    pub permission: SharingPermission,
    pub action: Symbol,
    pub timestamp: u64,
}

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CredentialMetadata {
    pub credential_id: BytesN<32>,
    pub owner: Address,
    pub metadata: String,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataEvent {
    pub credential_id: BytesN<32>,
    pub owner: Address,
    pub action: Symbol,
    pub timestamp: u64,
}
