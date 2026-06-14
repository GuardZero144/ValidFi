use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, String, Vec};

#[derive(Clone)]
pub struct VerificationRecord {
    pub identity_id: u64,
    pub verifier: Address,
    pub proof_hash: BytesN<32>,
    pub verification_commitment: BytesN<32>,
    pub status: String, // "pending", "approved", "rejected"
    pub created_at: u64,
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
            .get(&("verification_counter"))
            .unwrap_or(0u64)
            + 1;

        let record = VerificationRecord {
            identity_id,
            verifier: verifier.clone(),
            proof_hash: proof_hash.clone(),
            verification_commitment: verification_commitment.clone(),
            status: String::from_str(env, "pending"),
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&("verification_counter"), &verification_id);
        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        env.storage()
            .instance()
            .set(&(identity_id, "verification"), &verification_id);

        verification_id
    }

    pub fn verify_document(env: &Env, verification_id: u64, approved: bool, reason: String) {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .unwrap_or_else(|| panic!("Verification record not found"));

        record.verifier.require_auth();

        if approved {
            record.status = String::from_str(env, "approved");
        } else {
            record.status = String::from_str(env, "rejected");
        }

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        env.storage()
            .instance()
            .set(&(verification_id, "reason"), &reason);
    }

    pub fn approve_verification(env: &Env, verification_id: u64) {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .unwrap_or_else(|| panic!("Verification record not found"));

        record.verifier.require_auth();

        record.status = String::from_str(env, "approved");

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
    }

    pub fn reject_verification(env: &Env, verification_id: u64, reason: String) {
        let mut record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .unwrap_or_else(|| panic!("Verification record not found"));

        record.verifier.require_auth();

        record.status = String::from_str(env, "rejected");

        env.storage()
            .instance()
            .set(&(verification_id, "record"), &record);
        env.storage()
            .instance()
            .set(&(verification_id, "reason"), &reason);
    }

    pub fn get_verification(env: &Env, verification_id: u64) -> VerificationRecord {
        env.storage()
            .instance()
            .get(&(verification_id, "record"))
            .unwrap_or_else(|| panic!("Verification record not found"))
    }

    pub fn get_verification_by_identity(env: &Env, identity_id: u64) -> u64 {
        env.storage()
            .instance()
            .get(&(identity_id, "verification"))
            .unwrap_or_else(|| panic!("No verification found for identity"))
    }

    pub fn get_verification_status(env: &Env, verification_id: u64) -> String {
        let record: VerificationRecord = env
            .storage()
            .instance()
            .get(&(verification_id, "record"))
            .unwrap_or_else(|| panic!("Verification record not found"));

        record.status
    }
}
