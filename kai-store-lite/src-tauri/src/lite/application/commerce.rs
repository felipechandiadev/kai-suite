use crate::lite::application::stock::apply_delta;
use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleRequest {
    pub lines: Vec<SaleLineIn>,
    pub payments: Vec<PaymentIn>,
    pub customer_id: Option<String>,
    pub storage_id: Option<String>,
    /// Nest/UI may send these; ignored by rust sale logic.
    #[serde(default)]
    pub method: Option<String>,
    #[serde(default)]
    pub total: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleLineIn {
    pub variant_id: String,
    #[serde(alias = "qty")]
    pub quantity: f64,
    pub unit_price: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentIn {
    pub method: String,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleRow {
    pub id: String,
    pub status: String,
    pub total: f64,
    pub created_at: String,
    pub customer_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PartnerRow {
    pub id: String,
    pub name: String,
    pub document_number: Option<String>,
    pub email: Option<String>,
}

pub async fn pos_sale(
    pool: &LitePool,
    company_id: &str,
    user_id: &str,
    dto: SaleRequest,
) -> LiteResult<SaleRow> {
    if dto.lines.is_empty() {
        return Err(LiteError::BadRequest("lines required".into()));
    }
    let session_id: Option<String> = sqlx::query_scalar(
        "SELECT id FROM cash_sessions WHERE company_id = ?1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1",
    )
    .bind(company_id)
    .fetch_optional(pool)
    .await?;
    let Some(session_id) = session_id else {
        return Err(LiteError::BadRequest("no open cash session".into()));
    };

    let storage_id: String = if let Some(s) = dto.storage_id {
        s
    } else {
        sqlx::query_scalar("SELECT id FROM storages WHERE company_id = ?1 LIMIT 1")
            .bind(company_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| LiteError::BadRequest("no storage".into()))?
    };

    let mut total = 0.0;
    let mut resolved: Vec<(String, String, f64, f64)> = Vec::new();
    for line in &dto.lines {
        if line.quantity <= 0.0 {
            return Err(LiteError::BadRequest("invalid quantity".into()));
        }
        let row = sqlx::query("SELECT name, unit_price FROM product_variants WHERE id = ?1")
            .bind(&line.variant_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| LiteError::NotFound("variant not found".into()))?;
        let name: String = row.get("name");
        let price = line.unit_price.unwrap_or_else(|| row.get("unit_price"));
        let line_total = price * line.quantity;
        total += line_total;
        resolved.push((line.variant_id.clone(), name, line.quantity, price));
    }

    let tx_id = Uuid::new_v4().to_string();
    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO transactions (id, company_id, cash_session_id, customer_id, status, total, created_by) VALUES (?1,?2,?3,?4,'COMPLETED',?5,?6)",
    )
    .bind(&tx_id)
    .bind(company_id)
    .bind(&session_id)
    .bind(&dto.customer_id)
    .bind(total)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    for (variant_id, name, qty, price) in &resolved {
        let line_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO transaction_lines (id, transaction_id, variant_id, name, quantity, unit_price, line_total) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        )
        .bind(&line_id)
        .bind(&tx_id)
        .bind(variant_id)
        .bind(name)
        .bind(qty)
        .bind(price)
        .bind(price * qty)
        .execute(&mut *tx)
        .await?;
    }

    for pay in &dto.payments {
        let pid = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO payments (id, transaction_id, method, amount) VALUES (?1,?2,?3,?4)",
        )
        .bind(&pid)
        .bind(&tx_id)
        .bind(&pay.method)
        .bind(pay.amount)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    // Stock outside nested tx using pool (apply_delta uses pool)
    for (variant_id, _, qty, _) in &resolved {
        apply_delta(
            pool,
            variant_id,
            &storage_id,
            -qty,
            "sale",
            Some(&tx_id),
            true,
        )
        .await?;
    }

    Ok(SaleRow {
        id: tx_id,
        status: "COMPLETED".into(),
        total,
        created_at: chrono::Utc::now().to_rfc3339(),
        customer_id: dto.customer_id,
    })
}

pub async fn sales_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<SaleRow>> {
    let rows = sqlx::query(
        "SELECT id, status, total, created_at, customer_id FROM transactions WHERE company_id = ?1 ORDER BY created_at DESC",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(map_sale).collect())
}

pub async fn sales_get(pool: &LitePool, company_id: &str, id: &str) -> LiteResult<SaleRow> {
    let row = sqlx::query(
        "SELECT id, status, total, created_at, customer_id FROM transactions WHERE id = ?1 AND company_id = ?2",
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| LiteError::NotFound("sale not found".into()))?;
    Ok(map_sale(row))
}

pub async fn sales_void(pool: &LitePool, company_id: &str, id: &str) -> LiteResult<SaleRow> {
    let sale = sales_get(pool, company_id, id).await?;
    if sale.status == "VOIDED" {
        return Err(LiteError::BadRequest("already voided".into()));
    }
    let storage_id: String = sqlx::query_scalar("SELECT id FROM storages WHERE company_id = ?1 LIMIT 1")
        .bind(company_id)
        .fetch_one(pool)
        .await?;
    let lines = sqlx::query(
        "SELECT variant_id, quantity FROM transaction_lines WHERE transaction_id = ?1",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    for line in lines {
        let vid: String = line.get("variant_id");
        let qty: f64 = line.get("quantity");
        apply_delta(pool, &vid, &storage_id, qty, "void", Some(id), false).await?;
    }
    sqlx::query(
        "UPDATE transactions SET status = 'VOIDED', voided_at = datetime('now') WHERE id = ?1",
    )
    .bind(id)
    .execute(pool)
    .await?;
    sales_get(pool, company_id, id).await
}

fn map_sale(r: sqlx::sqlite::SqliteRow) -> SaleRow {
    SaleRow {
        id: r.get("id"),
        status: r.get("status"),
        total: r.get("total"),
        created_at: r.get("created_at"),
        customer_id: r.get("customer_id"),
    }
}

pub async fn customers_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<PartnerRow>> {
    let rows = sqlx::query(
        "SELECT id, name, document_number, email FROM customers WHERE company_id = ?1 AND active = 1",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| PartnerRow {
            id: r.get("id"),
            name: r.get("name"),
            document_number: r.get("document_number"),
            email: r.get("email"),
        })
        .collect())
}

pub async fn suppliers_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<PartnerRow>> {
    let rows = sqlx::query(
        "SELECT id, name, document_number, NULL as email FROM suppliers WHERE company_id = ?1 AND active = 1",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| PartnerRow {
            id: r.get("id"),
            name: r.get("name"),
            document_number: r.get("document_number"),
            email: r.get("email"),
        })
        .collect())
}
