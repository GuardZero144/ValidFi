use soroban_sdk::{panic_with_error, Address, BytesN, Env, Map};

use crate::errors::Error;

// Storage keys for upgrade mechanism
const ADMIN_KEY: &str = "upg_admin";
const VERSION_KEY: &str = "upg_ver";
const PROXY_IMPLEMENTATION_KEY: &str = "proxy_impl";
const PENDING_UPGRADE_KEY: &str = "pending_upgrade";
const TIMELOCK_KEY: &str = "timelock";
const STATE_HASH_KEY: &str = "state_hash";
const MIGRATION_REGISTRY_KEY: &str = "migration_registry";

// Migration-specific keys
const MIGRATED_V2_KEY: &str = "migrated_v2";
const CRED_TTL_KEY: &str = "cred_ttl";

// Constants
pub const DEFAULT_CRED_TTL_SECONDS: u64 = 2_592_000; // 30 days
pub const INITIAL_VERSION: u32 = 1;
pub const TIMELOCK_SECONDS: u64 = 86400; // 24 hours
pub const MAX_VERSION: u32 = 1000;

// Upgrade state structure
#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct PendingUpgrade {
    pub new_wasm_hash: BytesN<32>,
    pub scheduled_at: u64,
    pub proposed_version: u32,
}

#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct MigrationRecord {
    pub version: u32,
    pub executed_at: u64,
    pub success: bool,
}

// ── Initialization ─────────────────────────────────────────────────────────────

/// Initialize the upgrade mechanism with admin and proxy pattern.
/// This must be called once after deployment.
pub fn initialize_upgrade(env: &Env, admin: &Address, implementation: &BytesN<32>) {
    if env.storage().instance().has(&ADMIN_KEY) {
        panic_with_error!(env, Error::AlreadyInitialized);
    }

    // Set admin
    env.storage().instance().set(&ADMIN_KEY, admin);
    
    // Set initial version
    env.storage().instance().set(&VERSION_KEY, &INITIAL_VERSION);
    
    // Set proxy implementation
    env.storage().instance().set(&PROXY_IMPLEMENTATION_KEY, implementation);
    
    // Initialize migration registry
    let migration_registry: Map<u32, MigrationRecord> = Map::new(env);
    env.storage().instance().set(&MIGRATION_REGISTRY_KEY, &migration_registry);
    
    // Initialize state hash for consistency checking
    env.storage().instance().set(&STATE_HASH_KEY, &BytesN::from_array(env, &[0u8; 32]));
}

/// Set the upgrade admin (legacy compatibility).
/// Panics if already set.
pub fn set_admin(env: &Env, admin: &Address) {
    if env.storage().instance().has(&ADMIN_KEY) {
        panic_with_error!(env, Error::AlreadyInitialized);
    }
    env.storage().instance().set(&ADMIN_KEY, admin);
    env.storage().instance().set(&VERSION_KEY, &INITIAL_VERSION);
}

// ── Access Control ─────────────────────────────────────────────────────────────

/// Verify `caller` is the stored upgrade admin and require their auth.
pub fn require_admin(env: &Env, caller: &Address) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&ADMIN_KEY)
        .unwrap_or_else(|| panic_with_error!(env, Error::UpgradeNotInitialized));
    if *caller != admin {
        panic_with_error!(env, Error::Unauthorized);
    }
    caller.require_auth();
}

/// Get the current upgrade admin.
pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&ADMIN_KEY)
}

/// Transfer upgrade admin to `new_admin`. Both parties must authorise.
/// Prevents accidentally locking out the contract by requiring the new
/// admin to co-sign.
pub fn transfer_admin(env: &Env, current_admin: &Address, new_admin: &Address) {
    require_admin(env, current_admin);
    new_admin.require_auth();
    env.storage().instance().set(&ADMIN_KEY, new_admin);
}

// ── Proxy Pattern ───────────────────────────────────────────────────────────────

/// Get the current proxy implementation address.
pub fn get_implementation(env: &Env) -> Option<BytesN<32>> {
    env.storage().instance().get(&PROXY_IMPLEMENTATION_KEY)
}

/// Update the proxy implementation (internal use only).
/// Must be called through the upgrade process.
fn set_implementation(env: &Env, implementation: &BytesN<32>) {
    env.storage().instance().set(&PROXY_IMPLEMENTATION_KEY, implementation);
}

// ── Upgrade Mechanism with Timelock ─────────────────────────────────────────────

