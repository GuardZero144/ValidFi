use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Map, String, Vec};

#[derive(Clone)]
pub struct Identity {
    pub owner: Address,
    pub document_hash: BytesN<32>,
    pub ipfs_cid: String,
    pub verification_status: bool,
    pub created_at: u64,
    pub revoked: bool,
}

#[contract]
pub struct IdentityRegistry;

#[contractimpl]
impl IdentityRegistry {
    pub fn register_identity(
        env: &Env,
        owner: Address,
        document_hash: BytesN<32>,
        ipfs_cid: String,
    ) -> u64 {
        owner.require_auth();

        let identity_id = env
            .storage()
            .instance()
            .get(&(&owner, &document_hash))
            .unwrap_or(0u64)
            + 1;

        let identity = Identity {
            owner: owner.clone(),
            document_hash: document_hash.clone(),
            ipfs_cid: ipfs_cid.clone(),
            verification_status: false,
            created_at: env.ledger().timestamp(),
            revoked: false,
        };

        env.storage()
            .instance()
            .set(&(&owner, &document_hash), &identity_id);
        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
        env.storage()
            .instance()
            .set(&(identity_id, "owner"), &owner);

        identity_id
    }

    pub fn update_identity(
        env: &Env,
        identity_id: u64,
        document_hash: BytesN<32>,
        ipfs_cid: String,
    ) {
        let owner: Address = env
            .storage()
            .instance()
            .get(&(identity_id, "owner"))
            .unwrap_or_else(|| panic!("Identity not found"));

        owner.require_auth();

        let mut identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .unwrap_or_else(|| panic!("Identity not found"));

        identity.document_hash = document_hash;
        identity.ipfs_cid = ipfs_cid;

        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
    }

    pub fn revoke_identity(env: &Env, identity_id: u64) {
        let owner: Address = env
            .storage()
            .instance()
            .get(&(identity_id, "owner"))
            .unwrap_or_else(|| panic!("Identity not found"));

        owner.require_auth();

        let mut identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .unwrap_or_else(|| panic!("Identity not found"));

        identity.revoked = true;

        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
    }

    pub fn get_identity(env: &Env, identity_id: u64) -> Identity {
        env.storage()
            .instance()
            .get(&(identity_id, "identity"))
            .unwrap_or_else(|| panic!("Identity not found"))
    }

    pub fn get_identity_by_owner(env: &Env, owner: Address) -> Vec<u64> {
        let mut identities = Vec::new(env);

        // In a real implementation, you'd iterate through storage
        // For now, return empty vector as placeholder
        identities
    }

    pub fn is_verified(env: &Env, identity_id: u64) -> bool {
        let identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .unwrap_or_else(|| panic!("Identity not found"));

        identity.verification_status && !identity.revoked
    }
}
