extern crate std;

use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env};

use crate::identity_registry::{IdentityRegistry, IdentityRegistryClient};

// ── helpers ──────────────────────────────────────────────────────────────────

fn setup() -> (Env, IdentityRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, IdentityRegistry {});
    let client = IdentityRegistryClient::new(&env, &contract_id);
    (env, client, admin)
}

// ── initialize_admin ─────────────────────────────────────────────────────────

#[test]
fn test_initialize_admin_sets_admin() {
    let (_, client, admin) = setup();

    assert_eq!(client.get_upgrade_admin(), None);

    client.initialize_admin(&admin);

    assert_eq!(client.get_upgrade_admin(), Some(admin));
}

#[test]
fn test_initialize_admin_sets_version_to_one() {
    let (_, client, admin) = setup();

    // Default before init
    assert_eq!(client.get_version(), 1u32);

    client.initialize_admin(&admin);

    assert_eq!(client.get_version(), 1u32);
}

#[test]
#[should_panic]
fn test_initialize_admin_twice_panics() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    client.initialize_admin(&admin); // must panic with AlreadyInitialized
}

// ── initialize_upgrade (new proxy pattern) ─────────────────────────────────

#[test]
fn test_initialize_upgrade_sets_admin_and_implementation() {
    let (env, client, admin) = setup();
    let implementation: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);

    assert_eq!(client.get_upgrade_admin(), None);
    assert_eq!(client.get_implementation(), None);

    client.initialize_upgrade(&admin, &implementation);

    assert_eq!(client.get_upgrade_admin(), Some(admin));
    assert_eq!(client.get_implementation(), Some(implementation));
}

#[test]
fn test_initialize_upgrade_sets_version_to_one() {
    let (env, client, admin) = setup();
    let implementation: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);

    client.initialize_upgrade(&admin, &implementation);

    assert_eq!(client.get_version(), 1u32);
}

#[test]
#[should_panic]
fn test_initialize_upgrade_twice_panics() {
    let (env, client, admin) = setup();
    let implementation: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize_upgrade(&admin, &implementation);
    client.initialize_upgrade(&admin, &implementation); // must panic
}

// ── get_version / get_upgrade_admin ──────────────────────────────────────────

#[test]
fn test_get_upgrade_admin_none_before_init() {
    let (_, client, _) = setup();
    assert_eq!(client.get_upgrade_admin(), None);
}

#[test]
fn test_get_version_default_is_one() {
    let (_, client, _) = setup();
    assert_eq!(client.get_version(), 1u32);
}

// ── upgrade auth guards (no valid WASM hash needed — errors before deployer) ──

#[test]
#[should_panic]
fn test_upgrade_panics_before_admin_initialized() {
    let (env, client, _) = setup();
    let dummy_hash: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    let random = Address::generate(&env);
    // No admin set → must panic with Unauthorized
    client.upgrade(&random, &dummy_hash);
}

#[test]
#[should_panic]
fn test_upgrade_panics_for_non_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    let dummy_hash: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    // Wrong caller → must panic with Unauthorized
    client.upgrade(&attacker, &dummy_hash);
}

// ── migrate_v1_to_v2 ─────────────────────────────────────────────────────────

#[test]
fn test_migrate_v1_to_v2_runs_successfully() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    // Must complete without panic
    client.migrate_v1_to_v2(&admin);
}

#[test]
#[should_panic]
fn test_migrate_v1_to_v2_twice_panics() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&admin);
    client.migrate_v1_to_v2(&admin); // must panic with AlreadyInitialized
}

#[test]
#[should_panic]
fn test_migrate_requires_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&attacker); // must panic with Unauthorized
}

#[test]
#[should_panic]
fn test_migrate_panics_before_admin_initialized() {
    let (_, client, admin) = setup();
    // No initialize_admin call → must panic
    client.migrate_v1_to_v2(&admin);
}

// ── transfer_upgrade_admin ───────────────────────────────────────────────────

#[test]
fn test_transfer_admin_updates_admin() {
    let (env, client, admin) = setup();
    let new_admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.transfer_upgrade_admin(&admin, &new_admin);
    assert_eq!(client.get_upgrade_admin(), Some(new_admin));
}

#[test]
fn test_new_admin_can_migrate_after_transfer() {
    let (env, client, admin) = setup();
    let new_admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.transfer_upgrade_admin(&admin, &new_admin);
    // new admin should be able to trigger migration without panic
    client.migrate_v1_to_v2(&new_admin);
    assert!(client.is_migration_complete());
}

