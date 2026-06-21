use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

use crate::errors::Error;

#[contracttype]
#[derive(Clone)]
pub struct VerificationRecord {
    pub identity_id: u64,
    pub verifier: Address,
    pub proof_hash: BytesN<32>,
    pub verification_commitment: BytesN<32>,
    pub status: String,
    pub created_at: u64,
    pub revoked: bool,
    pub revoked_at: u64,
    pub revocation_reason: String,
}

#[contracttype]
pub enum VerificationEvent {
    VerificationRevoked,
}

#[contract]
pub struct Verification;

#[contractimpl]
impl Verification {
    pub fn submit_proof(
        env: &Env,
        identity_id: u64,
        verifier: Address,
        proof_hash: BytesN<32>,
        verification_commitment: BytesN<32>,
    ) -> u64 {
        verifier.require_auth();

        let verification_id = env
            .storage()
            .instance()
            .get::<_, u64>(&"verification_counter")
            .unwrap_or(0u64)
            + 1;

        let record = VerificationRecord {
            identity_id,
            verifier: verifier.clone(),
            proof_hash,
            verification_commitment,
            status: String::from_str(env, "pending"),
            created_at: env.ledger().timestamp(),
            revoked: false,
            revoked_at: 0,
            revocation_reason: String::from_str(env, ""),
        };

        env.storage()
            .instance()
            .set(&"verification_counter", &verification_id);
        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        env.storage()
            .instance()
            .set(&(identity_id, "verification"), &verification_id);

        verification_id
    }

    pub fn approve_verification(env: &Env, verification_id: u64) -> Result<(), Error> {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        record.verifier.require_auth();
        record.status = String::from_str(env, "approved");

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        Ok(())
    }

    pub fn reject_verification(
        env: &Env,
        verification_id: u64,
        reason: String,
    ) -> Result<(), Error> {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        record.verifier.require_auth();
        record.status = String::from_str(env, "rejected");

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        env.storage()
            .instance()
            .set(&(verification_id, "reason"), &reason);
        Ok(())
    }

    pub fn get_verification(env: &Env, verification_id: u64) -> Result<VerificationRecord, Error> {
        env.storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)
    }

    pub fn get_verification_by_identity(env: &Env, identity_id: u64) -> Result<u64, Error> {
        env.storage()
            .instance()
            .get(&(identity_id, "verification"))
            .ok_or(Error::VerificationNotFound)
    }

    pub fn get_verification_status(env: &Env, verification_id: u64) -> Result<String, Error> {
        let record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        Ok(record.status)
    }

    pub fn revoke_verification(
        env: &Env,
        verification_id: u64,
        reason: String,
    ) -> Result<(), Error> {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        record.verifier.require_auth();

        record.revoked = true;
        record.revoked_at = env.ledger().timestamp();
        record.revocation_reason = reason;

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);

        // Add to revocation list
        let mut revoked_list: Vec<u64> = env
            .storage()
            .instance()
            .get(&"revoked_verifications")
            .unwrap_or(Vec::new(env));

        revoked_list.push_back(verification_id);
        env.storage()
            .instance()
            .set(&"revoked_verifications", &revoked_list);

        // Emit revocation event
        env.events().publish(
            (String::from_str(env, "revocation"), verification_id),
            VerificationEvent::VerificationRevoked,
        );

        Ok(())
    }

    pub fn is_verification_revoked(env: &Env, verification_id: u64) -> Result<bool, Error> {
        let record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        Ok(record.revoked)
    }

    pub fn get_revocation_status(
        env: &Env,
        verification_id: u64,
    ) -> Result<(bool, u64, String), Error> {
        let record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        Ok((record.revoked, record.revoked_at, record.revocation_reason))
    }

    pub fn get_revoked_verifications(env: &Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&"revoked_verifications")
            .unwrap_or(Vec::new(env))
    }

    pub fn is_verification_valid(env: &Env, verification_id: u64) -> Result<bool, Error> {
        let record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .ok_or(Error::VerificationNotFound)?;

        Ok(record.status == String::from_str(env, "approved") && !record.revoked)
    }
}
