extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Bytes, BytesN, Env};

use crate::health_authority::{HealthAuthority, HealthAuthorityClient};

fn setup() -> (Env, HealthAuthorityClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, HealthAuthority {});
    let client = HealthAuthorityClient::new(&env, &contract_id);
    let authority = Address::generate(&env);

    (env, client, authority)
}

fn rfc8032_public_key(env: &Env) -> BytesN<32> {
    BytesN::from_array(
        env,
        &[
            0xd7, 0x5a, 0x98, 0x01, 0x82, 0xb1, 0x0a, 0xb7, 0xd5, 0x4b, 0xfe, 0xd3, 0xc9, 0x64,
            0x07, 0x3a, 0x0e, 0xe1, 0x72, 0xf3, 0xda, 0xa6, 0x23, 0x25, 0xaf, 0x02, 0x1a, 0x68,
            0xf7, 0x07, 0x51, 0x1a,
        ],
    )
}

fn rfc8032_empty_message_signature(env: &Env) -> BytesN<64> {
    BytesN::from_array(
        env,
        &[
            0xe5, 0x56, 0x43, 0x00, 0xc3, 0x60, 0xac, 0x72, 0x90, 0x86, 0xe2, 0xcc, 0x80, 0x6e,
            0x82, 0x8a, 0x84, 0x87, 0x7f, 0x1e, 0xb8, 0xe5, 0xd9, 0x74, 0xd8, 0x73, 0xe0, 0x65,
            0x22, 0x49, 0x01, 0x55, 0x5f, 0xb8, 0x82, 0x15, 0x90, 0xa3, 0x3b, 0xac, 0xc6, 0x1e,
            0x39, 0x70, 0x1c, 0xf9, 0xb4, 0x6b, 0xd2, 0x5b, 0xf5, 0xf0, 0x59, 0x5b, 0xbe, 0x24,
            0x65, 0x51, 0x41, 0x43, 0x8e, 0x7a, 0x10, 0x0b,
        ],
    )
}

#[test]
fn registration_stores_the_authority_key() {
    let (env, client, authority) = setup();
    let public_key = rfc8032_public_key(&env);

    client.register_authority(&authority, &public_key);

    let record = client.get_authority(&authority);
    assert_eq!(record.address, authority);
    assert_eq!(record.public_key, public_key);
    assert!(record.is_active);
    assert_eq!(client.get_authority_public_key(&authority), public_key);
    assert!(client.verify_authority(&authority));
}

#[test]
fn authority_status_can_be_managed() {
    let (env, client, authority) = setup();
    client.register_authority(&authority, &rfc8032_public_key(&env));

    client.deactivate_authority(&authority);
    assert!(!client.is_authority_active(&authority));

    client.activate_authority(&authority);
    assert!(client.is_authority_active(&authority));
}

#[test]
fn valid_authority_signature_is_accepted() {
    let (env, client, authority) = setup();
    client.register_authority(&authority, &rfc8032_public_key(&env));

    let message = Bytes::new(&env);
    let signature = rfc8032_empty_message_signature(&env);
    assert!(client.validate_authority_signature(&authority, &message, &signature));
}

#[test]
fn rotating_an_authority_key_replaces_the_stored_key() {
    let (env, client, authority) = setup();
    let original_key = rfc8032_public_key(&env);
    let replacement_key = BytesN::from_array(&env, &[7; 32]);
    client.register_authority(&authority, &original_key);

    client.update_authority_public_key(&authority, &replacement_key);

    assert_eq!(client.get_authority_public_key(&authority), replacement_key);
}