#[test]
#[should_panic]
fn test_old_admin_cannot_migrate_after_transfer() {
    let (env, client, admin) = setup();
    let new_admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.transfer_upgrade_admin(&admin, &new_admin);
    // old admin is no longer authorised
    client.migrate_v1_to_v2(&admin);
}

#[test]
#[should_panic]
fn test_transfer_admin_non_admin_panics() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    let new_admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.transfer_upgrade_admin(&attacker, &new_admin);
}

#[test]
#[should_panic]
fn test_transfer_admin_before_init_panics() {
    let (env, client, _) = setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.transfer_upgrade_admin(&a, &b);
}

// ── get_credential_ttl ───────────────────────────────────────────────────────

#[test]
fn test_get_credential_ttl_none_before_migration() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    assert_eq!(client.get_credential_ttl(), None);
}

#[test]
fn test_get_credential_ttl_set_after_migration() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&admin);
    assert_eq!(client.get_credential_ttl(), Some(2_592_000u64));
}

// ── is_migration_complete ────────────────────────────────────────────────────

#[test]
fn test_is_migration_complete_false_before_migration() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    assert!(!client.is_migration_complete());
}

#[test]
fn test_is_migration_complete_true_after_migration() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&admin);
    assert!(client.is_migration_complete());
}

// ── schedule_upgrade (new timelock mechanism) ───────────────────────────────

#[test]
fn test_schedule_upgrade_creates_pending_upgrade() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    let pending = client.get_pending_upgrade();
    assert!(pending.is_some());
    let pending = pending.unwrap();
    assert_eq!(pending.proposed_version, 2);
}

#[test]
#[should_panic]
fn test_schedule_upgrade_panics_for_non_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&attacker, &new_wasm_hash, &2);
}

#[test]
#[should_panic]
fn test_schedule_upgrade_panics_for_invalid_version() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &1); // Same as current
}

#[test]
#[should_panic]
fn test_schedule_upgrade_panics_for_zero_hash() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let zero_hash: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    client.schedule_upgrade(&admin, &zero_hash, &2);
}

#[test]
fn test_get_timelock_end_returns_timestamp() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    let timelock_end = client.get_timelock_end();
    assert!(timelock_end.is_some());
}

// ── execute_upgrade (new timelock mechanism) ─────────────────────────────────

#[test]
fn test_execute_upgrade_after_timelock() {
    let (env, client, admin) = setup();
    let initial_implementation: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize_upgrade(&admin, &initial_implementation);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    // Advance time past timelock
    env.ledger().set_timestamp(env.ledger().timestamp() + 100000);
    
    client.execute_upgrade(&admin);
    
    assert_eq!(client.get_version(), 2);
    assert!(client.get_pending_upgrade().is_none());
}

#[test]
#[should_panic]
fn test_execute_upgrade_panics_before_timelock() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    // Try to execute immediately (before timelock expires)
    client.execute_upgrade(&admin);
}

#[test]
#[should_panic]
fn test_execute_upgrade_panics_for_non_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    env.ledger().set_timestamp(env.ledger().timestamp() + 100000);
    
    client.execute_upgrade(&attacker);
}

// ── cancel_upgrade ───────────────────────────────────────────────────────────

#[test]
fn test_cancel_upgrade_removes_pending_upgrade() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    assert!(client.get_pending_upgrade().is_some());
    
    client.cancel_upgrade(&admin);
    
    assert!(client.get_pending_upgrade().is_none());
}

#[test]
#[should_panic]
fn test_cancel_upgrade_panics_for_non_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    
    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    client.cancel_upgrade(&attacker);
}

// ── state consistency ───────────────────────────────────────────────────────

#[test]
fn test_update_state_hash() {
    let (env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    let state_hash: BytesN<32> = BytesN::from_array(&env, &[5u8; 32]);
    client.update_state_hash(&state_hash);
    
    assert_eq!(client.get_state_hash(), state_hash);
}

#[test]
fn test_get_state_hash_returns_zero_before_update() {
    let (env, client, admin) = setup();
    client.initialize_upgrade(&admin, &BytesN::from_array(&env, &[1u8; 32]));
    
    let zero_hash = BytesN::from_array(&env, &[0u8; 32]);
    assert_eq!(client.get_state_hash(), zero_hash);
}

// ── migration registry ───────────────────────────────────────────────────────

#[test]
fn test_migration_record_created_after_migration() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    
    client.migrate_v1_to_v2(&admin);
    
    let record = client.get_migration_record(&2);
    assert!(record.is_some());
    let record = record.unwrap();
    assert_eq!(record.version, 2);
    assert!(record.success);
}

