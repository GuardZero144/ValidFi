use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String, Symbol, Vec};

use crate::errors::Error;
use crate::events::emit_audit_event;
use crate::storage::AuditDataKey;
use crate::types::AuditRecord;

#[contract]
pub struct Auditing;

#[contractimpl]
impl Auditing {
    pub fn get_audit_report(env: Env, credential_id: BytesN<32>) -> Vec<AuditRecord> {
        env.storage()
            .persistent()
            .get(&AuditDataKey::AuditRecords(credential_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn log_audit_event(
        env: Env,
        credential_id: BytesN<32>,
        actor: Address,
        action: Symbol,
        details: String,
    ) {
        let timestamp = env.ledger().timestamp();
        let record = AuditRecord {
            credential_id: credential_id.clone(),
            actor: actor.clone(),
            action: action.clone(),
            timestamp,
            details,
        };

        let mut records = Self::get_audit_report(env.clone(), credential_id.clone());
        records.push_back(record.clone());

        env.storage()
            .persistent()
            .set(&AuditDataKey::AuditRecords(credential_id.clone()), &records);

        emit_audit_event(&env, actor, record);
    }

    pub fn track_activity(env: Env, actor: Address, is_failure: bool) -> Result<(), Error> {
        let mut failed_attempts: u32 = env
            .storage()
            .instance()
            .get(&AuditDataKey::ActivityTracker(actor.clone()))
            .unwrap_or(0);

        if is_failure {
            failed_attempts += 1;
        } else {
            failed_attempts = 0;
        }

        env.storage().instance().set(
            &AuditDataKey::ActivityTracker(actor.clone()),
            &failed_attempts,
        );

        if failed_attempts > 5 {
            Self::log_audit_event(
                env.clone(),
                BytesN::from_array(&env, &[0; 32]), // Dummy ID for suspicious actor without specific credential
                actor.clone(),
                Symbol::new(&env, "suspicious"),
                String::from_str(&env, "Excessive verification failures"),
            );
            return Err(Error::SuspiciousActivity);
        }

        Ok(())
    }

    pub fn require_auth(actor: &Address) {
        actor.require_auth();
    }

    pub fn credential_exists(env: &Env, credential_id: &BytesN<32>) -> Result<(), Error> {
        let records: Option<Vec<AuditRecord>> = env
            .storage()
            .persistent()
            .get(&AuditDataKey::AuditRecords(credential_id.clone()));
        if records.is_none() {
            return Err(Error::CredentialNotFound);
        }
        Ok(())
    }

    pub fn credential_not_revoked(env: &Env, credential_id: &BytesN<32>) -> Result<(), Error> {
        let records = Self::get_audit_report(env.clone(), credential_id.clone());
        for record in records.iter() {
            if record.action == Symbol::new(env, "revoked") {
                return Err(Error::CredentialRevoked);
            }
        }
        Ok(())
    }

    pub fn issuer_authorized(
        env: &Env,
        issuer: &Address,
        credential_id: &BytesN<32>,
    ) -> Result<(), Error> {
        let records = Self::get_audit_report(env.clone(), credential_id.clone());
        for record in records.iter() {
            if record.action == Symbol::new(env, "issued") {
                if record.actor != *issuer {
                    return Err(Error::IssuerNotAuthorized);
                }
                return Ok(());
            }
        }
        Ok(())
    }
}
