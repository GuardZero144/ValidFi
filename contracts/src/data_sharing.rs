use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, String, Symbol, Vec};

use crate::errors::Error;
use crate::storage::SharingDataKey;
use crate::types::{CredentialShareEvent, SharingPermission};

#[contracttype]
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

#[contracttype]
#[derive(Clone)]
pub struct CredentialShare {
    pub owner: Address,
    pub recipient: Address,
    pub credential_hash: BytesN<32>,
    pub encrypted_key: Bytes,
    pub permission: SharingPermission,
    pub access_expiry: u64,
    pub is_active: bool,
    pub shared_at: u64,
    pub revoked_at: u64,
    pub revocation_reason: String,
}

const PERSISTENT_TTL_THRESHOLD: u32 = 17_280;
const PERSISTENT_TTL_EXTEND: u32 = 535_680;

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
            .get::<_, u64>(&"share_counter")
            .unwrap_or(0u64)
            + 1;

        let shared_data = SharedData {
            owner: owner.clone(),
            recipient: recipient.clone(),
            document_hash: document_hash.clone(),
            encrypted_key,
            access_expiry: env.ledger().timestamp() + duration_seconds,
            is_active: true,
            shared_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&"share_counter", &share_id);
        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
        env.storage()
            .instance()
            .set(&(owner, recipient, document_hash), &share_id);

        share_id
    }

    pub fn revoke_shared_document(env: &Env, share_id: u64) -> Result<(), Error> {
        let mut shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .ok_or(Error::SharedDocumentNotFound)?;

        shared_data.owner.require_auth();
        shared_data.is_active = false;

        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
        Ok(())
    }

    pub fn get_shared_document(env: &Env, share_id: u64) -> Result<SharedData, Error> {
        env.storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .ok_or(Error::SharedDocumentNotFound)
    }

    pub fn get_shared_document_by_parties(
        env: &Env,
        owner: Address,
        recipient: Address,
        document_hash: BytesN<32>,
    ) -> Result<u64, Error> {
        env.storage()
            .instance()
            .get(&(owner, recipient, document_hash))
            .ok_or(Error::SharedDocumentNotFound)
    }

    pub fn is_share_active(env: &Env, share_id: u64) -> Result<bool, Error> {
        let shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .ok_or(Error::SharedDocumentNotFound)?;

        Ok(shared_data.is_active && env.ledger().timestamp() <= shared_data.access_expiry)
    }

    pub fn extend_share(env: &Env, share_id: u64, additional_seconds: u64) -> Result<(), Error> {
        let mut shared_data: SharedData = env
            .storage()
            .instance()
            .get(&(share_id, "shared_data"))
            .ok_or(Error::SharedDocumentNotFound)?;

        shared_data.owner.require_auth();
        shared_data.access_expiry += additional_seconds;

        env.storage()
            .instance()
            .set(&(share_id, "shared_data"), &shared_data);
        Ok(())
    }

    pub fn share_credential(
        env: &Env,
        owner: Address,
        recipient: Address,
        credential_hash: BytesN<32>,
        encrypted_key: Bytes,
        permission: SharingPermission,
        duration_seconds: u64,
    ) -> u64 {
        owner.require_auth();

        let share_id = env
            .storage()
            .instance()
            .get::<_, u64>(&SharingDataKey::ShareCounter)
            .unwrap_or(0u64)
            + 1;

        let now = env.ledger().timestamp();
        let share = CredentialShare {
            owner: owner.clone(),
            recipient: recipient.clone(),
            credential_hash: credential_hash.clone(),
            encrypted_key,
            permission: permission.clone(),
            access_expiry: now + duration_seconds,
            is_active: true,
            shared_at: now,
            revoked_at: 0,
            revocation_reason: String::from_str(&env, ""),
        };

        env.storage()
            .instance()
            .set(&SharingDataKey::ShareCounter, &share_id);
        write_credential_share(&env, share_id, &share);

        let mut owner_shares: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SharingDataKey::ShareByOwner(owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_shares.push_back(share_id);
        env.storage()
            .persistent()
            .set(&SharingDataKey::ShareByOwner(owner.clone()), &owner_shares);

        let mut recipient_shares: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SharingDataKey::ShareByRecipient(recipient.clone()))
            .unwrap_or(Vec::new(&env));
        recipient_shares.push_back(share_id);
        env.storage()
            .persistent()
            .set(&SharingDataKey::ShareByRecipient(recipient.clone()), &recipient_shares);

        let event = CredentialShareEvent {
            share_id,
            owner: owner.clone(),
            recipient,
            permission,
            action: Symbol::new(&env, "shared"),
            timestamp: now,
        };
        crate::events::emit_credential_share_event(&env, owner, event);

        share_id
    }

    pub fn check_credential_access(
        env: &Env,
        grantee: Address,
        credential_hash: BytesN<32>,
    ) -> bool {
        let shares: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SharingDataKey::ShareByRecipient(grantee))
            .unwrap_or(Vec::new(&env));

        for i in 0..shares.len() {
            if let Some(share_id) = shares.get(i) {
                if let Ok(share) = read_credential_share(&env, share_id) {
                    if share.credential_hash == credential_hash
                        && share.is_active
                        && env.ledger().timestamp() <= share.access_expiry
                    {
                        return true;
                    }
                }
            }
        }
        false
    }

    pub fn get_credential_share(env: &Env, share_id: u64) -> Result<CredentialShare, Error> {
        read_credential_share(&env, share_id)
    }

    pub fn get_shares_by_owner(env: &Env, owner: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&SharingDataKey::ShareByOwner(owner))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_shares_by_recipient(env: &Env, recipient: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&SharingDataKey::ShareByRecipient(recipient))
            .unwrap_or(Vec::new(&env))
    }

    pub fn revoke_credential_share(
        env: &Env,
        share_id: u64,
        reason: String,
    ) -> Result<(), Error> {
        let mut share = read_credential_share(&env, share_id)?;
        share.owner.require_auth();

        share.is_active = false;
        share.revoked_at = env.ledger().timestamp();
        share.revocation_reason = reason.clone();

        write_credential_share(&env, share_id, &share);

        let event = CredentialShareEvent {
            share_id,
            owner: share.owner.clone(),
            recipient: share.recipient,
            permission: share.permission,
            action: Symbol::new(&env, "revoked"),
            timestamp: env.ledger().timestamp(),
        };
        crate::events::emit_credential_share_event(&env, share.owner, event);

        Ok(())
    }

    pub fn extend_credential_share(
        env: &Env,
        share_id: u64,
        additional_seconds: u64,
    ) -> Result<(), Error> {
        let mut share = read_credential_share(&env, share_id)?;
        share.owner.require_auth();

        share.access_expiry += additional_seconds;
        write_credential_share(&env, share_id, &share);

        let event = CredentialShareEvent {
            share_id,
            owner: share.owner.clone(),
            recipient: share.recipient,
            permission: share.permission,
            action: Symbol::new(&env, "extended"),
            timestamp: env.ledger().timestamp(),
        };
        crate::events::emit_credential_share_event(&env, share.owner, event);

        Ok(())
    }

    pub fn re_share_credential(
        env: &Env,
        share_id: u64,
        new_recipient: Address,
        new_permission: SharingPermission,
        duration_seconds: u64,
    ) -> Result<u64, Error> {
        let share = read_credential_share(&env, share_id)?;

        if !share.is_active || env.ledger().timestamp() > share.access_expiry {
            return Err(Error::ShareExpired);
        }
        if share.permission != SharingPermission::ReShare {
            return Err(Error::CannotReShare);
        }

        share.recipient.require_auth();

        let now = env.ledger().timestamp();
        let new_share = CredentialShare {
            owner: share.owner,
            recipient: new_recipient.clone(),
            credential_hash: share.credential_hash.clone(),
            encrypted_key: share.encrypted_key,
            permission: new_permission.clone(),
            access_expiry: now + duration_seconds,
            is_active: true,
            shared_at: now,
            revoked_at: 0,
            revocation_reason: String::from_str(&env, ""),
        };

        let new_share_id = env
            .storage()
            .instance()
            .get::<_, u64>(&SharingDataKey::ShareCounter)
            .unwrap_or(0u64)
            + 1;

        env.storage()
            .instance()
            .set(&SharingDataKey::ShareCounter, &new_share_id);
        write_credential_share(&env, new_share_id, &new_share);

        let mut owner_shares: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SharingDataKey::ShareByOwner(new_share.owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_shares.push_back(new_share_id);
        env.storage()
            .persistent()
            .set(&SharingDataKey::ShareByOwner(new_share.owner.clone()), &owner_shares);

        let mut recipient_shares: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SharingDataKey::ShareByRecipient(new_recipient.clone()))
            .unwrap_or(Vec::new(&env));
        recipient_shares.push_back(new_share_id);
        env.storage()
            .persistent()
            .set(&SharingDataKey::ShareByRecipient(new_recipient.clone()), &recipient_shares);

        let event = CredentialShareEvent {
            share_id: new_share_id,
            owner: new_share.owner.clone(),
            recipient: new_recipient,
            permission: new_permission,
            action: Symbol::new(&env, "re_shared"),
            timestamp: now,
        };
        crate::events::emit_credential_share_event(&env, new_share.owner, event);

        Ok(new_share_id)
    }
}

fn read_credential_share(env: &Env, share_id: u64) -> Result<CredentialShare, Error> {
    let key = SharingDataKey::ShareRecord(share_id);
    let share: CredentialShare = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::SharedDocumentNotFound)?;
    env.storage().persistent().extend_ttl(&key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
    Ok(share)
}

fn write_credential_share(env: &Env, share_id: u64, share: &CredentialShare) {
    let key = SharingDataKey::ShareRecord(share_id);
    env.storage().persistent().set(&key, share);
    env.storage().persistent().extend_ttl(&key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
}
