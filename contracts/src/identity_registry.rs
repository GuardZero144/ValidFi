use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String};

use crate::errors::Error;
use crate::upgrade;

#[contracttype]
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
            .get::<_, u64>(&(owner.clone(), document_hash.clone()))
            .unwrap_or(0u64)
            + 1;

        let identity = Identity {
            owner: owner.clone(),
            document_hash: document_hash.clone(),
            ipfs_cid,
            verification_status: false,
            created_at: env.ledger().timestamp(),
            revoked: false,
        };

        env.storage()
            .instance()
            .set(&(owner.clone(), document_hash.clone()), &identity_id);
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
    ) -> Result<(), Error> {
        let owner: Address = env
            .storage()
            .instance()
            .get(&(identity_id, "owner"))
            .ok_or(Error::IdentityNotFound)?;

        owner.require_auth();

        let mut identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .ok_or(Error::IdentityNotFound)?;

        identity.document_hash = document_hash;
        identity.ipfs_cid = ipfs_cid;

        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
        Ok(())
    }

    pub fn revoke_identity(env: &Env, identity_id: u64) -> Result<(), Error> {
        let owner: Address = env
            .storage()
            .instance()
            .get(&(identity_id, "owner"))
            .ok_or(Error::IdentityNotFound)?;

        owner.require_auth();

        let mut identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .ok_or(Error::IdentityNotFound)?;

        identity.revoked = true;

        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
        Ok(())
    }

    pub fn get_identity(env: &Env, identity_id: u64) -> Result<Identity, Error> {
        env.storage()
            .instance()
            .get(&(identity_id, "identity"))
            .ok_or(Error::IdentityNotFound)
    }

    pub fn mark_verified(env: &Env, identity_id: u64) -> Result<(), Error> {
        let mut identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .ok_or(Error::IdentityNotFound)?;

        identity.verification_status = true;

        env.storage()
            .instance()
            .set(&(identity_id, "identity"), &identity);
        Ok(())
    }

    pub fn is_verified(env: &Env, identity_id: u64) -> Result<bool, Error> {
        let identity: Identity = env
            .storage()
            .instance()
            .get(&(identity_id, "identity"))
            .ok_or(Error::IdentityNotFound)?;

        Ok(identity.verification_status && !identity.revoked)
    }

    // ── Upgradeability ────────────────────────────────────────────────────────

    /// One-time setup: designate the upgrade admin and record schema version 1.
    /// Must be called immediately after deployment; reverts if called again.
    pub fn initialize_admin(env: &Env, admin: Address) {
        admin.require_auth();
        upgrade::set_admin(env, &admin);
    }

    /// Initialize the upgrade mechanism with admin and proxy pattern.
    /// This must be called once after deployment.
    pub fn initialize_upgrade(env: &Env, admin: Address, implementation: BytesN<32>) {
        admin.require_auth();
        upgrade::initialize_upgrade(env, &admin, &implementation);
    }

    /// Schedule an upgrade with a timelock for security.
    /// The upgrade can only be executed after the timelock period expires.
    pub fn schedule_upgrade(
        env: &Env,
        admin: Address,
        new_wasm_hash: BytesN<32>,
        proposed_version: u32,
    ) {
        upgrade::schedule_upgrade(env, &admin, new_wasm_hash, proposed_version);
    }

    /// Execute a scheduled upgrade after timelock expires.
    pub fn execute_upgrade(env: &Env, admin: Address) {
        upgrade::execute_upgrade(env, &admin);
    }

    /// Cancel a pending upgrade.
    pub fn cancel_upgrade(env: &Env, admin: Address) {
        upgrade::cancel_upgrade(env, &admin);
    }

    /// Upgrade the running contract WASM to `new_wasm_hash` (legacy method).
    /// Only the upgrade admin may call this.
    ///
    /// After this call the next ledger-round executes the new code; all
    /// instance storage (identity records, permissions, …) is preserved.
    /// Run `migrate_v1_to_v2` afterwards if the new WASM introduces new
    /// storage keys.
    pub fn upgrade(env: &Env, admin: Address, new_wasm_hash: BytesN<32>) {
        upgrade::require_admin(env, &admin);
        upgrade::execute_upgrade_legacy(env, new_wasm_hash);
    }

    /// Data migration: v1 → v2.
    /// Initialises storage keys introduced in the v2 WASM that have no
    /// default value in existing instance storage.
    /// Reverts if called more than once.
    pub fn migrate_v1_to_v2(env: &Env, admin: Address) {
        upgrade::require_admin(env, &admin);
        upgrade::run_migration_v2(env);
    }

    /// Return the current schema version recorded in instance storage.
    /// Returns 1 if `initialize_admin` has not yet been called.
    pub fn get_version(env: &Env) -> u32 {
        upgrade::get_version(env)
    }

    /// Return the upgrade admin, or `None` before `initialize_admin` is called.
    pub fn get_upgrade_admin(env: &Env) -> Option<Address> {
        upgrade::get_admin(env)
    }

    /// Transfer the upgrade admin role to `new_admin`.
    /// Both `current_admin` and `new_admin` must authorise this call,
    /// preventing accidental lock-out.
    pub fn transfer_upgrade_admin(env: &Env, current_admin: Address, new_admin: Address) {
        upgrade::transfer_admin(env, &current_admin, &new_admin);
    }

    /// Return the default credential TTL (seconds) written by `migrate_v1_to_v2`,
    /// or `None` if the migration has not yet run.
    pub fn get_credential_ttl(env: &Env) -> Option<u64> {
        upgrade::get_credential_ttl(env)
    }

    /// Return `true` once `migrate_v1_to_v2` has completed successfully.
    pub fn is_migration_complete(env: &Env) -> bool {
        upgrade::is_migrated_v2(env)
    }

    // ── New Upgrade Mechanism Functions ───────────────────────────────────────

    /// Get the current proxy implementation address.
    pub fn get_implementation(env: &Env) -> Option<BytesN<32>> {
        upgrade::get_implementation(env)
    }

    /// Get pending upgrade information.
    pub fn get_pending_upgrade(env: &Env) -> Option<upgrade::PendingUpgrade> {
        upgrade::get_pending_upgrade(env)
    }

    /// Get the timelock end timestamp.
    pub fn get_timelock_end(env: &Env) -> Option<u64> {
        upgrade::get_timelock_end(env)
    }

    /// Get the current state hash.
    pub fn get_state_hash(env: &Env) -> BytesN<32> {
        upgrade::get_state_hash(env)
    }

    /// Update the state hash for consistency validation.
    pub fn update_state_hash(env: &Env, state_hash: BytesN<32>) {
        upgrade::update_state_hash(env, state_hash);
    }

    /// Get migration record for a specific version.
    pub fn get_migration_record(env: &Env, version: u32) -> Option<upgrade::MigrationRecord> {
        upgrade::get_migration_record(env, version)
    }

    /// Check if a specific migration has been executed.
    pub fn is_migration_executed(env: &Env, version: u32) -> bool {
        upgrade::is_migration_executed(env, version)
    }

    /// Emergency pause: disable upgrades temporarily.
    pub fn emergency_pause_upgrades(env: &Env, admin: Address) {
        upgrade::emergency_pause_upgrades(env, &admin);
    }

    /// Unpause upgrades after emergency.
    pub fn unpause_upgrades(env: &Env, admin: Address) {
        upgrade::unpause_upgrades(env, &admin);
    }

    /// Check if upgrades are currently paused.
    pub fn is_upgrades_paused(env: &Env) -> bool {
        upgrade::is_upgrades_paused(env)
    }
}
