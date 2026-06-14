use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env, Map, String, Vec};

#[derive(Clone)]
pub struct SharedData {
    pub owner: Address,
    pub recipient: Address,
    pub document_hash: BytesN<32>,
    pub encrypted_key: Bytes,
    pub access_expiry: u64,
    pub is_active: bool,
    pub shared_at: u64,
}

#[contract]
pub struct DataSharing;

#[contractimpl]
impl DataSharing {
    pub fn share_document(
        env: &Env,
        owner: Address,
        recipient: Address,
        document_hash: BytesN<32>,
        encrypted_key: Bytes,
        duration_seconds: u64,
    ) -> u64 {
        owner.require_auth();

        let share_id = env
            .storage()
            .instance()
            .get(&("share_counter"))
            .unwrap_or(0u64)
            + 1;

        let shared_data = SharedData {
            owner: owner.clone(),
            recipient: recipient.clone(),
            document_hash: document_hash.clone(),
            encrypted_key: encrypted_key.clone(),
            access_expiry: env.ledger().timestamp() + duration_seconds,
            is_active: true,
            shared_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&("share_counter"), &share_id);
        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
        env.storage()
            .instance()
            .set(&(owner, recipient, document_hash), &share_id);

        share_id
    }

    pub fn revoke_shared_document(env: &Env, share_id: u64) {
        let mut shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .unwrap_or_else(|| panic!("Shared document not found"));

        shared_data.owner.require_auth();

        shared_data.is_active = false;

        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
    }

    pub fn get_shared_document(env: &Env, share_id: u64) -> SharedData {
        env.storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .unwrap_or_else(|| panic!("Shared document not found"))
    }

    pub fn get_shared_document_by_parties(
        env: &Env,
        owner: Address,
        recipient: Address,
        document_hash: BytesN<32>,
    ) -> u64 {
        env.storage()
            .instance()
            .get(&(owner, recipient, document_hash))
            .unwrap_or_else(|| panic!("Shared document not found"))
    }

    pub fn is_share_active(env: &Env, share_id: u64) -> bool {
        let shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .unwrap_or_else(|| panic!("Shared document not found"));

        if !shared_data.is_active {
            return false;
        }

        if env.ledger().timestamp() > shared_data.access_expiry {
            return false;
        }

        true
    }

    pub fn extend_share(env: &Env, share_id: u64, additional_seconds: u64) {
        let mut shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .unwrap_or_else(|| panic!("Shared document not found"));

        shared_data.owner.require_auth();

        shared_data.access_expiry += additional_seconds;

        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
    }

    pub fn get_shares_by_owner(env: &Env, owner: Address) -> Vec<u64> {
        let mut shares = Vec::new(env);

        // In a real implementation, you'd iterate through storage
        // For now, return empty vector as placeholder
        shares
    }

    pub fn get_shares_by_recipient(env: &Env, recipient: Address) -> Vec<u64> {
        let mut shares = Vec::new(env);

        // In a real implementation, you'd iterate through storage
        // For now, return empty vector as placeholder
        shares
    }
}