#[test]
fn test_is_migration_executed() {
    let (_, client, admin) = setup();
    client.initialize_admin(&admin);
    
    assert!(!client.is_migration_executed(&2));
    
    client.migrate_v1_to_v2(&admin);
    
    assert!(client.is_migration_executed(&2));
}

// ── emergency pause ──────────────────────────────────────────────────────────

#[test]
fn test_emergency_pause_upgrades() {
    let (_env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    assert!(!client.is_upgrades_paused());
    
    client.emergency_pause_upgrades(&admin);
    
    assert!(client.is_upgrades_paused());
}

#[test]
fn test_unpause_upgrades() {
    let (_env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    client.emergency_pause_upgrades(&admin);
    assert!(client.is_upgrades_paused());
    
    client.unpause_upgrades(&admin);
    assert!(!client.is_upgrades_paused());
}

#[test]
#[should_panic]
fn test_emergency_pause_panics_for_non_admin() {
    let (env, client, admin) = setup();
    let attacker = Address::generate(&env);
    client.initialize_admin(&admin);
    
    client.emergency_pause_upgrades(&attacker);
}

#[test]
#[should_panic]
fn test_unpause_panics_when_not_paused() {
    let (_env, client, admin) = setup();
    client.initialize_admin(&admin);
    
    client.unpause_upgrades(&admin);
}

// ── upgrade + identity data coexistence ──────────────────────────────────────

#[test]
fn test_existing_identities_preserved_after_admin_init() {
    use soroban_sdk::{BytesN as BN, String};

    let (env, client, admin) = setup();

    // Register identity before setting upgrade admin
    let owner = Address::generate(&env);
    let doc_hash: BN<32> = BN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmTest");

    let id = client.register_identity(&owner, &doc_hash, &cid);
    let identity = client.get_identity(&id);
    assert_eq!(identity.owner, owner);
    assert!(!identity.revoked);

    // Init upgrade admin — must not disturb identity records
    client.initialize_admin(&admin);

    let identity_after = client.get_identity(&id);
    assert_eq!(identity_after.owner, owner);
    assert!(!identity_after.revoked);
    assert!(!identity_after.verification_status);
}

#[test]
fn test_migration_does_not_corrupt_identity_records() {
    use soroban_sdk::{BytesN as BN, String};

    let (env, client, admin) = setup();

    let owner = Address::generate(&env);
    let doc_hash: BN<32> = BN::from_array(&env, &[2u8; 32]);
    let cid = String::from_str(&env, "QmMigTest");

    let id = client.register_identity(&owner, &doc_hash, &cid);

    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&admin);

    // Identity record is intact
    let identity = client.get_identity(&id);
    assert_eq!(identity.ipfs_cid, cid);
    assert!(!identity.verification_status);

    // Version remains 1 (upgrade() was not called — only migration)
    assert_eq!(client.get_version(), 1u32);
}

#[test]
fn test_verified_identity_survives_migration() {
    use soroban_sdk::{BytesN as BN, String};

    let (env, client, admin) = setup();

    let owner = Address::generate(&env);
    let doc_hash: BN<32> = BN::from_array(&env, &[3u8; 32]);
    let cid = String::from_str(&env, "QmVerTest");

    let id = client.register_identity(&owner, &doc_hash, &cid);
    client.mark_verified(&id);

    assert!(client.is_verified(&id));

    client.initialize_admin(&admin);
    client.migrate_v1_to_v2(&admin);

    // Verified flag must survive migration
    assert!(client.is_verified(&id));
}

#[test]
fn test_identity_survives_upgrade_with_timelock() {
    use soroban_sdk::{BytesN as BN, String};

    let (env, client, admin) = setup();

    let owner = Address::generate(&env);
    let doc_hash: BN<32> = BN::from_array(&env, &[4u8; 32]);
    let cid = String::from_str(&env, "QmUpgradeTest");

    let id = client.register_identity(&owner, &doc_hash, &cid);
    client.initialize_upgrade(&admin, &BytesN::from_array(&env, &[1u8; 32]));

    let new_wasm_hash: BytesN<32> = BytesN::from_array(&env, &[5u8; 32]);
    client.schedule_upgrade(&admin, &new_wasm_hash, &2);
    
    env.ledger().set_timestamp(env.ledger().timestamp() + 100000);
    client.execute_upgrade(&admin);

    // Identity record should survive upgrade
    let identity = client.get_identity(&id);
    assert_eq!(identity.ipfs_cid, cid);
    assert_eq!(client.get_version(), 2);
}
