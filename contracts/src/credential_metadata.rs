use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String, Symbol};

use crate::errors::Error;
use crate::events::emit_metadata_event;
use crate::storage::MetadataDataKey;
use crate::types::CredentialMetadata;

#[contract]
pub struct CredentialMetadataStore;

#[contractimpl]
impl CredentialMetadataStore {
    /// Store metadata for a credential. The caller becomes the metadata owner.
    pub fn store_metadata(env: Env, owner: Address, credential_id: BytesN<32>, metadata: String) {
        owner.require_auth();

        let record = CredentialMetadata {
            credential_id: credential_id.clone(),
            owner: owner.clone(),
            metadata,
            updated_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&MetadataDataKey::Metadata(credential_id.clone()), &record);

        emit_metadata_event(&env, owner, credential_id, Symbol::new(&env, "stored"));
    }

    /// Update existing metadata. Only the original owner may update it.
    pub fn update_metadata(
        env: Env,
        owner: Address,
        credential_id: BytesN<32>,
        metadata: String,
    ) -> Result<(), Error> {
        let mut record = Self::get_metadata(env.clone(), credential_id.clone())?;
        if record.owner != owner {
            return Err(Error::Unauthorized);
        }
        owner.require_auth();

        record.metadata = metadata;
        record.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&MetadataDataKey::Metadata(credential_id.clone()), &record);

        emit_metadata_event(&env, owner, credential_id, Symbol::new(&env, "updated"));
        Ok(())
    }

    /// Retrieve metadata for a credential.
    pub fn get_metadata(env: Env, credential_id: BytesN<32>) -> Result<CredentialMetadata, Error> {
        env.storage()
            .persistent()
            .get(&MetadataDataKey::Metadata(credential_id))
            .ok_or(Error::MetadataNotFound)
    }

    /// Delete metadata for a credential. Only the original owner may delete it.
    pub fn delete_metadata(
        env: Env,
        owner: Address,
        credential_id: BytesN<32>,
    ) -> Result<(), Error> {
        let record = Self::get_metadata(env.clone(), credential_id.clone())?;
        if record.owner != owner {
            return Err(Error::Unauthorized);
        }
        owner.require_auth();

        env.storage()
            .persistent()
            .remove(&MetadataDataKey::Metadata(credential_id.clone()));

        emit_metadata_event(&env, owner, credential_id, Symbol::new(&env, "deleted"));
        Ok(())
    }
}
