//! Registry for the public keys of health-credential issuers.
//!
//! An authority owns its entry: registration, key rotation, and status updates
//! all require authorization from the authority address. Credential consumers
//! can use [`HealthAuthority::validate_authority_signature`] to verify an
//! Ed25519 signature against the currently registered key.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env};

use crate::errors::Error;

/// Public, on-chain metadata for a health authority.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Authority {
    /// The account that controls this authority's registry entry.
    pub address: Address,
    /// The authority's Ed25519 verification key.
    pub public_key: BytesN<32>,
    /// Whether signatures from this authority may currently be trusted.
    pub is_active: bool,
    pub registered_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub enum DataKey {
    Authority(Address),
}

// Persistent authority entries are refreshed to roughly one year whenever
// they are read or written. This avoids an active issuer being archived while
// keeping the registry scalable: every operation touches only one entry.
const PERSISTENT_TTL_THRESHOLD: u32 = 1_051_200; // ~61 days
const PERSISTENT_TTL_EXTEND: u32 = 6_307_200; // ~365 days

#[contract]
pub struct HealthAuthority;

#[contractimpl]
impl HealthAuthority {
    /// Register an authority and its Ed25519 public key.
    ///
    /// The authority must authorise registration, preventing a third party
    /// from registering a key for an address it does not control.
    pub fn register_authority(
        env: &Env,
        authority: Address,
        public_key: BytesN<32>,
    ) -> Result<(), Error> {
        authority.require_auth();

        let key = DataKey::Authority(authority.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AuthorityAlreadyRegistered);
        }

        let now = env.ledger().timestamp();
        let record = Authority {
            address: authority,
            public_key,
            is_active: true,
            registered_at: now,
            updated_at: now,
        };

        write_authority(env, &key, &record);
        Ok(())
    }

    /// Return an authority's public registry record.
    pub fn get_authority(env: &Env, authority: Address) -> Result<Authority, Error> {
        read_authority(env, authority)
    }

    /// Return an authority's current Ed25519 public key.
    pub fn get_authority_public_key(env: &Env, authority: Address) -> Result<BytesN<32>, Error> {
        Ok(read_authority(env, authority)?.public_key)
    }

    /// Rotate an authority's signing key.
    pub fn update_authority_public_key(
        env: &Env,
        authority: Address,
        public_key: BytesN<32>,
    ) -> Result<(), Error> {
        authority.require_auth();

        let key = DataKey::Authority(authority.clone());
        let mut record = read_authority_by_key(env, &key)?;
        record.public_key = public_key;
        record.updated_at = env.ledger().timestamp();

        write_authority(env, &key, &record);
        Ok(())
    }

    /// Activate or suspend an authority. Only the authority can change its
    /// own status.
    pub fn set_authority_status(
        env: &Env,
        authority: Address,
        is_active: bool,
    ) -> Result<(), Error> {
        authority.require_auth();

        let key = DataKey::Authority(authority.clone());
        let mut record = read_authority_by_key(env, &key)?;
        record.is_active = is_active;
        record.updated_at = env.ledger().timestamp();

        write_authority(env, &key, &record);
        Ok(())
    }

    /// Convenience operation for suspending an authority.
    pub fn deactivate_authority(env: &Env, authority: Address) -> Result<(), Error> {
        Self::set_authority_status(env, authority, false)
    }

    /// Convenience operation for restoring a suspended authority.
    pub fn activate_authority(env: &Env, authority: Address) -> Result<(), Error> {
        Self::set_authority_status(env, authority, true)
    }

    /// Returns `true` only when an authority is registered and active.
    ///
    /// This deliberately returns `false` for unknown addresses so consumers
    /// can use it as a safe, non-panicking trust check.
    pub fn verify_authority(env: &Env, authority: Address) -> bool {
        let key = DataKey::Authority(authority);
        match env.storage().persistent().get::<_, Authority>(&key) {
            Some(record) => {
                bump_persistent(env, &key);
                record.is_active
            }
            None => false,
        }
    }

    /// Alias for callers that want to check status without fetching metadata.
    pub fn is_authority_active(env: &Env, authority: Address) -> bool {
        Self::verify_authority(env, authority)
    }

    /// Validate an Ed25519 signature made by an active authority.
    ///
    /// Soroban's crypto host function aborts the invocation when the signature
    /// is malformed or does not match the supplied message/key. A successful
    /// return therefore means the signature is valid. Unknown and inactive
    /// authorities instead return a typed contract error.
    pub fn validate_authority_signature(
        env: &Env,
        authority: Address,
        message: Bytes,
        signature: BytesN<64>,
    ) -> Result<bool, Error> {
        let record = read_authority(env, authority)?;
        if !record.is_active {
            return Err(Error::AuthorityInactive);
        }

        env.crypto()
            .ed25519_verify(&record.public_key, &message, &signature);
        Ok(true)
    }

    /// Compatibility-friendly name for signature validation.
    pub fn verify_authority_signature(
        env: &Env,
        authority: Address,
        message: Bytes,
        signature: BytesN<64>,
    ) -> Result<bool, Error> {
        Self::validate_authority_signature(env, authority, message, signature)
    }
}

fn read_authority(env: &Env, authority: Address) -> Result<Authority, Error> {
    let key = DataKey::Authority(authority);
    read_authority_by_key(env, &key)
}

fn read_authority_by_key(env: &Env, key: &DataKey) -> Result<Authority, Error> {
    let record = env
        .storage()
        .persistent()
        .get(key)
        .ok_or(Error::AuthorityNotFound)?;
    bump_persistent(env, key);
    Ok(record)
}

fn write_authority(env: &Env, key: &DataKey, authority: &Authority) {
    env.storage().persistent().set(key, authority);
    bump_persistent(env, key);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
}
