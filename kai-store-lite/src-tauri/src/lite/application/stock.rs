use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StockItem {
    pub variant_id: String,
    pub storage_id: String,
    pub sku: Option<String>,
    pub name: String,
    pub physical_stock: f64,
    pub storage_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockAdjust {
    pub variant_id: String,
    pub storage_id: String,
    pub quantity: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockDelta {
    pub variant_id: String,
    pub storage_id: String,
    pub delta: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockTransfer {
    pub variant_id: String,
    pub from_storage_id: String,
    pub to_storage_id: String,
    pub quantity: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceptionRow {
    pub id: String,
    pub supplier_id: Option<String>,
    pub storage_id: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceptionCreate {
    /// Optional; defaults to first company storage.
    pub storage_id: Option<String>,
    pub supplier_id: Option<String>,
    /// Nest ReceiptsPage sends supplierName instead of supplier_id.
    pub supplier_name: Option<String>,
    pub note: Option<String>,
    pub lines: Vec<ReceptionLineIn>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceptionLineIn {
    pub variant_id: String,
    #[serde(alias = "qty")]
    pub quantity: f64,
    pub unit_cost: Option<f64>,
}

pub async fn stock_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<StockItem>> {
    let rows = sqlx::query(
        r#"SELECT sl.variant_id, sl.storage_id, sl.quantity, v.sku, v.name, s.name AS storage_name
           FROM stock_levels sl
           JOIN product_variants v ON v.id = sl.variant_id
           JOIN products p ON p.id = v.product_id
           JOIN storages s ON s.id = sl.storage_id
           WHERE p.company_id = ?1
           ORDER BY v.name"#,
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    let mut items: Vec<StockItem> = rows
        .into_iter()
        .map(|r| StockItem {
            variant_id: r.get("variant_id"),
            storage_id: r.get("storage_id"),
            sku: r.get("sku"),
            name: r.get("name"),
            physical_stock: r.get("quantity"),
            storage_name: r.get("storage_name"),
        })
        .collect();

    // Synthesize qty 0 for PHYSICAL/INSUMO variants without a stock_levels row (legacy).
    let default_storage: Option<(String, Option<String>)> = sqlx::query_as(
        "SELECT id, name FROM storages WHERE company_id = ?1 ORDER BY name LIMIT 1",
    )
    .bind(company_id)
    .fetch_optional(pool)
    .await?;
    if let Some((storage_id, storage_name)) = default_storage {
        let seen: std::collections::HashSet<String> =
            items.iter().map(|i| i.variant_id.clone()).collect();
        let missing = sqlx::query(
            r#"SELECT v.id, v.sku, v.name
               FROM product_variants v
               JOIN products p ON p.id = v.product_id
               WHERE p.company_id = ?1
                 AND p.product_type IN ('PHYSICAL', 'INSUMO')
                 AND v.active = 1"#,
        )
        .bind(company_id)
        .fetch_all(pool)
        .await?;
        for r in missing {
            let vid: String = r.get("id");
            if seen.contains(&vid) {
                continue;
            }
            items.push(StockItem {
                variant_id: vid,
                storage_id: storage_id.clone(),
                sku: r.get("sku"),
                name: r.get("name"),
                physical_stock: 0.0,
                storage_name: storage_name.clone(),
            });
        }
        items.sort_by(|a, b| a.name.cmp(&b.name));
    }

    Ok(items)
}

/// Ensure a stock_levels row exists at the company default storage (qty 0).
pub async fn ensure_stock_level(
    pool: &LitePool,
    company_id: &str,
    variant_id: &str,
) -> LiteResult<()> {
    let storage_id: Option<String> =
        sqlx::query_scalar("SELECT id FROM storages WHERE company_id = ?1 ORDER BY name LIMIT 1")
            .bind(company_id)
            .fetch_optional(pool)
            .await?;
    let Some(storage_id) = storage_id else {
        return Ok(());
    };
    sqlx::query(
        "INSERT INTO stock_levels (variant_id, storage_id, quantity) VALUES (?1,?2,0)
         ON CONFLICT(variant_id, storage_id) DO NOTHING",
    )
    .bind(variant_id)
    .bind(&storage_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn stock_adjust(pool: &LitePool, dto: StockAdjust) -> LiteResult<()> {
    if dto.quantity < 0.0 {
        return Err(LiteError::BadRequest("quantity must be >= 0".into()));
    }
    set_qty(pool, &dto.variant_id, &dto.storage_id, dto.quantity).await?;
    record_move(
        pool,
        &dto.variant_id,
        &dto.storage_id,
        0.0,
        dto.reason.as_deref().unwrap_or("adjust"),
        None,
    )
    .await?;
    Ok(())
}

pub async fn stock_delta(pool: &LitePool, dto: StockDelta) -> LiteResult<()> {
    apply_delta(
        pool,
        &dto.variant_id,
        &dto.storage_id,
        dto.delta,
        dto.reason.as_deref().unwrap_or("delta"),
        None,
        false,
    )
    .await
}

pub async fn stock_transfer(pool: &LitePool, dto: StockTransfer) -> LiteResult<()> {
    if dto.quantity <= 0.0 {
        return Err(LiteError::BadRequest("quantity must be > 0".into()));
    }
    if dto.from_storage_id == dto.to_storage_id {
        return Err(LiteError::BadRequest("same storage".into()));
    }
    apply_delta(
        pool,
        &dto.variant_id,
        &dto.from_storage_id,
        -dto.quantity,
        "transfer_out",
        None,
        false,
    )
    .await?;
    apply_delta(
        pool,
        &dto.variant_id,
        &dto.to_storage_id,
        dto.quantity,
        "transfer_in",
        None,
        false,
    )
    .await?;
    Ok(())
}

pub async fn receptions_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<ReceptionRow>> {
    let rows = sqlx::query(
        "SELECT id, supplier_id, storage_id, status, created_at FROM receptions WHERE company_id = ?1 ORDER BY created_at DESC",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| ReceptionRow {
            id: r.get("id"),
            supplier_id: r.get("supplier_id"),
            storage_id: r.get("storage_id"),
            status: r.get("status"),
            created_at: r.get("created_at"),
        })
        .collect())
}

pub async fn receptions_create(
    pool: &LitePool,
    company_id: &str,
    user_id: &str,
    dto: ReceptionCreate,
) -> LiteResult<ReceptionRow> {
    if dto.lines.is_empty() {
        return Err(LiteError::BadRequest("lines required".into()));
    }
    let storage_id = if let Some(s) = dto.storage_id.filter(|s| !s.is_empty()) {
        s
    } else {
        sqlx::query_scalar("SELECT id FROM storages WHERE company_id = ?1 LIMIT 1")
            .bind(company_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| LiteError::BadRequest("no storage".into()))?
    };

    let mut supplier_id = dto.supplier_id.clone();
    let note = dto.note.clone().or_else(|| {
        dto.supplier_name
            .as_ref()
            .map(|n| format!("supplier:{n}"))
    });
    if supplier_id.is_none() {
        if let Some(ref name) = dto.supplier_name {
            let existing: Option<String> = sqlx::query_scalar(
                "SELECT id FROM suppliers WHERE company_id = ?1 AND name = ?2 LIMIT 1",
            )
            .bind(company_id)
            .bind(name)
            .fetch_optional(pool)
            .await?;
            if let Some(id) = existing {
                supplier_id = Some(id);
            } else {
                let sid = Uuid::new_v4().to_string();
                sqlx::query(
                    "INSERT INTO suppliers (id, company_id, name) VALUES (?1,?2,?3)",
                )
                .bind(&sid)
                .bind(company_id)
                .bind(name)
                .execute(pool)
                .await?;
                supplier_id = Some(sid);
            }
        }
    }

    let id = Uuid::new_v4().to_string();
    let mut tx = pool.begin().await?;
    sqlx::query(
        "INSERT INTO receptions (id, company_id, supplier_id, storage_id, note, created_by) VALUES (?1,?2,?3,?4,?5,?6)",
    )
    .bind(&id)
    .bind(company_id)
    .bind(&supplier_id)
    .bind(&storage_id)
    .bind(&note)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    for line in &dto.lines {
        if line.quantity <= 0.0 {
            return Err(LiteError::BadRequest("line quantity must be > 0".into()));
        }
        let line_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO reception_lines (id, reception_id, variant_id, quantity, unit_cost) VALUES (?1,?2,?3,?4,?5)",
        )
        .bind(&line_id)
        .bind(&id)
        .bind(&line.variant_id)
        .bind(line.quantity)
        .bind(line.unit_cost.unwrap_or(0.0))
        .execute(&mut *tx)
        .await?;

        let cur: f64 = sqlx::query_scalar(
            "SELECT COALESCE(quantity,0) FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
        )
        .bind(&line.variant_id)
        .bind(&storage_id)
        .fetch_optional(&mut *tx)
        .await?
        .unwrap_or(0.0);
        let new_qty = cur + line.quantity;
        sqlx::query(
            "INSERT INTO stock_levels (variant_id, storage_id, quantity) VALUES (?1,?2,?3)
             ON CONFLICT(variant_id, storage_id) DO UPDATE SET quantity = excluded.quantity",
        )
        .bind(&line.variant_id)
        .bind(&storage_id)
        .bind(new_qty)
        .execute(&mut *tx)
        .await?;
        let mov_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO stock_movements (id, variant_id, storage_id, delta, reason, ref_id) VALUES (?1,?2,?3,?4,'reception',?5)",
        )
        .bind(&mov_id)
        .bind(&line.variant_id)
        .bind(&storage_id)
        .bind(line.quantity)
        .bind(&id)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(ReceptionRow {
        id,
        supplier_id,
        storage_id,
        status: "COMPLETED".into(),
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

async fn set_qty(pool: &LitePool, variant_id: &str, storage_id: &str, qty: f64) -> LiteResult<()> {
    sqlx::query(
        "INSERT INTO stock_levels (variant_id, storage_id, quantity) VALUES (?1,?2,?3)
         ON CONFLICT(variant_id, storage_id) DO UPDATE SET quantity = excluded.quantity",
    )
    .bind(variant_id)
    .bind(storage_id)
    .bind(qty)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn apply_delta(
    pool: &LitePool,
    variant_id: &str,
    storage_id: &str,
    delta: f64,
    reason: &str,
    ref_id: Option<&str>,
    reject_negative: bool,
) -> LiteResult<()> {
    let cur: f64 = sqlx::query_scalar(
        "SELECT COALESCE(quantity,0) FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
    )
    .bind(variant_id)
    .bind(storage_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0.0);
    let new_qty = cur + delta;
    if reject_negative && new_qty < 0.0 {
        return Err(LiteError::BadRequest("insufficient stock".into()));
    }
    set_qty(pool, variant_id, storage_id, new_qty).await?;
    record_move(pool, variant_id, storage_id, delta, reason, ref_id).await?;
    Ok(())
}

async fn record_move(
    pool: &LitePool,
    variant_id: &str,
    storage_id: &str,
    delta: f64,
    reason: &str,
    ref_id: Option<&str>,
) -> LiteResult<()> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO stock_movements (id, variant_id, storage_id, delta, reason, ref_id) VALUES (?1,?2,?3,?4,?5,?6)",
    )
    .bind(&id)
    .bind(variant_id)
    .bind(storage_id)
    .bind(delta)
    .bind(reason)
    .bind(ref_id)
    .execute(pool)
    .await?;
    Ok(())
}
