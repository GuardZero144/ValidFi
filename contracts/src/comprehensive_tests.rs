#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Bytes, BytesN, Env, String, Symbol, Vec,
};

use crate::{
    access_control::{AccessControl, AccessControlClient},
    auditing::{Auditing, AuditingClient},
    data_sharing::{DataSharing, DataSharingClient},
    errors::Error,
    identity_registry::{IdentityRegistry, IdentityRegistryClient},
    verification::{Verification, VerificationClient},
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP AND HELPERS
// ─────────────────────────────────────────────────────────────────────────────

fn setup_all_contracts(
) -> (
    Env,
    IdentityRegistryClient<'static>,
    VerificationClient<'static>,
    AccessControlClient<'static>,
    DataSharingClient<'static>,
    AuditingClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let identity_id = env.register_contract(None, IdentityRegistry {});
    let identity = IdentityRegistryClient::new(&env, &identity_id);

    let verification_id = env.register_contract(None, Verification {});
    let verification = VerificationClient::new(&env, &verification_id);

    let access_id = env.register_contract(None, AccessControl {});
    let access = AccessControlClient::new(&env, &access_id);

    let sharing_id = env.register_contract(None, DataSharing {});
    let sharing = DataSharingClient::new(&env, &sharing_id);

    let auditing_id = env.register_contract(None, Auditing {});
    let auditing = AuditingClient::new(&env, &auditing_id);

    (env, identity, verification, access, sharing, auditing)
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS - ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_grant_access_creates_permission() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    let perm_id = access.grant_access(&grantor, &grantee, &1, &3600);
    assert!(perm_id > 0);

    let perm = access.get_permission(&perm_id);
    assert_eq!(perm.grantor, grantor);
    assert_eq!(perm.grantee, grantee);
    assert_eq!(perm.resource_id, 1);
    assert!(perm.is_active);
}

#[test]
fn test_revoke_access_deactivates_permission() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    let perm_id = access.grant_access(&grantor, &grantee, &1, &3600);
    access.revoke_access(&perm_id);

    let perm = access.get_permission(&perm_id);
    assert!(!perm.is_active);
}

#[test]
fn test_check_access_returns_false_when_inactive() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    let perm_id = access.grant_access(&grantor, &grantee, &1, &3600);
    assert!(access.check_access(&grantee, &1));

    access.revoke_access(&perm_id);
    assert!(!access.check_access(&grantee, &1));
}

#[test]
fn test_check_access_returns_false_after_expiry() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);
    let start_ts = env.ledger().timestamp();

    access.grant_access(&grantor, &grantee, &1, &100);
    assert!(access.check_access(&grantee, &1));

    env.ledger().set_timestamp(start_ts + 200);
    assert!(!access.check_access(&grantee, &1));
}

#[test]
fn test_extend_access_increases_expiry() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);
    let start_ts = env.ledger().timestamp();

    let perm_id = access.grant_access(&grantor, &grantee, &1, &100);
    let perm_before = access.get_permission(&perm_id);

    access.extend_access(&perm_id, &100);
    let perm_after = access.get_permission(&perm_id);

    assert!(perm_after.access_expiry > perm_before.access_expiry);
}

#[test]
fn test_grant_access_multiple_resources() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    let perm_id1 = access.grant_access(&grantor, &grantee, &1, &3600);
    let perm_id2 = access.grant_access(&grantor, &grantee, &2, &3600);

    assert!(access.check_access(&grantee, &1));
    assert!(access.check_access(&grantee, &2));
    assert_ne!(perm_id1, perm_id2);
}

#[test]
fn test_access_permission_timestamp_recorded() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);
    let start_ts = env.ledger().timestamp();

    let perm_id = access.grant_access(&grantor, &grantee, &1, &3600);
    let perm = access.get_permission(&perm_id);

    assert_eq!(perm.granted_at, start_ts);
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS - VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_submit_proof_creates_record() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    assert!(v_id > 0);

    let record = verification.get_verification(&v_id);
    assert_eq!(record.identity_id, 1);
    assert_eq!(record.verifier, verifier);
    assert_eq!(record.status, String::from_str(&env, "pending"));
    assert!(!record.revoked);
}

