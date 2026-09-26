use serde::Serialize;
use tauri::State;

use crate::lite::application::{admin, auth, catalog, commerce, health, ops, reports, seed, stock};
use crate::lite::db::LitePool;
use crate::lite::error::LiteError;

pub type CmdResult<T> = Result<T, String>;

fn map_err(e: LiteError) -> String {
    e.into_command_err()
}

async fn ctx(pool: &LitePool, bearer: Option<String>) -> Result<(String, String), String> {
    let user_id = auth::require_user(pool, bearer.as_deref())
        .await
        .map_err(map_err)?;
    let company_id = auth::company_id_for_user(pool, &user_id)
        .await
        .map_err(map_err)?;
    Ok((user_id, company_id))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Items<T: Serialize> {
    pub items: T,
}

#[tauri::command]
pub async fn lite_health(pool: State<'_, LitePool>) -> CmdResult<health::HealthDto> {
    health::health(&pool).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_auth_login(
    pool: State<'_, LitePool>,
    payload: auth::LoginRequest,
) -> CmdResult<auth::LoginResponse> {
    auth::login(&pool, payload).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_auth_change_password(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: auth::ChangePasswordRequest,
) -> CmdResult<()> {
    let user_id = auth::require_user(&pool, bearer.as_deref())
        .await
        .map_err(map_err)?;
    auth::change_password(&pool, &user_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_seed_run(pool: State<'_, LitePool>) -> CmdResult<seed::SeedResult> {
    seed::run_seed(&pool).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_pos_catalog(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    q: Option<String>,
    page: Option<i64>,
    #[allow(non_snake_case)]
    pageSize: Option<i64>,
) -> CmdResult<catalog::PosCatalogPage> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::pos_catalog(
        &pool,
        &company_id,
        catalog::PosCatalogQuery {
            q,
            page,
            page_size: pageSize,
        },
    )
    .await
    .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_products_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<catalog::ProductRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::products_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_products_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: catalog::CreateProduct,
) -> CmdResult<catalog::CreateProductResult> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::products_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_products_bulk(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: serde_json::Value,
) -> CmdResult<serde_json::Value> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    let items: Vec<catalog::CreateProduct> = if let Some(lines) = payload.get("lines") {
        serde_json::from_value(lines.clone()).map_err(|e| e.to_string())?
    } else if payload.is_array() {
        serde_json::from_value(payload).map_err(|e| e.to_string())?
    } else {
        return Err(LiteError::BadRequest("lines required".into()).into_command_err());
    };
    catalog::products_bulk(&pool, &company_id, items)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_products_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    product_id: String,
    payload: catalog::PatchProduct,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::products_patch(&pool, &company_id, &product_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_variants_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    product_id: String,
) -> CmdResult<Items<Vec<catalog::VariantDetail>>> {
    let _ = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::variants_list(&pool, &product_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_variants_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    product_id: String,
    payload: catalog::CreateVariant,
) -> CmdResult<catalog::VariantDetail> {
    let _ = ctx(&pool, bearer).await?;
    catalog::variants_create(&pool, &product_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_variant_get(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    variant_id: String,
) -> CmdResult<catalog::VariantDetail> {
    let _ = ctx(&pool, bearer).await?;
    catalog::variant_get(&pool, &variant_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_variant_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    variant_id: String,
    payload: catalog::PatchVariant,
) -> CmdResult<catalog::VariantDetail> {
    let _ = ctx(&pool, bearer).await?;
    catalog::variant_patch(&pool, &variant_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_pack_get(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    variant_id: String,
) -> CmdResult<Items<Vec<catalog::PackLine>>> {
    let _ = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::pack_get(&pool, &variant_id).await.map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_pack_put(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    variant_id: String,
    payload: Vec<catalog::PackLine>,
) -> CmdResult<()> {
    let _ = ctx(&pool, bearer).await?;
    catalog::pack_put(&pool, &variant_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_units_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<catalog::NamedRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::units_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_units_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: catalog::NamedCreate,
) -> CmdResult<catalog::NamedRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::units_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_units_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
    payload: catalog::NamedPatch,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::units_patch(&pool, &company_id, &id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_storages_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<catalog::NamedRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::storages_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_storages_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: catalog::NamedCreate,
) -> CmdResult<catalog::NamedRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::storages_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_storages_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
    payload: catalog::NamedPatch,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::storages_patch(&pool, &company_id, &id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_categories_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<catalog::NamedRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::categories_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_categories_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: catalog::NamedCreate,
) -> CmdResult<catalog::NamedRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::categories_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_categories_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
    payload: catalog::NamedPatch,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::categories_patch(&pool, &company_id, &id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_categories_delete(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::categories_delete(&pool, &company_id, &id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_attributes_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<catalog::NamedRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: catalog::attributes_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_attributes_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: catalog::NamedCreate,
) -> CmdResult<catalog::NamedRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::attributes_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_attributes_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
    payload: catalog::NamedPatch,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::attributes_patch(&pool, &company_id, &id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_attributes_delete(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    id: String,
) -> CmdResult<()> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    catalog::attributes_delete(&pool, &company_id, &id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_stock_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<stock::StockItem>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: stock::stock_list(&pool, &company_id).await.map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_stock_adjust(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: stock::StockAdjust,
) -> CmdResult<()> {
    let _ = ctx(&pool, bearer).await?;
    stock::stock_adjust(&pool, payload).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_stock_delta(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: stock::StockDelta,
) -> CmdResult<()> {
    let _ = ctx(&pool, bearer).await?;
    stock::stock_delta(&pool, payload).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_stock_transfer(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: stock::StockTransfer,
) -> CmdResult<()> {
    let _ = ctx(&pool, bearer).await?;
    stock::stock_transfer(&pool, payload).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_receptions_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<stock::ReceptionRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: stock::receptions_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_receptions_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: stock::ReceptionCreate,
) -> CmdResult<stock::ReceptionRow> {
    let (user_id, company_id) = ctx(&pool, bearer).await?;
    stock::receptions_create(&pool, &company_id, &user_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_pos_sale(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: commerce::SaleRequest,
) -> CmdResult<commerce::SaleRow> {
    let (user_id, company_id) = ctx(&pool, bearer).await?;
    commerce::pos_sale(&pool, &company_id, &user_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_sales_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<commerce::SaleRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: commerce::sales_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_sales_get(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    sale_id: String,
) -> CmdResult<commerce::SaleRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    commerce::sales_get(&pool, &company_id, &sale_id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_sales_void(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    sale_id: String,
) -> CmdResult<commerce::SaleRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    commerce::sales_void(&pool, &company_id, &sale_id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_customers_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<commerce::PartnerRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: commerce::customers_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_suppliers_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<commerce::PartnerRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: commerce::suppliers_list(&pool, &company_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_ops_cash_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<ops::CashSessionRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: ops::cash_list(&pool, &company_id).await.map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_ops_cash_movements(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    session_id: String,
) -> CmdResult<Items<Vec<ops::CashMovementRow>>> {
    let _ = ctx(&pool, bearer).await?;
    Ok(Items {
        items: ops::cash_movements(&pool, &session_id)
            .await
            .map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_ops_cash_open(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: ops::OpenCash,
) -> CmdResult<ops::CashSessionRow> {
    let (user_id, company_id) = ctx(&pool, bearer).await?;
    ops::cash_open(&pool, &company_id, &user_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_ops_cash_close_summary(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    session_id: String,
) -> CmdResult<ops::CashCloseSummary> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    ops::cash_close_summary(&pool, &company_id, &session_id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_ops_cash_close(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    session_id: String,
    payload: ops::CloseCash,
) -> CmdResult<ops::CashSessionRow> {
    let (user_id, company_id) = ctx(&pool, bearer).await?;
    ops::cash_close(&pool, &company_id, &user_id, &session_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_ops_cash_deposit(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    session_id: String,
    payload: ops::CashAmount,
) -> CmdResult<ops::CashMovementRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    ops::cash_deposit(&pool, &company_id, &session_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_ops_cash_withdrawal(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    session_id: String,
    payload: ops::CashAmount,
) -> CmdResult<ops::CashMovementRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    ops::cash_withdrawal(&pool, &company_id, &session_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_dashboard(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<admin::DashboardDto> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::dashboard(&pool, &company_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_company_get(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<admin::CompanySummaryDto> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::company_get(&pool, &company_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_company_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: admin::CompanyPatch,
) -> CmdResult<admin::CompanySummaryDto> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::company_patch(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_pos_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<admin::PosRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: admin::pos_list(&pool, &company_id).await.map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_pos_current_get(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<admin::PosRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::pos_current(&pool, &company_id).await.map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_pos_current_patch(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: admin::PosCurrentPatch,
) -> CmdResult<admin::PosRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::pos_current_patch(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_users_list(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
) -> CmdResult<Items<Vec<admin::UserRow>>> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    Ok(Items {
        items: admin::users_list(&pool, &company_id).await.map_err(map_err)?,
    })
}

#[tauri::command]
pub async fn lite_admin_users_create(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    payload: admin::UserCreate,
) -> CmdResult<admin::UserRow> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    admin::users_create(&pool, &company_id, payload)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_admin_users_delete(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    user_id: String,
) -> CmdResult<()> {
    let (actor_id, company_id) = ctx(&pool, bearer).await?;
    admin::users_delete(&pool, &company_id, &user_id, &actor_id)
        .await
        .map_err(map_err)
}

#[tauri::command]
pub async fn lite_sales_report_run(
    pool: State<'_, LitePool>,
    bearer: Option<String>,
    #[allow(non_snake_case)]
    reportId: String,
    payload: Option<serde_json::Value>,
) -> CmdResult<serde_json::Value> {
    let (_, company_id) = ctx(&pool, bearer).await?;
    let params = payload
        .as_ref()
        .and_then(|p| p.get("params"))
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));
    reports::run_report(&pool, &company_id, &reportId, params)
        .await
        .map_err(map_err)
}
