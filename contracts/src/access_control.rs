use soroban_sdk::{contract, contractimpl, Address, Env, Map, String, Vec, U256};

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
            .get(&("permission_counter"))
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
            .set(&("permission_counter"), &permission_id);
        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);
        env.storage()
            .instance()
            .set(&(grantee, resource_id), &permission_id);

        permission_id
    }

    pub fn revoke_access(env: &Env, permission_id: u64) {
        let mut permission: AccessPermission = env
            .storage()
            .instance()
            .get(&(permission_id, "permission"))
            .unwrap_or_else(|| panic!("Permission not found"));

        permission.grantor.require_auth();

        permission.is_active = false;

        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);
    }

    pub fn check_access(env: &Env, grantee: Address, resource_id: u64) -> bool {
        let permission_id: u64 = env
            .storage()
            .instance()
            .get(&(grantee, resource_id))
            .unwrap_or_else(|| return false);

        let permission: AccessPermission = env
            .storage()
            .instance()
            .get(&(permission_id, "permission"))
            .unwrap_or_else(|| return false);

        if !permission.is_active {
            return false;
        }

        if env.ledger().timestamp() > permission.access_expiry {
            return false;
        }

        true
    }

    pub fn get_permission(env: &Env, permission_id: u64) -> AccessPermission {
        env.storage()
            .instance()
            .get(&(permission_id, "permission"))
            .unwrap_or_else(|| panic!("Permission not found"))
    }

    pub fn get_permissions_by_grantee(env: &Env, grantee: Address) -> Vec<u64> {
        let mut permissions = Vec::new(env);

        // In a real implementation, you'd iterate through storage
        // For now, return empty vector as placeholder
        permissions
    }

    pub fn get_permissions_by_grantor(env: &Env, grantor: Address) -> Vec<u64> {
        let mut permissions = Vec::new(env);

        // In a real implementation, you'd iterate through storage
        // For now, return empty vector as placeholder
        permissions
    }

    pub fn extend_access(env: &Env, permission_id: u64, additional_seconds: u64) {
        let mut permission: AccessPermission = env
            .storage()
            .instance()
            .get(&(permission_id, "permission"))
            .unwrap_or_else(|| panic!("Permission not found"));

        permission.grantor.require_auth();

        permission.access_expiry += additional_seconds;

        env.storage()
            .instance()
            .set(&(permission_id, "permission"), &permission);
    }
}