#[test]
fn test_approve_verification_updates_status() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    verification.approve_verification(&v_id);

    let record = verification.get_verification(&v_id);
    assert_eq!(record.status, String::from_str(&env, "approved"));
}

#[test]
fn test_reject_verification_updates_status() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    verification.reject_verification(&v_id, &String::from_str(&env, "invalid"));

    let record = verification.get_verification(&v_id);
    assert_eq!(record.status, String::from_str(&env, "rejected"));
}

#[test]
fn test_get_verification_by_identity() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    let found_id = verification.get_verification_by_identity(&1);

    assert_eq!(found_id, v_id);
}

#[test]
fn test_revoke_verification_sets_flag() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    verification.revoke_verification(&v_id, &String::from_str(&env, "fraud"));

    assert!(verification.is_verification_revoked(&v_id));
}

#[test]
fn test_is_verification_valid_requires_approved_and_not_revoked() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    assert!(!verification.is_verification_valid(&v_id));

    verification.approve_verification(&v_id);
    assert!(verification.is_verification_valid(&v_id));

    verification.revoke_verification(&v_id, &String::from_str(&env, "fraud"));
    assert!(!verification.is_verification_valid(&v_id));
}

#[test]
fn test_get_revocation_status() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    let (revoked, _, _) = verification.get_revocation_status(&v_id);
    assert!(!revoked);

    verification.revoke_verification(&v_id, &String::from_str(&env, "fraud"));
    let (revoked, _, reason) = verification.get_revocation_status(&v_id);
    assert!(revoked);
    assert_eq!(reason, String::from_str(&env, "fraud"));
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS - IDENTITY REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_register_identity_creates_record() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmTest");

    let id = identity.register_identity(&owner, &doc_hash, &cid);
    assert!(id > 0);

    let record = identity.get_identity(&id);
    assert_eq!(record.owner, owner);
    assert_eq!(record.document_hash, doc_hash);
    assert_eq!(record.ipfs_cid, cid);
}

#[test]
fn test_update_identity_changes_fields() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmOriginal");

    let id = identity.register_identity(&owner, &doc_hash, &cid);

    let new_hash = BytesN::from_array(&env, &[2u8; 32]);
    let new_cid = String::from_str(&env, "QmUpdated");
    identity.update_identity(&id, &new_hash, &new_cid);

    let record = identity.get_identity(&id);
    assert_eq!(record.document_hash, new_hash);
    assert_eq!(record.ipfs_cid, new_cid);
}

#[test]
fn test_revoke_identity_marks_revoked() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmRevoke");

    let id = identity.register_identity(&owner, &doc_hash, &cid);
    identity.revoke_identity(&id);

    let record = identity.get_identity(&id);
    assert!(record.revoked);
}

#[test]
fn test_mark_verified_updates_status() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmVerify");

    let id = identity.register_identity(&owner, &doc_hash, &cid);
    assert!(!identity.is_verified(&id));

    identity.mark_verified(&id);
    assert!(identity.is_verified(&id));
}

#[test]
fn test_is_verified_returns_false_when_revoked() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmRevVer");

    let id = identity.register_identity(&owner, &doc_hash, &cid);
    identity.mark_verified(&id);
    assert!(identity.is_verified(&id));

    identity.revoke_identity(&id);
    assert!(!identity.is_verified(&id));
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS - DATA SHARING
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_share_document_creates_record() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let encrypted_key = Bytes::new(&env);

    let share_id = sharing.share_document(&owner, &recipient, &doc_hash, &encrypted_key, &3600);
    assert!(share_id > 0);

    let shared = sharing.get_shared_document(&share_id);
    assert_eq!(shared.owner, owner);
    assert_eq!(shared.recipient, recipient);
}

