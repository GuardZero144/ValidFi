use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
pub enum AuditDataKey {
    AuditRecords(BytesN<32>),
    ActivityTracker(Address),
}

#[contracttype]
pub enum SharingDataKey {
    Counter,
    Record(u64),
    ByOwner(Address),
    ByRecipient(Address),
}