/// Replace the running WASM and increment the stored version (legacy method).
/// `require_admin` must be called before this.
pub fn execute_upgrade_legacy(env: &Env, new_wasm_hash: BytesN<32>) {
    let version: u32 = env
        .storage()
        .instance()
        .get(&VERSION_KEY)
        .unwrap_or(INITIAL_VERSION);
    // Note: In production, this would deploy the actual WASM
    // For testing, we skip the actual deployment and just update the version
    #[cfg(not(test))]
    env.deployer().update_current_contract_wasm(new_wasm_hash);
    env.storage().instance().set(&VERSION_KEY, &(version + 1));
}

/// Schedule an upgrade with a timelock for security.
/// The upgrade can only be executed after the timelock period expires.
pub fn schedule_upgrade(env: &Env, admin: &Address, new_wasm_hash: BytesN<32>, proposed_version: u32) {
    require_admin(env, admin);
    
    // Validate proposed version
    let current_version = get_version(env);
    if proposed_version <= current_version {
        panic_with_error!(env, Error::VersionMismatch);
    }
    if proposed_version > MAX_VERSION {
        panic_with_error!(env, Error::VersionMismatch);
    }
    
    // Validate WASM hash is not zero
    if new_wasm_hash == BytesN::from_array(env, &[0u8; 32]) {
        panic_with_error!(env, Error::InvalidUpgradeHash);
    }
    
    // Create pending upgrade
    let pending_upgrade = PendingUpgrade {
        new_wasm_hash,
        scheduled_at: env.ledger().timestamp(),
        proposed_version,
    };
    
    // Set timelock
    env.storage().instance().set(&TIMELOCK_KEY, &env.ledger().timestamp());
    
    // Store pending upgrade
    env.storage().instance().set(&PENDING_UPGRADE_KEY, &pending_upgrade);
}

/// Execute a scheduled upgrade after timelock expires.
pub fn execute_upgrade(env: &Env, admin: &Address) {
    require_admin(env, admin);
    
    // Check if there's a pending upgrade
    let pending_upgrade: PendingUpgrade = env
        .storage()
        .instance()
        .get(&PENDING_UPGRADE_KEY)
        .unwrap_or_else(|| panic_with_error!(env, Error::UpgradeNotInitialized));
    
    // Check timelock
    let timelock_set: u64 = env
        .storage()
        .instance()
        .get(&TIMELOCK_KEY)
        .unwrap_or_else(|| panic_with_error!(env, Error::UpgradeNotInitialized));
    
    let current_time = env.ledger().timestamp();
    if current_time < timelock_set + TIMELOCK_SECONDS {
        panic_with_error!(env, Error::UpgradeTimelockNotExpired);
    }
    
    // Validate state consistency before upgrade
    if !validate_state_consistency(env) {
        panic_with_error!(env, Error::StateInconsistency);
    }
    
    // Execute upgrade
    let _current_version = get_version(env);
    // Note: In production, this would deploy the actual WASM
    // For testing, we skip the actual deployment and just update the version
    #[cfg(not(test))]
    env.deployer().update_current_contract_wasm(pending_upgrade.new_wasm_hash.clone());
    env.storage().instance().set(&VERSION_KEY, &pending_upgrade.proposed_version);
    
    // Update proxy implementation
    set_implementation(env, &pending_upgrade.new_wasm_hash);
    
    // Clear pending upgrade
    env.storage().instance().remove(&PENDING_UPGRADE_KEY);
    env.storage().instance().remove(&TIMELOCK_KEY);
    
    // Record successful upgrade in migration registry
    record_migration(env, pending_upgrade.proposed_version, true);
}

/// Cancel a pending upgrade.
pub fn cancel_upgrade(env: &Env, admin: &Address) {
    require_admin(env, admin);
    
    if !env.storage().instance().has(&PENDING_UPGRADE_KEY) {
        panic_with_error!(env, Error::UpgradeNotInitialized);
    }
    
    env.storage().instance().remove(&PENDING_UPGRADE_KEY);
    env.storage().instance().remove(&TIMELOCK_KEY);
}

/// Get pending upgrade information.
pub fn get_pending_upgrade(env: &Env) -> Option<PendingUpgrade> {
    env.storage().instance().get(&PENDING_UPGRADE_KEY)
}

