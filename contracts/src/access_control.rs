use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::storage::AccessDataKey;
use crate::types::AccessLogEntry;

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

        let permission = AccessPermission {
            grantor: grantor.clone(),
            grantee: grantee.clone(),
            resource_id,
            access_expiry: env.ledger().timestamp() + duration_seconds,
            is_active: true,
            granted_at: env.ledger().timestamp(),
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

        Self::log_access(env, grantee, resource_id, Symbol::new(env, "granted"));

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

        Self::log_access(
            env,
            permission.grantee.clone(),
            permission.resource_id,
            Symbol::new(env, "revoked"),
        );

        Ok(())
    }

    pub fn check_access(env: &Env, grantee: Address, resource_id: u64) -> bool {
        let permission_id: u64 = match env
            .storage()
            .instance()
            .get(&(grantee.clone(), resource_id))
        {
            Some(id) => id,
            None => {
                Self::log_access(env, grantee, resource_id, Symbol::new(env, "denied"));
                return false;
            }
        };

        let permission: AccessPermission =
            match env.storage().instance().get(&(permission_id, "permission")) {
                Some(p) => p,
                None => {
                    Self::log_access(env, grantee, resource_id, Symbol::new(env, "denied"));
                    return false;
                }
            };

        let allowed = permission.is_active && env.ledger().timestamp() <= permission.access_expiry;
        Self::log_access(
            env,
            grantee,
            resource_id,
            Symbol::new(env, if allowed { "checked" } else { "denied" }),
        );
        allowed
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

        Self::log_access(
            env,
            permission.grantee.clone(),
            permission.resource_id,
            Symbol::new(env, "extended"),
        );

        Ok(())
    }

    /// Append an entry to the access log for (grantee, resource_id).
    fn log_access(env: &Env, grantee: Address, resource_id: u64, action: Symbol) {
        let entry = AccessLogEntry {
            grantee: grantee.clone(),
            resource_id,
            action,
            timestamp: env.ledger().timestamp(),
        };

        let mut logs = Self::get_access_logs(env, grantee.clone(), resource_id);
        logs.push_back(entry);

        env.storage()
            .persistent()
            .set(&AccessDataKey::Logs(grantee, resource_id), &logs);
    }

    /// Retrieve the full access log for (grantee, resource_id), oldest first.
    pub fn get_access_logs(env: &Env, grantee: Address, resource_id: u64) -> Vec<AccessLogEntry> {
        env.storage()
            .persistent()
            .get(&AccessDataKey::Logs(grantee, resource_id))
            .unwrap_or(Vec::new(env))
    }
}
