#![cfg(test)]

use crate::credential_metadata::{CredentialMetadataStore, CredentialMetadataStoreClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

#[test]
fn test_store_and_get_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CredentialMetadataStore);
    let client = CredentialMetadataStoreClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[1; 32]);

    client.store_metadata(&owner, &credential_id, &String::from_str(&env, "name=Acme"));

    let record = client.get_metadata(&credential_id);
    assert_eq!(record.owner, owner);
    assert_eq!(record.metadata, String::from_str(&env, "name=Acme"));
}

#[test]
fn test_update_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CredentialMetadataStore);
    let client = CredentialMetadataStoreClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[2; 32]);

    client.store_metadata(&owner, &credential_id, &String::from_str(&env, "v1"));
    client.update_metadata(&owner, &credential_id, &String::from_str(&env, "v2"));

    let record = client.get_metadata(&credential_id);
    assert_eq!(record.metadata, String::from_str(&env, "v2"));
}

#[test]
fn test_update_metadata_wrong_owner_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CredentialMetadataStore);
    let client = CredentialMetadataStoreClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[3; 32]);

    client.store_metadata(&owner, &credential_id, &String::from_str(&env, "v1"));

    let res = client.try_update_metadata(&other, &credential_id, &String::from_str(&env, "v2"));
    assert!(res.is_err());
}

#[test]
fn test_delete_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CredentialMetadataStore);
    let client = CredentialMetadataStoreClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let credential_id = BytesN::from_array(&env, &[4; 32]);

    client.store_metadata(&owner, &credential_id, &String::from_str(&env, "v1"));
    client.delete_metadata(&owner, &credential_id);

    let res = client.try_get_metadata(&credential_id);
    assert!(res.is_err());
}

#[test]
fn test_get_missing_metadata_fails() {
    let env = Env::default();
    let contract_id = env.register_contract(None, CredentialMetadataStore);
    let client = CredentialMetadataStoreClient::new(&env, &contract_id);
    let credential_id = BytesN::from_array(&env, &[5; 32]);

    let res = client.try_get_metadata(&credential_id);
    assert!(res.is_err());
}