#[test]
fn test_revoke_shared_document_deactivates() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let encrypted_key = Bytes::new(&env);

    let share_id = sharing.share_document(&owner, &recipient, &doc_hash, &encrypted_key, &3600);
    sharing.revoke_shared_document(&share_id);

    let shared = sharing.get_shared_document(&share_id);
    assert!(!shared.is_active);
}

#[test]
fn test_get_shared_document_by_parties() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let encrypted_key = Bytes::new(&env);

    let share_id = sharing.share_document(&owner, &recipient, &doc_hash, &encrypted_key, &3600);
    let found_id = sharing.get_shared_document_by_parties(&owner, &recipient, &doc_hash);

    assert_eq!(share_id, found_id);
}

#[test]
fn test_is_share_active_checks_status_and_expiry() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let encrypted_key = Bytes::new(&env);
    let start_ts = env.ledger().timestamp();

    let share_id = sharing.share_document(&owner, &recipient, &doc_hash, &encrypted_key, &100);
    assert!(sharing.is_share_active(&share_id));

    env.ledger().set_timestamp(start_ts + 200);
    assert!(!sharing.is_share_active(&share_id));
}

#[test]
fn test_extend_share_increases_expiry() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let encrypted_key = Bytes::new(&env);

    let share_id = sharing.share_document(&owner, &recipient, &doc_hash, &encrypted_key, &100);
    let before = sharing.get_shared_document(&share_id);

    sharing.extend_share(&share_id, &200);
    let after = sharing.get_shared_document(&share_id);

    assert!(after.access_expiry > before.access_expiry);
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS - AUDITING
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_log_audit_event_creates_record() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[1u8; 32]);

    auditing.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "test"),
    );

    let report = auditing.get_audit_report(&credential_id);
    assert_eq!(report.len(), 1);
}

#[test]
fn test_get_audit_report_returns_all_events() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[1u8; 32]);

    auditing.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "event1"),
    );
    auditing.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "verified"),
        &String::from_str(&env, "event2"),
    );

    let report = auditing.get_audit_report(&credential_id);
    assert_eq!(report.len(), 2);
}

#[test]
fn test_track_activity_increments_failures() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);

    for _ in 0..5 {
        auditing.track_activity(&actor, &true);
    }

    auditing.track_activity(&actor, &true);
    let dummy_id = BytesN::from_array(&env, &[0; 32]);
    let report = auditing.get_audit_report(&dummy_id);
    assert!(report.len() > 0);
}

#[test]
fn test_credential_exists_returns_error_for_missing() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let credential_id = BytesN::from_array(&env, &[99u8; 32]);

    let result = auditing.try_credential_exists(&credential_id);
    assert!(result.is_err());
}

#[test]
fn test_credential_not_revoked_checks_status() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let credential_id = BytesN::from_array(&env, &[1u8; 32]);
    let actor = Address::generate(&env);

    auditing.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "test"),
    );

    let result = auditing.try_credential_not_revoked(&credential_id);
    assert!(result.is_ok());
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_identity_and_verification_flow() {
    let (env, identity, verification, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let cid = String::from_str(&env, "QmTest");

    let identity_id = identity.register_identity(&owner, &doc_hash, &cid);

    let proof_hash = BytesN::from_array(&env, &[2u8; 32]);
    let commitment = BytesN::from_array(&env, &[3u8; 32]);
    let v_id = verification.submit_proof(&identity_id, &verifier, &proof_hash, &commitment);

    verification.approve_verification(&v_id);
    identity.mark_verified(&identity_id);

    assert!(identity.is_verified(&identity_id));
    assert!(verification.is_verification_valid(&v_id));
}

#[test]
fn test_access_control_with_data_sharing() {
    let (env, _, _, access, sharing, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let recipient = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);

    let share_id = sharing.share_document(
        &grantor,
        &recipient,
        &doc_hash,
        &Bytes::new(&env),
        &3600,
    );

    let permission_id = access.grant_access(&grantor, &recipient, &share_id, &3600);

    assert!(access.check_access(&recipient, &share_id));
    assert!(sharing.is_share_active(&share_id));
}

#[test]
fn test_full_credential_lifecycle() {
    let (env, identity, verification, _, _, auditing) = setup_all_contracts();
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let credential_id = BytesN::from_array(&env, &[1u8; 32]);

    let identity_id = identity.register_identity(&owner, &doc_hash, &String::from_str(&env, "Qm"));

    let proof_hash = BytesN::from_array(&env, &[2u8; 32]);
    let commitment = BytesN::from_array(&env, &[3u8; 32]);
    let v_id = verification.submit_proof(&identity_id, &verifier, &proof_hash, &commitment);

    auditing.log_audit_event(
        &credential_id,
        &owner,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "credential created"),
    );

    verification.approve_verification(&v_id);
    auditing.log_audit_event(
        &credential_id,
        &verifier,
        &Symbol::new(&env, "verified"),
        &String::from_str(&env, "credential verified"),
    );

    verification.revoke_verification(&v_id, &String::from_str(&env, "fraud"));
    auditing.log_audit_event(
        &credential_id,
        &verifier,
        &Symbol::new(&env, "revoked"),
        &String::from_str(&env, "credential revoked"),
    );

    let report = auditing.get_audit_report(&credential_id);
    assert_eq!(report.len(), 3);
    assert!(!verification.is_verification_valid(&v_id));
}

