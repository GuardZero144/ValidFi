use soroban_sdk::{symbol_short, Address, Env};
use crate::types::AuditRecord;

pub fn emit_audit_event(env: &Env, actor: Address, audit_record: AuditRecord) {
    env.events().publish(
        (symbol_short!("audit"), actor),
        audit_record,
    );
}
