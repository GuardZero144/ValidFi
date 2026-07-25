use crate::types::{AuditRecord, CredentialShareEvent, MetadataEvent};
use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol};

pub fn emit_audit_event(env: &Env, actor: Address, audit_record: AuditRecord) {
    env.events()
        .publish((symbol_short!("audit"), actor), audit_record);
}

pub fn emit_credential_share_event(env: &Env, owner: Address, event: CredentialShareEvent) {
    env.events()
        .publish((symbol_short!("cred_shr"), owner, event.share_id), event);
}

pub fn emit_metadata_event(env: &Env, owner: Address, credential_id: BytesN<32>, action: Symbol) {
    let event = MetadataEvent {
        credential_id: credential_id.clone(),
        owner: owner.clone(),
        action,
        timestamp: env.ledger().timestamp(),
    };
    env.events()
        .publish((symbol_short!("cred_meta"), owner, credential_id), event);
}