/// Get the timelock end timestamp.
pub fn get_timelock_end(env: &Env) -> Option<u64> {
    env.storage()
        .instance()
        .get(&TIMELOCK_KEY)
        .map(|timelock_start: u64| timelock_start + TIMELOCK_SECONDS)
}

// ── State Consistency ───────────────────────────────────────────────────────────

/// Calculate and store state hash for consistency validation.
pub fn update_state_hash(env: &Env, state_hash: BytesN<32>) {
    env.storage().instance().set(&STATE_HASH_KEY, &state_hash);
}

/// Get the current state hash.
pub fn get_state_hash(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&STATE_HASH_KEY)
        .unwrap_or_else(|| BytesN::from_array(env, &[0u8; 32]))
}

/// Validate state consistency before upgrade.
/// In a production environment, this would compute a hash of all critical storage.
pub fn validate_state_consistency(env: &Env) -> bool {
    // Basic validation: ensure critical keys exist
    let has_admin = env.storage().instance().has(&ADMIN_KEY);
    let has_version = env.storage().instance().has(&VERSION_KEY);
    let has_implementation = env.storage().instance().has(&PROXY_IMPLEMENTATION_KEY);
    
    has_admin && has_version && has_implementation
}

// ── Data Migration ─────────────────────────────────────────────────────────────

/// v1 → v2 migration: initialise the default credential TTL (30 days).
/// Panics if migration has already run.
pub fn run_migration_v2(env: &Env) {
    if env.storage().instance().has(&MIGRATED_V2_KEY) {
        panic_with_error!(env, Error::MigrationAlreadyRun);
    }
    
    env.storage()
        .instance()
        .set(&CRED_TTL_KEY, &DEFAULT_CRED_TTL_SECONDS);
    env.storage().instance().set(&MIGRATED_V2_KEY, &true);
    
    // Record migration
    record_migration(env, 2, true);
}

/// Record a migration in the registry.
fn record_migration(env: &Env, version: u32, success: bool) {
    let mut migration_registry: Map<u32, MigrationRecord> = env
        .storage()
        .instance()
        .get(&MIGRATION_REGISTRY_KEY)
        .unwrap_or_else(|| Map::new(env));
    
    let record = MigrationRecord {
        version,
        executed_at: env.ledger().timestamp(),
        success,
    };
    
    migration_registry.set(version, record);
    env.storage().instance().set(&MIGRATION_REGISTRY_KEY, &migration_registry);
}

/// Get migration record for a specific version.
pub fn get_migration_record(env: &Env, version: u32) -> Option<MigrationRecord> {
    let migration_registry: Map<u32, MigrationRecord> = env
        .storage()
        .instance()
        .get(&MIGRATION_REGISTRY_KEY)
        .unwrap_or_else(|| Map::new(env));
    
    migration_registry.get(version)
}

/// Check if a specific migration has been executed.
pub fn is_migration_executed(env: &Env, version: u32) -> bool {
    get_migration_record(env, version).is_some()
}

// ── Version Management ─────────────────────────────────────────────────────────

/// Get the current contract version.
pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&VERSION_KEY)
        .unwrap_or(INITIAL_VERSION)
}

/// Check if v2 migration has been run.
pub fn is_migrated_v2(env: &Env) -> bool {
    env.storage().instance().has(&MIGRATED_V2_KEY)
}

/// Return the default credential TTL set by the v2 migration, if run.
pub fn get_credential_ttl(env: &Env) -> Option<u64> {
    env.storage().instance().get(&CRED_TTL_KEY)
}

// ── Security Measures ───────────────────────────────────────────────────────────

/// Emergency pause: disable upgrades temporarily.
/// This is a safety mechanism for critical situations.
pub fn emergency_pause_upgrades(env: &Env, admin: &Address) {
    require_admin(env, admin);
    env.storage().instance().set(&TIMELOCK_KEY, &u64::MAX);
}

/// Unpause upgrades after emergency.
pub fn unpause_upgrades(env: &Env, admin: &Address) {
    require_admin(env, admin);
    let current_timelock: u64 = env
        .storage()
        .instance()
        .get(&TIMELOCK_KEY)
        .unwrap_or(0);
    
    if current_timelock != u64::MAX {
        panic_with_error!(env, Error::Unauthorized);
    }
    
    env.storage().instance().remove(&TIMELOCK_KEY);
}

/// Check if upgrades are currently paused.
pub fn is_upgrades_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&TIMELOCK_KEY)
        .map(|timelock: u64| timelock == u64::MAX)
        .unwrap_or(false)
}
