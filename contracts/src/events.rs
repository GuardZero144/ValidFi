use crate::types::{AuditRecord, CredentialShareEvent};
use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_audit_event(env: &Env, actor: Address, audit_record: AuditRecord) {
    env.events()
        .publish((symbol_short!("audit"), actor), audit_record);
}

pub fn emit_credential_share_event(
    env: &Env,
    owner: Address,
    event: CredentialShareEvent,
) {
    env.events()
        .publish((symbol_short!("cred_shr"), owner, event.share_id), event);
}
