#![no_std]

pub mod access_control;
pub mod auditing;
pub mod credential_metadata;
pub mod data_sharing;
pub mod errors;
pub mod events;
pub mod identity_registry;
pub mod storage;
pub mod types;
pub mod upgrade;
pub mod verification;

#[cfg(test)]
mod upgrade_tests;

#[cfg(test)]
mod integration_tests;

#[cfg(test)]
mod benchmarks;

#[cfg(test)]
mod test;

#[cfg(test)]
mod credential_metadata_tests;

pub use access_control::AccessControl;
pub use credential_metadata::CredentialMetadataStore;
pub use data_sharing::DataSharing;
pub use errors::Error;
pub use identity_registry::IdentityRegistry;
pub use verification::Verification;
