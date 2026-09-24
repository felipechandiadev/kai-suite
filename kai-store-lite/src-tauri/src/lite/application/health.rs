use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::Serialize;
use sqlx::Row;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthDto {
    pub ok: bool,
    pub edition: String,
    pub product: String,
    pub version: String,
    pub timestamp: String,
}

pub async fn health(pool: &LitePool) -> LiteResult<HealthDto> {
    let row = sqlx::query("SELECT 1 AS n").fetch_one(pool).await?;
    let n: i32 = row.try_get("n")?;
    if n != 1 {
        return Err(LiteError::Other(anyhow::anyhow!("db ping failed")));
    }
    Ok(HealthDto {
        ok: true,
        edition: "lite-rust".into(),
        product: "KaiStore Lite".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