#[test]
fn test_multiple_identities_and_verifications() {
    let (env, identity, verification, _, _, _) = setup_all_contracts();
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let verifier = Address::generate(&env);

    let id1 = identity.register_identity(
        &owner1,
        &BytesN::from_array(&env, &[1u8; 32]),
        &String::from_str(&env, "Qm1"),
    );
    let id2 = identity.register_identity(
        &owner2,
        &BytesN::from_array(&env, &[2u8; 32]),
        &String::from_str(&env, "Qm2"),
    );

    let v_id1 = verification.submit_proof(
        &id1,
        &verifier,
        &BytesN::from_array(&env, &[10u8; 32]),
        &BytesN::from_array(&env, &[20u8; 32]),
    );
    let v_id2 = verification.submit_proof(
        &id2,
        &verifier,
        &BytesN::from_array(&env, &[30u8; 32]),
        &BytesN::from_array(&env, &[40u8; 32]),
    );

    verification.approve_verification(&v_id1);
    verification.reject_verification(&v_id2, &String::from_str(&env, "invalid"));

    assert!(verification.is_verification_valid(&v_id1));
    assert!(!verification.is_verification_valid(&v_id2));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_revoked_verification_cannot_be_valid() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let commitment = BytesN::from_array(&env, &[2u8; 32]);

    let v_id = verification.submit_proof(&1, &verifier, &proof_hash, &commitment);
    verification.approve_verification(&v_id);

    assert!(verification.is_verification_valid(&v_id));

    verification.revoke_verification(&v_id, &String::from_str(&env, "fraud"));
    assert!(!verification.is_verification_valid(&v_id));
}

#[test]
fn test_revoked_identity_cannot_be_verified() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);

    let id = identity.register_identity(&owner, &doc_hash, &String::from_str(&env, "Qm"));
    identity.mark_verified(&id);
    assert!(identity.is_verified(&id));

    identity.revoke_identity(&id);
    assert!(!identity.is_verified(&id));
}

#[test]
fn test_expired_access_denied() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);
    let start_ts = env.ledger().timestamp();

    access.grant_access(&grantor, &grantee, &1, &100);
    assert!(access.check_access(&grantee, &1));

    env.ledger().set_timestamp(start_ts + 200);
    assert!(!access.check_access(&grantee, &1));
}

#[test]
fn test_revoked_access_denied() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    let perm_id = access.grant_access(&grantor, &grantee, &1, &3600);
    assert!(access.check_access(&grantee, &1));

    access.revoke_access(&perm_id);
    assert!(!access.check_access(&grantee, &1));
}

