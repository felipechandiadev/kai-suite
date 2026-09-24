use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCatalogItem {
    /// Same as variant_id — LiteCatalogItem / ReceiptsPage use `id`.
    pub id: String,
    pub variant_id: String,
    pub name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_price: f64,
    pub product_type: String,
    /// Alias of product_type for LiteCatalogItem.type
    #[serde(rename = "type")]
    pub item_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCatalogPage {
    pub items: Vec<PosCatalogItem>,
    pub total: i64,
}

#[derive(Debug, Default)]
pub struct PosCatalogQuery {
    pub q: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductVariantRow {
    pub variant_id: String,
    pub product_id: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub base_price: f64,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductRow {
    pub id: String,
    pub product_id: String,
    pub name: String,
    pub product_type: String,
    pub is_active: bool,
    pub variant_count: i64,
    pub variants: Vec<ProductVariantRow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProduct {
    pub name: String,
    #[serde(alias = "productType")]
    pub product_type: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    #[serde(alias = "basePrice")]
    pub unit_price: Option<f64>,
    #[serde(alias = "categoryId")]
    pub category_id: Option<String>,
    #[serde(alias = "unitId")]
    pub unit_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkProductsBody {
    pub lines: Option<Vec<CreateProduct>>,
    #[serde(flatten)]
    pub _rest: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProductResult {
    pub product_id: String,
    pub variant_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchProduct {
    pub name: Option<String>,
    pub active: Option<bool>,
    pub category_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantDetail {
    pub id: String,
    pub product_id: String,
    pub name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_price: f64,
    pub cost: f64,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVariant {
    pub name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_price: Option<f64>,
    pub cost: Option<f64>,
    pub unit_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchVariant {
    pub name: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub unit_price: Option<f64>,
    pub cost: Option<f64>,
    pub active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackLine {
    #[serde(alias = "componentVariantId")]
    pub child_variant_id: String,
    #[serde(alias = "qty")]
    pub quantity: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NamedRow {
    pub id: String,
    pub name: String,
    pub symbol: Option<String>,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NamedCreate {
    pub name: String,
    pub symbol: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NamedPatch {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub active: Option<bool>,
}

pub async fn pos_catalog(
    pool: &LitePool,
    company_id: &str,
    query: PosCatalogQuery,
) -> LiteResult<PosCatalogPage> {
    let rows = sqlx::query(
        r#"SELECT v.id, v.name, v.sku, v.barcode, v.unit_price, p.product_type
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
           WHERE p.company_id = ?1 AND v.active = 1 AND p.active = 1
           ORDER BY v.name"#,
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;

    let q = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_ascii_lowercase());

    let mut items: Vec<PosCatalogItem> = rows
        .into_iter()
        .filter_map(|r| {
            let id: String = r.get("id");
            let name: String = r.get("name");
            let sku: Option<String> = r.get("sku");
            let barcode: Option<String> = r.get("barcode");
            let product_type: String = r.get("product_type");
            if let Some(ref needle) = q {
                let hay = format!(
                    "{} {} {}",
                    name.to_ascii_lowercase(),
                    sku.as_deref().unwrap_or("").to_ascii_lowercase(),
                    barcode.as_deref().unwrap_or("").to_ascii_lowercase()
                );
                if !hay.contains(needle) {
                    return None;
                }
            }
            Some(PosCatalogItem {
                id: id.clone(),
                variant_id: id,
                name,
                sku,
                barcode,
                unit_price: r.get("unit_price"),
                product_type: product_type.clone(),
                item_type: product_type,
            })
        })
        .collect();

    let total = items.len() as i64;
    let page_size = query.page_size.unwrap_or(50).clamp(1, 500) as usize;
    let page = query.page.unwrap_or(1).max(1) as usize;
    let start = (page - 1).saturating_mul(page_size);
    if start >= items.len() {
        items.clear();
    } else {
        let end = (start + page_size).min(items.len());
        items = items[start..end].to_vec();
    }

    Ok(PosCatalogPage { items, total })
}

pub async fn products_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<ProductRow>> {
    let products = sqlx::query(
        "SELECT id, name, product_type, active FROM products WHERE company_id = ?1 ORDER BY name",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    let mut out = Vec::new();
    for p in products {
        let id: String = p.get("id");
        let variants_rows = sqlx::query(
            "SELECT id, product_id, name, sku, barcode, unit_price, active FROM product_variants WHERE product_id = ?1",
        )
        .bind(&id)
        .fetch_all(pool)
        .await?;
        let variants: Vec<ProductVariantRow> = variants_rows
            .into_iter()
            .map(|v| ProductVariantRow {
                variant_id: v.get("id"),
                product_id: v.get("product_id"),
                sku: v
                    .get::<Option<String>, _>("sku")
                    .unwrap_or_default(),
                barcode: v.get("barcode"),
                base_price: v.get("unit_price"),
                is_active: v.get::<i64, _>("active") != 0,
            })
            .collect();
        out.push(ProductRow {
            id: id.clone(),
            product_id: id,
            name: p.get("name"),
            product_type: p.get("product_type"),
            is_active: p.get::<i64, _>("active") != 0,
            variant_count: variants.len() as i64,
            variants,
        });
    }
    Ok(out)
}

pub async fn products_create(
    pool: &LitePool,
    company_id: &str,
    dto: CreateProduct,
) -> LiteResult<CreateProductResult> {
    if dto.name.trim().is_empty() {
        return Err(LiteError::BadRequest("name required".into()));
    }
    let product_id = Uuid::new_v4().to_string();
    let variant_id = Uuid::new_v4().to_string();
    let ptype = dto.product_type.unwrap_or_else(|| "PHYSICAL".into());
    let price = dto.unit_price.unwrap_or(0.0);
    sqlx::query(
        "INSERT INTO products (id, company_id, name, product_type, category_id) VALUES (?1,?2,?3,?4,?5)",
    )
    .bind(&product_id)
    .bind(company_id)
    .bind(dto.name.trim())
    .bind(&ptype)
    .bind(&dto.category_id)
    .execute(pool)
    .await?;
    sqlx::query(
        "INSERT INTO product_variants (id, product_id, sku, barcode, name, unit_id, unit_price) VALUES (?1,?2,?3,?4,?5,?6,?7)",
    )
    .bind(&variant_id)
    .bind(&product_id)
    .bind(&dto.sku)
    .bind(&dto.barcode)
    .bind(dto.name.trim())
    .bind(&dto.unit_id)
    .bind(price)
    .execute(pool)
    .await?;
    Ok(CreateProductResult {
        product_id,
        variant_id,
    })
}

pub async fn products_bulk(
    pool: &LitePool,
    company_id: &str,
    items: Vec<CreateProduct>,
) -> LiteResult<serde_json::Value> {
    let mut out = Vec::new();
    for item in items {
        let sku = item.sku.clone().unwrap_or_default();
        let name = item.name.clone();
        match products_create(pool, company_id, item).await {
            Ok(r) => out.push(serde_json::json!({
                "sku": sku,
                "name": name,
                "ok": true,
                "message": "created",
                "productId": r.product_id,
                "variantId": r.variant_id,
            })),
            Err(e) => out.push(serde_json::json!({
                "sku": sku,
                "name": name,
                "ok": false,
                "message": e.to_string(),
            })),
        }
    }
    Ok(serde_json::json!({ "items": out }))
}

pub async fn products_patch(
    pool: &LitePool,
    company_id: &str,
    product_id: &str,
    dto: PatchProduct,
) -> LiteResult<()> {
    let exists: Option<(String,)> =
        sqlx::query_as("SELECT id FROM products WHERE id = ?1 AND company_id = ?2")
            .bind(product_id)
            .bind(company_id)
            .fetch_optional(pool)
            .await?;
    if exists.is_none() {
        return Err(LiteError::NotFound("product not found".into()));
    }
    if let Some(name) = dto.name {
        sqlx::query("UPDATE products SET name = ?1 WHERE id = ?2")
            .bind(name)
            .bind(product_id)
            .execute(pool)
            .await?;
    }
    if let Some(active) = dto.active {
        sqlx::query("UPDATE products SET active = ?1 WHERE id = ?2")
            .bind(if active { 1 } else { 0 })
            .bind(product_id)
            .execute(pool)
            .await?;
    }
    if let Some(cat) = dto.category_id {
        sqlx::query("UPDATE products SET category_id = ?1 WHERE id = ?2")
            .bind(cat)
            .bind(product_id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub async fn variants_list(pool: &LitePool, product_id: &str) -> LiteResult<Vec<VariantDetail>> {
    let rows = sqlx::query(
        "SELECT id, product_id, name, sku, barcode, unit_price, cost, active FROM product_variants WHERE product_id = ?1",
    )
    .bind(product_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(map_variant).collect())
}

pub async fn variants_create(
    pool: &LitePool,
    product_id: &str,
    dto: CreateVariant,
) -> LiteResult<VariantDetail> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO product_variants (id, product_id, sku, barcode, name, unit_id, unit_price, cost) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
    )
    .bind(&id)
    .bind(product_id)
    .bind(&dto.sku)
    .bind(&dto.barcode)
    .bind(&dto.name)
    .bind(&dto.unit_id)
    .bind(dto.unit_price.unwrap_or(0.0))
    .bind(dto.cost.unwrap_or(0.0))
    .execute(pool)
    .await?;
    variant_get(pool, &id).await
}

pub async fn variant_get(pool: &LitePool, variant_id: &str) -> LiteResult<VariantDetail> {
    let row = sqlx::query(
        "SELECT id, product_id, name, sku, barcode, unit_price, cost, active FROM product_variants WHERE id = ?1",
    )
    .bind(variant_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| LiteError::NotFound("variant not found".into()))?;
    Ok(map_variant(row))
}

pub async fn variant_patch(
    pool: &LitePool,
    variant_id: &str,
    dto: PatchVariant,
) -> LiteResult<VariantDetail> {
    let _ = variant_get(pool, variant_id).await?;
    if let Some(name) = dto.name {
        sqlx::query("UPDATE product_variants SET name = ?1 WHERE id = ?2")
            .bind(name)
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    if let Some(sku) = dto.sku {
        sqlx::query("UPDATE product_variants SET sku = ?1 WHERE id = ?2")
            .bind(sku)
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    if let Some(barcode) = dto.barcode {
        sqlx::query("UPDATE product_variants SET barcode = ?1 WHERE id = ?2")
            .bind(barcode)
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    if let Some(price) = dto.unit_price {
        sqlx::query("UPDATE product_variants SET unit_price = ?1 WHERE id = ?2")
            .bind(price)
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    if let Some(cost) = dto.cost {
        sqlx::query("UPDATE product_variants SET cost = ?1 WHERE id = ?2")
            .bind(cost)
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    if let Some(active) = dto.active {
        sqlx::query("UPDATE product_variants SET active = ?1 WHERE id = ?2")
            .bind(if active { 1 } else { 0 })
            .bind(variant_id)
            .execute(pool)
            .await?;
    }
    variant_get(pool, variant_id).await
}

fn map_variant(r: sqlx::sqlite::SqliteRow) -> VariantDetail {
    VariantDetail {
        id: r.get("id"),
        product_id: r.get("product_id"),
        name: r.get("name"),
        sku: r.get("sku"),
        barcode: r.get("barcode"),
        unit_price: r.get("unit_price"),
        cost: r.get("cost"),
        active: r.get::<i64, _>("active") != 0,
    }
}

pub async fn pack_get(pool: &LitePool, variant_id: &str) -> LiteResult<Vec<PackLine>> {
    let rows = sqlx::query(
        "SELECT child_variant_id, quantity FROM variant_packs WHERE parent_variant_id = ?1",
    )
    .bind(variant_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| PackLine {
            child_variant_id: r.get("child_variant_id"),
            quantity: r.get("quantity"),
        })
        .collect())
}

pub async fn pack_put(pool: &LitePool, variant_id: &str, lines: Vec<PackLine>) -> LiteResult<()> {
    sqlx::query("DELETE FROM variant_packs WHERE parent_variant_id = ?1")
        .bind(variant_id)
        .execute(pool)
        .await?;
    for line in lines {
        sqlx::query(
            "INSERT INTO variant_packs (parent_variant_id, child_variant_id, quantity) VALUES (?1,?2,?3)",
        )
        .bind(variant_id)
        .bind(&line.child_variant_id)
        .bind(line.quantity)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn named_list(pool: &LitePool, company_id: &str, table: &str) -> LiteResult<Vec<NamedRow>> {
    let sql = if table == "units" {
        format!("SELECT id, name, symbol, active FROM {table} WHERE company_id = ?1 ORDER BY name")
    } else {
        format!(
            "SELECT id, name, NULL as symbol, active FROM {table} WHERE company_id = ?1 ORDER BY name"
        )
    };
    let rows = sqlx::query(&sql).bind(company_id).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .map(|r| NamedRow {
            id: r.get("id"),
            name: r.get("name"),
            symbol: r.get("symbol"),
            active: r.get::<i64, _>("active") != 0,
        })
        .collect())
}

async fn named_create(
    pool: &LitePool,
    company_id: &str,
    table: &str,
    dto: NamedCreate,
) -> LiteResult<NamedRow> {
    if dto.name.trim().is_empty() {
        return Err(LiteError::BadRequest("name required".into()));
    }
    let id = Uuid::new_v4().to_string();
    if table == "units" {
        sqlx::query("INSERT INTO units (id, company_id, name, symbol) VALUES (?1,?2,?3,?4)")
            .bind(&id)
            .bind(company_id)
            .bind(dto.name.trim())
            .bind(dto.symbol.as_deref().unwrap_or("UN"))
            .execute(pool)
            .await?;
    } else {
        let sql = format!("INSERT INTO {table} (id, company_id, name) VALUES (?1,?2,?3)");
        sqlx::query(&sql)
            .bind(&id)
            .bind(company_id)
            .bind(dto.name.trim())
            .execute(pool)
            .await?;
    }
    Ok(NamedRow {
        id,
        name: dto.name.trim().into(),
        symbol: dto.symbol,
        active: true,
    })
}

async fn named_patch(
    pool: &LitePool,
    company_id: &str,
    table: &str,
    id: &str,
    dto: NamedPatch,
) -> LiteResult<()> {
    let sql = format!("SELECT id FROM {table} WHERE id = ?1 AND company_id = ?2");
    let exists: Option<(String,)> = sqlx::query_as(&sql)
        .bind(id)
        .bind(company_id)
        .fetch_optional(pool)
        .await?;
    if exists.is_none() {
        return Err(LiteError::NotFound(format!("{table} not found")));
    }
    if let Some(name) = dto.name {
        let sql = format!("UPDATE {table} SET name = ?1 WHERE id = ?2");
        sqlx::query(&sql).bind(name).bind(id).execute(pool).await?;
    }
    if let Some(symbol) = dto.symbol {
        if table == "units" {
            sqlx::query("UPDATE units SET symbol = ?1 WHERE id = ?2")
                .bind(symbol)
                .bind(id)
                .execute(pool)
                .await?;
        }
    }
    if let Some(active) = dto.active {
        let sql = format!("UPDATE {table} SET active = ?1 WHERE id = ?2");
        sqlx::query(&sql)
            .bind(if active { 1 } else { 0 })
            .bind(id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

async fn named_delete(pool: &LitePool, company_id: &str, table: &str, id: &str) -> LiteResult<()> {
    let sql = format!("DELETE FROM {table} WHERE id = ?1 AND company_id = ?2");
    let res = sqlx::query(&sql)
        .bind(id)
        .bind(company_id)
        .execute(pool)
        .await;
    match res {
        Ok(r) if r.rows_affected() > 0 => Ok(()),
        Ok(_) => Err(LiteError::NotFound(format!("{table} not found"))),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("FOREIGN KEY") || msg.contains("constraint") {
                Err(LiteError::BadRequest(format!("{table} in use")))
            } else {
                Err(LiteError::Db(e))
            }
        }
    }
}

pub async fn units_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<NamedRow>> {
    named_list(pool, company_id, "units").await
}
pub async fn units_create(pool: &LitePool, company_id: &str, dto: NamedCreate) -> LiteResult<NamedRow> {
    named_create(pool, company_id, "units", dto).await
}
pub async fn units_patch(pool: &LitePool, company_id: &str, id: &str, dto: NamedPatch) -> LiteResult<()> {
    named_patch(pool, company_id, "units", id, dto).await
}

pub async fn storages_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<NamedRow>> {
    named_list(pool, company_id, "storages").await
}
pub async fn storages_create(pool: &LitePool, company_id: &str, dto: NamedCreate) -> LiteResult<NamedRow> {
    named_create(pool, company_id, "storages", dto).await
}
pub async fn storages_patch(pool: &LitePool, company_id: &str, id: &str, dto: NamedPatch) -> LiteResult<()> {
    named_patch(pool, company_id, "storages", id, dto).await
}

pub async fn categories_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<NamedRow>> {
    named_list(pool, company_id, "categories").await
}
pub async fn categories_create(pool: &LitePool, company_id: &str, dto: NamedCreate) -> LiteResult<NamedRow> {
    named_create(pool, company_id, "categories", dto).await
}
pub async fn categories_patch(pool: &LitePool, company_id: &str, id: &str, dto: NamedPatch) -> LiteResult<()> {
    named_patch(pool, company_id, "categories", id, dto).await
}
pub async fn categories_delete(pool: &LitePool, company_id: &str, id: &str) -> LiteResult<()> {
    named_delete(pool, company_id, "categories", id).await
}

pub async fn attributes_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<NamedRow>> {
    named_list(pool, company_id, "attributes").await
}
pub async fn attributes_create(pool: &LitePool, company_id: &str, dto: NamedCreate) -> LiteResult<NamedRow> {
    named_create(pool, company_id, "attributes", dto).await
}
pub async fn attributes_patch(pool: &LitePool, company_id: &str, id: &str, dto: NamedPatch) -> LiteResult<()> {
    named_patch(pool, company_id, "attributes", id, dto).await
}
pub async fn attributes_delete(pool: &LitePool, company_id: &str, id: &str) -> LiteResult<()> {
    named_delete(pool, company_id, "attributes", id).await
}
