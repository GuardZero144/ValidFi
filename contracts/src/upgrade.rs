use soroban_sdk::{panic_with_error, Address, BytesN, Env};

use crate::errors::Error;

const ADMIN_KEY: &str = "upg_admin";
const VERSION_KEY: &str = "upg_ver";
const MIGRATED_V2_KEY: &str = "migrated_v2";
const CRED_TTL_KEY: &str = "cred_ttl";

pub const DEFAULT_CRED_TTL_SECONDS: u64 = 2_592_000; // 30 days

pub const INITIAL_VERSION: u32 = 1;

/// Set the upgrade admin. Panics if already set.
pub fn set_admin(env: &Env, admin: &Address) {
    if env.storage().instance().has(&ADMIN_KEY) {
        panic_with_error!(env, Error::AlreadyInitialized);
    }
    env.storage().instance().set(&ADMIN_KEY, admin);
    env.storage().instance().set(&VERSION_KEY, &INITIAL_VERSION);
}

/// Verify `caller` is the stored upgrade admin and require their auth.
pub fn require_admin(env: &Env, caller: &Address) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&ADMIN_KEY)
        .unwrap_or_else(|| panic_with_error!(env, Error::Unauthorized));
    if *caller != admin {
        panic_with_error!(env, Error::Unauthorized);
    }
    caller.require_auth();
}

/// Replace the running WASM and increment the stored version.
/// `require_admin` must be called before this.
pub fn execute_upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
    let version: u32 = env
        .storage()
        .instance()
        .get(&VERSION_KEY)
        .unwrap_or(INITIAL_VERSION);
    env.deployer().update_current_contract_wasm(new_wasm_hash);
    env.storage().instance().set(&VERSION_KEY, &(version + 1));
}

/// v1 → v2 migration: initialise the default credential TTL (30 days).
/// Panics if migration has already run.
pub fn run_migration_v2(env: &Env) {
    if env.storage().instance().has(&MIGRATED_V2_KEY) {
        panic_with_error!(env, Error::AlreadyInitialized);
    }
    env.storage()
        .instance()
        .set(&CRED_TTL_KEY, &DEFAULT_CRED_TTL_SECONDS);
    env.storage().instance().set(&MIGRATED_V2_KEY, &true);
}

pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&VERSION_KEY)
        .unwrap_or(INITIAL_VERSION)
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&ADMIN_KEY)
}

pub fn is_migrated_v2(env: &Env) -> bool {
    env.storage().instance().has(&MIGRATED_V2_KEY)
}

/// Transfer upgrade admin to `new_admin`. Both parties must authorise.
/// Prevents accidentally locking out the contract by requiring the new
/// admin to co-sign.
pub fn transfer_admin(env: &Env, current_admin: &Address, new_admin: &Address) {
    require_admin(env, current_admin);
    new_admin.require_auth();
    env.storage().instance().set(&ADMIN_KEY, new_admin);
}

/// Return the default credential TTL set by the v2 migration, if run.
pub fn get_credential_ttl(env: &Env) -> Option<u64> {
    env.storage().instance().get(&CRED_TTL_KEY)
}