#[test]
fn test_suspicious_activity_detection() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);

    for _ in 0..5 {
        auditing.track_activity(&actor, &true);
    }

    auditing.track_activity(&actor, &true);

    let dummy_id = BytesN::from_array(&env, &[0; 32]);
    let report = auditing.get_audit_report(&dummy_id);
    let suspicious_found = report
        .iter()
        .any(|r| r.action == Symbol::new(&env, "suspicious"));
    assert!(suspicious_found);
}

#[test]
fn test_activity_reset_on_success() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);

    auditing.track_activity(&actor, &true);
    auditing.track_activity(&actor, &true);
    auditing.track_activity(&actor, &false);

    let dummy_id = BytesN::from_array(&env, &[0; 32]);
    let report = auditing.get_audit_report(&dummy_id);
    let suspicious_found = report
        .iter()
        .any(|r| r.action == Symbol::new(&env, "suspicious"));
    assert!(!suspicious_found);
}

// ─────────────────────────────────────────────────────────────────────────────
// GAS OPTIMIZATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_batch_access_grants() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);
    let grantee = Address::generate(&env);

    for i in 0..10 {
        access.grant_access(&grantor, &grantee, &i, &3600);
    }

    for i in 0..10 {
        assert!(access.check_access(&grantee, &i));
    }
}

#[test]
fn test_batch_verifications() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);

    let mut v_ids = Vec::new(&env);
    for i in 0..10 {
        let v_id = verification.submit_proof(
            &(i as u64),
            &verifier,
            &BytesN::from_array(&env, &[(i as u8); 32]),
            &BytesN::from_array(&env, &[((i + 1) as u8); 32]),
        );
        v_ids.push_back(v_id);
    }

    for v_id in v_ids.iter() {
        verification.approve_verification(&v_id);
        assert!(verification.is_verification_valid(&v_id));
    }
}

#[test]
fn test_batch_identities() {
    let (env, identity, _, _, _, _) = setup_all_contracts();
    let owner = Address::generate(&env);

    let mut id_list = Vec::new(&env);
    for i in 0..10 {
        let id = identity.register_identity(
            &owner,
            &BytesN::from_array(&env, &[(i as u8); 32]),
            &String::from_str(&env, "Qm"),
        );
        id_list.push_back(id);
    }

    assert_eq!(id_list.len(), 10);

    for id in id_list.iter() {
        let record = identity.get_identity(&id);
        assert_eq!(record.owner, owner);
    }
}

#[test]
fn test_batch_audit_events() {
    let (env, _, _, _, _, auditing) = setup_all_contracts();
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[1u8; 32]);

    for i in 0..20 {
        auditing.log_audit_event(
            &credential_id,
            &actor,
            &Symbol::new(&env, "test"),
            &String::from_str(&env, "event"),
        );
    }

    let report = auditing.get_audit_report(&credential_id);
    assert_eq!(report.len(), 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_large_scale_access_management() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);

    for i in 0..50 {
        let grantee = Address::generate(&env);
        access.grant_access(&grantor, &grantee, &(i as u64), &3600);
    }
}

#[test]
fn test_verification_status_transitions() {
    let (env, _, verification, _, _, _) = setup_all_contracts();
    let verifier = Address::generate(&env);

    let mut verification_ids = Vec::new(&env);
    for i in 0..30 {
        let v_id = verification.submit_proof(
            &(i as u64),
            &verifier,
            &BytesN::from_array(&env, &[(i as u8); 32]),
            &BytesN::from_array(&env, &[((i + 1) as u8); 32]),
        );
        verification_ids.push_back(v_id);
    }

    for (idx, v_id) in verification_ids.iter().enumerate() {
        if idx % 2 == 0 {
            verification.approve_verification(&v_id);
        } else {
            verification.reject_verification(&v_id, &String::from_str(&env, "invalid"));
        }
    }
}

