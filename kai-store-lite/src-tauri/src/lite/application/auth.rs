use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginUser {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub access_token: String,
    pub user: LoginUser,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn login(pool: &LitePool, req: LoginRequest) -> LiteResult<LoginResponse> {
    let ident = req.email.trim();
    if ident.is_empty() || req.password.is_empty() {
        return Err(LiteError::BadRequest("email and password required".into()));
    }
    let row = sqlx::query(
        r#"SELECT id, name, email, password_hash FROM users
           WHERE active = 1 AND (username = ?1 OR email = ?1) LIMIT 1"#,
    )
    .bind(ident)
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else {
        return Err(LiteError::Unauthorized("Invalid credentials".into()));
    };
    let id: String = row.try_get("id")?;
    let name: String = row.try_get("name")?;
    let email: Option<String> = row.try_get("email")?;
    let hash: String = row.try_get("password_hash")?;

    let ok = bcrypt::verify(&req.password, &hash).unwrap_or(false);
    if !ok {
        return Err(LiteError::Unauthorized("Invalid credentials".into()));
    }

    let roles = load_roles(pool, &id).await?;
    Ok(LoginResponse {
        access_token: id.clone(),
        user: LoginUser {
            id,
            name,
            email,
            roles,
        },
    })
}

pub async fn change_password(
    pool: &LitePool,
    user_id: &str,
    req: ChangePasswordRequest,
) -> LiteResult<()> {
    if req.new_password.len() < 4 {
        return Err(LiteError::BadRequest("new password too short".into()));
    }
    let row = sqlx::query("SELECT password_hash FROM users WHERE id = ?1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| LiteError::NotFound("user not found".into()))?;
    let hash: String = row.try_get("password_hash")?;
    if !bcrypt::verify(&req.current_password, &hash).unwrap_or(false) {
        return Err(LiteError::Unauthorized("current password incorrect".into()));
    }
    let new_hash = bcrypt::hash(&req.new_password, 12)
        .map_err(|e| LiteError::Other(anyhow::anyhow!(e)))?;
    sqlx::query("UPDATE users SET password_hash = ?1 WHERE id = ?2")
        .bind(&new_hash)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn require_user(pool: &LitePool, bearer: Option<&str>) -> LiteResult<String> {
    let Some(token) = bearer.map(str::trim).filter(|s| !s.is_empty()) else {
        return Err(LiteError::Unauthorized("missing bearer".into()));
    };
    let exists: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE id = ?1 AND active = 1")
        .bind(token)
        .fetch_optional(pool)
        .await?;
    exists
        .map(|r| r.0)
        .ok_or_else(|| LiteError::Unauthorized("invalid token".into()))
}

async fn load_roles(pool: &LitePool, user_id: &str) -> LiteResult<Vec<String>> {
    let rows = sqlx::query("SELECT role FROM user_roles WHERE user_id = ?1")
        .bind(user_id)
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .filter_map(|r| r.try_get::<String, _>("role").ok())
        .collect())
}

pub async fn company_id_for_user(pool: &LitePool, user_id: &str) -> LiteResult<String> {
    let row = sqlx::query("SELECT company_id FROM users WHERE id = ?1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| LiteError::Unauthorized("user not found".into()))?;
    Ok(row.try_get("company_id")?)
}
