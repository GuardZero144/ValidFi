use crate::auditing::{Auditing, AuditingClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Symbol};

#[test]
fn test_audit_record_created() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Auditing);
    let client = AuditingClient::new(&env, &contract_id);
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[1; 32]);

    client.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "Credential created"),
    );

    let report = client.get_audit_report(&credential_id);
    assert_eq!(report.len(), 1);
    let record = report.get(0).unwrap();
    assert_eq!(record.credential_id, credential_id);
    assert_eq!(record.actor, actor);
    assert_eq!(record.action, Symbol::new(&env, "issued"));
}

#[test]
fn test_suspicious_activity_logged() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Auditing);
    let client = AuditingClient::new(&env, &contract_id);
    let actor = Address::generate(&env);

    for _ in 0..5 {
        client.track_activity(&actor, &true);
    }

    // 6th failure should trigger suspicious activity
    client.track_activity(&actor, &true);

    // Verify dummy credential ID was used for the event
    let dummy_id = BytesN::from_array(&env, &[0; 32]);
    let report = client.get_audit_report(&dummy_id);
    assert_eq!(report.len(), 1);
    let record = report.get(0).unwrap();
    assert_eq!(record.action, Symbol::new(&env, "suspicious"));
}

#[test]
fn test_security_check_failure() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Auditing);
    let client = AuditingClient::new(&env, &contract_id);
    let credential_id = BytesN::from_array(&env, &[2; 32]);

    let res = client.try_credential_exists(&credential_id);
    assert!(res.is_err());
}

#[test]
fn test_audit_report_generation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Auditing);
    let client = AuditingClient::new(&env, &contract_id);
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[3; 32]);

    client.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "first"),
    );
    client.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "verified"),
        &String::from_str(&env, "second"),
    );

    let report = client.get_audit_report(&credential_id);
    assert_eq!(report.len(), 2);
}

#[test]
fn test_events_emitted() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Auditing);
    let client = AuditingClient::new(&env, &contract_id);
    let actor = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[4; 32]);

    client.log_audit_event(
        &credential_id,
        &actor,
        &Symbol::new(&env, "issued"),
        &String::from_str(&env, "Emit test"),
    );
}