#[test]
fn test_audit_trail_consistency() {
    let (env, identity, verification, _, _, auditing) = setup_all_contracts();
    let owner = Address::generate(&env);
    let verifier = Address::generate(&env);

    for i in 0..10 {
        let credential_id = BytesN::from_array(&env, &[(i as u8); 32]);

        let identity_id = identity.register_identity(
            &owner,
            &credential_id,
            &String::from_str(&env, "Qm"),
        );

        let v_id = verification.submit_proof(
            &identity_id,
            &verifier,
            &BytesN::from_array(&env, &[((i + 1) as u8); 32]),
            &BytesN::from_array(&env, &[((i + 2) as u8); 32]),
        );

        auditing.log_audit_event(
            &credential_id,
            &owner,
            &Symbol::new(&env, "issued"),
            &String::from_str(&env, "created"),
        );

        verification.approve_verification(&v_id);

        auditing.log_audit_event(
            &credential_id,
            &verifier,
            &Symbol::new(&env, "verified"),
            &String::from_str(&env, "verified"),
        );
    }
}

#[test]
fn test_deep_sharing_chain() {
    let (env, _, _, access, sharing, _) = setup_all_contracts();

    let owner = Address::generate(&env);
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);

    let share_id = sharing.share_document(
        &owner,
        &Address::generate(&env),
        &doc_hash,
        &Bytes::new(&env),
        &3600,
    );

    for i in 0..10 {
        let resource_id = share_id + (i as u64);
        let grantor = if i == 0 { owner.clone() } else { Address::generate(&env) };
        let grantee = Address::generate(&env);

        access.grant_access(&grantor, &grantee, &resource_id, &3600);
        assert!(access.check_access(&grantee, &resource_id));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_permission_not_found_error() {
    let (env, _, _, access, _, _) = setup_all_contracts();

    let result = access.try_get_permission(&99999);
    assert!(result.is_err());
}

#[test]
fn test_identity_not_found_error() {
    let (env, identity, _, _, _, _) = setup_all_contracts();

    let result = identity.try_get_identity(&99999);
    assert!(result.is_err());
}

#[test]
fn test_shared_document_not_found_error() {
    let (env, _, _, _, sharing, _) = setup_all_contracts();

    let result = sharing.try_get_shared_document(&99999);
    assert!(result.is_err());
}

#[test]
fn test_verification_not_found_error() {
    let (env, _, verification, _, _, _) = setup_all_contracts();

    let result = verification.try_get_verification(&99999);
    assert!(result.is_err());
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENT OPERATIONS TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_multiple_users_same_resource() {
    let (env, _, _, access, _, _) = setup_all_contracts();
    let grantor = Address::generate(&env);

    for i in 0..10 {
        let grantee = Address::generate(&env);
        access.grant_access(&grantor, &grantee, &1, &3600);
    }

    for i in 0..10 {
        let grantee = Address::generate(&env);
        assert!(!access.check_access(&grantee, &1));
    }
}

#[test]
fn test_identity_verification_independence() {
    let (env, identity, verification, _, _, _) = setup_all_contracts();
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let verifier = Address::generate(&env);

    let id1 = identity.register_identity(
        &owner1,
        &BytesN::from_array(&env, &[1u8; 32]),
        &String::from_str(&env, "Qm1"),
    );
    let id2 = identity.register_identity(
        &owner2,
        &BytesN::from_array(&env, &[2u8; 32]),
        &String::from_str(&env, "Qm2"),
    );

    let v_id1 = verification.submit_proof(
        &id1,
        &verifier,
        &BytesN::from_array(&env, &[10u8; 32]),
        &BytesN::from_array(&env, &[20u8; 32]),
    );
    let v_id2 = verification.submit_proof(
        &id2,
        &verifier,
        &BytesN::from_array(&env, &[30u8; 32]),
        &BytesN::from_array(&env, &[40u8; 32]),
    );

    verification.approve_verification(&v_id1);
    verification.reject_verification(&v_id2, &String::from_str(&env, "invalid"));

    assert!(verification.is_verification_valid(&v_id1));
    assert!(!verification.is_verification_valid(&v_id2));

    identity.mark_verified(&id1);
    assert!(identity.is_verified(&id1));
}
