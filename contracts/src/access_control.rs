use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Vec};

use crate::errors::Error;

#[contracttype]
#[derive(Clone)]
pub struct AccessPermission {
    pub grantor: Address,
    pub grantee: Address,
    pub resource_id: u64,
    pub access_expiry: u64,
    pub is_active: bool,
    pub granted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccessAction {
    Granted,
    Revoked,
    Extended,
}

#[contracttype]
#[derive(Clone)]
pub struct AccessHistoryEntry {
    pub permission_id: u64,
    pub grantee: Address,
    pub resource_id: u64,
    pub actor: Address,
    pub action: AccessAction,
    pub timestamp: u64,
}

#[contracttype]
pub enum AccessControlEvent {
    Granted,
    Revoked,
    Extended,
}

/// Typed key for the append-only per-permission history log. Kept as its own
/// `contracttype` (rather than reusing the ad hoc tuple/string keys below) so
/// it lives in a distinct storage namespace and can't collide with them.
#[contracttype]
pub enum AccessDataKey {
    History(u64),
}

// History entries live in persistent storage (unlike the existing
// instance-storage permission records above) so reading/writing a
// permission's history doesn't serialize the contract's entire instance
// data set. See tooling/sanctifier's PERFORMANCE.md pattern this mirrors.
const HISTORY_TTL_THRESHOLD: u32 = 17_280; // ~1 day
const HISTORY_TTL_EXTEND: u32 = 535_680; // ~31 days

#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {
    pub fn grant_access(
        env: &Env,
        grantor: Address,
        grantee: Address,
        resource_id: u64,
        duration_seconds: u64,
    ) -> u64 {
        grantor.require_auth();

        let permission_id = env
            .storage()
            .instance()
            .get::<_, u64>(&"permission_counter")
            .unwrap_or(0u64)
            + 1;

        let granted_at = env.ledger().timestamp();
        let permission = AccessPermission {
            grantor: grantor.clone(),
            grantee: grantee.clone(),
            resource_id,
            access_expiry: granted_at + duration_seconds,
            is_active: true,
            granted_at,
        };

        env.storage()
            .instance()
            .set(&"permission_counter", &permission_id);
        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);
        env.storage()
            .instance()
            .set(&(grantee.clone(), resource_id), &permission_id);

        record_history(
            env,
            permission_id,
            grantee,
            resource_id,
            grantor,
            AccessAction::Granted,
        );
        env.events().publish(
            (symbol_short!("acc_hist"), permission_id),
            AccessControlEvent::Granted,
        );

        permission_id
    }

    pub fn revoke_access(env: &Env, permission_id: u64) -> Result<(), Error> {
        let mut permission: AccessPermission = env
            .storage()
            .instance()
            .get(&(permission_id, "permission"))
            .ok_or(Error::PermissionNotFound)?;

        permission.grantor.require_auth();
        permission.is_active = false;

        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);

        record_history(
            env,
            permission_id,
            permission.grantee.clone(),
            permission.resource_id,
            permission.grantor.clone(),
            AccessAction::Revoked,
        );
        env.events().publish(
            (symbol_short!("acc_hist"), permission_id),
            AccessControlEvent::Revoked,
        );

        Ok(())
    }

    pub fn check_access(env: &Env, grantee: Address, resource_id: u64) -> bool {
        let permission_id: u64 = match env.storage().instance().get(&(grantee, resource_id)) {
            Some(id) => id,
            None => return false,
        };

        let permission: AccessPermission =
            match env.storage().instance().get(&(permission_id, "permission")) {
                Some(p) => p,
                None => return false,
            };

        permission.is_active && env.ledger().timestamp() <= permission.access_expiry
    }

    pub fn get_permission(env: &Env, permission_id: u64) -> Result<AccessPermission, Error> {
        env.storage()
            .instance()
            .get(&(permission_id, "permission"))
            .ok_or(Error::PermissionNotFound)
    }

    pub fn extend_access(
        env: &Env,
        permission_id: u64,
        additional_seconds: u64,
    ) -> Result<(), Error> {
        let mut permission: AccessPermission = env
            .storage()
            .instance()
            .get(&(permission_id, "permission"))
            .ok_or(Error::PermissionNotFound)?;

        permission.grantor.require_auth();
        permission.access_expiry += additional_seconds;

        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);

        record_history(
            env,
            permission_id,
            permission.grantee.clone(),
            permission.resource_id,
            permission.grantor.clone(),
            AccessAction::Extended,
        );
        env.events().publish(
            (symbol_short!("acc_hist"), permission_id),
            AccessControlEvent::Extended,
        );

        Ok(())
    }

    /// Full grant/revoke/extend history for a permission, oldest first.
    pub fn get_access_history(env: &Env, permission_id: u64) -> Vec<AccessHistoryEntry> {
        env.storage()
            .persistent()
            .get(&AccessDataKey::History(permission_id))
            .unwrap_or(Vec::new(env))
    }
}

// ── Storage helpers ─────────────────────────────────────────────────────────

fn record_history(
    env: &Env,
    permission_id: u64,
    grantee: Address,
    resource_id: u64,
    actor: Address,
    action: AccessAction,
) {
    let key = AccessDataKey::History(permission_id);
    let mut history: Vec<AccessHistoryEntry> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));

    history.push_back(AccessHistoryEntry {
        permission_id,
        grantee,
        resource_id,
        actor,
        action,
        timestamp: env.ledger().timestamp(),
    });

    env.storage().persistent().set(&key, &history);
    env.storage()
        .persistent()
        .extend_ttl(&key, HISTORY_TTL_THRESHOLD, HISTORY_TTL_EXTEND);
}
