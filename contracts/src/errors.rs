use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    IdentityNotFound = 1,
    VerificationNotFound = 2,
    PermissionNotFound = 3,
    SharedDocumentNotFound = 4,
    Unauthorized = 5,
    AlreadyInitialized = 6,
    // Upgrade mechanism errors
    UpgradeNotInitialized = 7,
    InvalidUpgradeHash = 8,
    MigrationAlreadyRun = 9,
    StateInconsistency = 10,
    UpgradeTimelockNotExpired = 11,
    ProxyNotInitialized = 12,
    InvalidImplementation = 13,
    MigrationFailed = 14,
    VersionMismatch = 15,
    StorageCorrupted = 16,
    // Auditing errors
    SuspiciousActivity = 17,
    IssuerNotAuthorized = 18,
    CredentialRevoked = 19,
    CredentialNotFound = 20,
    // Credential sharing errors
    PermissionDenied = 21,
    ShareExpired = 22,
    CannotReShare = 23,
}
