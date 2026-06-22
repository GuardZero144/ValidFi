use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
pub enum AuditDataKey {
    AuditRecords(BytesN<32>),
    ActivityTracker(Address),
}
