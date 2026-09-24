use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedResult {
    pub ok: bool,
    pub company_id: String,
    pub admin_username: String,
    pub already_seeded: bool,
    pub message: String,
    pub admin_user_name: String,
}

pub async fn run_seed(pool: &LitePool) -> LiteResult<SeedResult> {
    let existing: Option<(String,)> =
        sqlx::query_as("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
            .fetch_optional(pool)
            .await?;
    if existing.is_some() {
        let company_id: String = sqlx::query_scalar("SELECT id FROM companies LIMIT 1")
            .fetch_one(pool)
            .await?;
        return Ok(SeedResult {
            ok: true,
            company_id,
            admin_username: "admin".into(),
            already_seeded: true,
            message: "already seeded".into(),
            admin_user_name: "admin".into(),
        });
    }

    let company_id = Uuid::new_v4().to_string();
    let branch_id = Uuid::new_v4().to_string();
    let pos_id = Uuid::new_v4().to_string();
    let storage_id = Uuid::new_v4().to_string();
    let unit_id = Uuid::new_v4().to_string();
    let cat_id = Uuid::new_v4().to_string();
    let admin_id = Uuid::new_v4().to_string();
    let cajero_id = Uuid::new_v4().to_string();
    let product_id = Uuid::new_v4().to_string();
    let variant_id = Uuid::new_v4().to_string();
    let customer_id = Uuid::new_v4().to_string();
    let supplier_id = Uuid::new_v4().to_string();

    let admin_hash = bcrypt::hash("admin1234", 12)
        .map_err(|e| LiteError::Other(anyhow::anyhow!(e)))?;
    let cajero_hash = bcrypt::hash("cajero1234", 12)
        .map_err(|e| LiteError::Other(anyhow::anyhow!(e)))?;

    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO companies (id, name, razon_social, nombre_fantasia, rut) VALUES (?1,?2,?2,?2,'76.000.000-0')",
    )
    .bind(&company_id)
    .bind("KaiStore Lite")
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO branches (id, company_id, name) VALUES (?1,?2,'Principal')")
        .bind(&branch_id)
        .bind(&company_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO points_of_sale (id, company_id, branch_id, name, code, is_current) VALUES (?1,?2,?3,'Caja 1','POS-1',1)",
    )
    .bind(&pos_id)
    .bind(&company_id)
    .bind(&branch_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO storages (id, company_id, name) VALUES (?1,?2,'Bodega principal')")
        .bind(&storage_id)
        .bind(&company_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("INSERT INTO units (id, company_id, name, symbol) VALUES (?1,?2,'Unidad','UN')")
        .bind(&unit_id)
        .bind(&company_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("INSERT INTO categories (id, company_id, name) VALUES (?1,?2,'General')")
        .bind(&cat_id)
        .bind(&company_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO users (id, company_id, username, email, name, password_hash) VALUES (?1,?2,'admin','admin@lite.local','Administrador',?3)",
    )
    .bind(&admin_id)
    .bind(&company_id)
    .bind(&admin_hash)
    .execute(&mut *tx)
    .await?;
    sqlx::query("INSERT INTO user_roles (user_id, role) VALUES (?1,'OWNER')")
        .bind(&admin_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO user_roles (user_id, role) VALUES (?1,'ADMIN')")
        .bind(&admin_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO users (id, company_id, username, email, name, password_hash) VALUES (?1,?2,'cajero','cajero@lite.local','Cajero',?3)",
    )
    .bind(&cajero_id)
    .bind(&company_id)
    .bind(&cajero_hash)
    .execute(&mut *tx)
    .await?;
    sqlx::query("INSERT INTO user_roles (user_id, role) VALUES (?1,'CASHIER')")
        .bind(&cajero_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO products (id, company_id, name, product_type, category_id) VALUES (?1,?2,'Producto demo','PHYSICAL',?3)",
    )
    .bind(&product_id)
    .bind(&company_id)
    .bind(&cat_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO product_variants (id, product_id, sku, name, unit_id, unit_price, cost) VALUES (?1,?2,'SKU-001','Producto demo',?3,1000,500)",
    )
    .bind(&variant_id)
    .bind(&product_id)
    .bind(&unit_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO stock_levels (variant_id, storage_id, quantity) VALUES (?1,?2,10)")
        .bind(&variant_id)
        .bind(&storage_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO customers (id, company_id, name, document_number) VALUES (?1,?2,'Cliente demo','1-9')",
    )
    .bind(&customer_id)
    .bind(&company_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO suppliers (id, company_id, name, document_number) VALUES (?1,?2,'Proveedor demo','2-7')",
    )
    .bind(&supplier_id)
    .bind(&company_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("INSERT INTO app_meta (key, value) VALUES ('seeded','1')")
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(SeedResult {
        ok: true,
        company_id,
        admin_username: "admin".into(),
        already_seeded: false,
        message: "seed completed".into(),
        admin_user_name: "admin".into(),
    })
}
