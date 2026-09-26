//! Integration tests for Lite sqlx backend (matriz pasos 01–07).

use crate::lite::application::{admin, auth, catalog, commerce, health, ops, reports, seed, stock};
use crate::lite::db::pool::{open_memory_pool, open_pool};
use crate::lite::db::test_support::lite_test_pool;
use crate::lite::error::LiteError;
use crate::lite::db::LitePool;

#[tokio::test]
async fn lite_health_ok() {
    let pool = lite_test_pool().await;
    let h = health::health(&pool).await.unwrap();
    assert!(h.ok);
    assert_eq!(h.edition, "lite-rust");
}

#[tokio::test]
async fn lite_migrate_empty_ok() {
    let pool = open_memory_pool().await.unwrap();
    let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(n > 5);
}

#[tokio::test]
async fn lite_migrate_idempotent() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("m.sqlite");
    let _ = open_pool(&path).await.unwrap();
    let _ = open_pool(&path).await.unwrap();
}

#[tokio::test]
async fn lite_auth_login_ok() {
    let pool = lite_test_pool().await;
    let res = auth::login(
        &pool,
        auth::LoginRequest {
            email: "admin".into(),
            password: "admin1234".into(),
        },
    )
    .await
    .unwrap();
    assert!(!res.access_token.is_empty());
    assert!(res.user.roles.iter().any(|r| r == "ADMIN" || r == "OWNER"));
}

#[tokio::test]
async fn lite_auth_login_bad() {
    let pool = lite_test_pool().await;
    let err = auth::login(
        &pool,
        auth::LoginRequest {
            email: "admin".into(),
            password: "wrong".into(),
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::Unauthorized(_)));
}

#[tokio::test]
async fn lite_auth_change_password_ok() {
    let pool = lite_test_pool().await;
    let login = auth::login(
        &pool,
        auth::LoginRequest {
            email: "admin".into(),
            password: "admin1234".into(),
        },
    )
    .await
    .unwrap();
    auth::change_password(
        &pool,
        &login.access_token,
        auth::ChangePasswordRequest {
            current_password: "admin1234".into(),
            new_password: "admin9999".into(),
        },
    )
    .await
    .unwrap();
    auth::login(
        &pool,
        auth::LoginRequest {
            email: "admin".into(),
            password: "admin9999".into(),
        },
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn lite_auth_change_password_bad() {
    let pool = lite_test_pool().await;
    let login = auth::login(
        &pool,
        auth::LoginRequest {
            email: "admin".into(),
            password: "admin1234".into(),
        },
    )
    .await
    .unwrap();
    let err = auth::change_password(
        &pool,
        &login.access_token,
        auth::ChangePasswordRequest {
            current_password: "nope".into(),
            new_password: "admin9999".into(),
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::Unauthorized(_)));
}

#[tokio::test]
async fn lite_seed_run_ok() {
    let pool = open_memory_pool().await.unwrap();
    let a = seed::run_seed(&pool).await.unwrap();
    assert!(!a.already_seeded);
    let b = seed::run_seed(&pool).await.unwrap();
    assert!(b.already_seeded);
}

async fn company(pool: &LitePool) -> String {
    sqlx::query_scalar::<_, String>("SELECT id FROM companies LIMIT 1")
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn admin_id(pool: &LitePool) -> String {
    sqlx::query_scalar::<_, String>("SELECT id FROM users WHERE username='admin'")
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn variant_storage(pool: &LitePool) -> (String, String) {
    let v = sqlx::query_scalar::<_, String>("SELECT id FROM product_variants LIMIT 1")
        .fetch_one(pool)
        .await
        .unwrap();
    let s = sqlx::query_scalar::<_, String>("SELECT id FROM storages LIMIT 1")
        .fetch_one(pool)
        .await
        .unwrap();
    (v, s)
}

#[tokio::test]
async fn lite_pos_catalog_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let page = catalog::pos_catalog(&pool, &c, catalog::PosCatalogQuery::default())
        .await
        .unwrap();
    assert!(!page.items.is_empty());
    assert!(page.total >= 1);
    assert!(!page.items[0].id.is_empty());
    assert_eq!(page.items[0].id, page.items[0].variant_id);
}

#[tokio::test]
async fn lite_pos_catalog_filter_page() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let page = catalog::pos_catalog(
        &pool,
        &c,
        catalog::PosCatalogQuery {
            q: Some("200-Pesos".into()),
            page: Some(1),
            page_size: Some(10),
        },
    )
    .await
    .unwrap();
    assert!(page.total >= 1);
    assert!(!page.items.is_empty());
}

#[tokio::test]
async fn lite_admin_products_list_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    assert!(!catalog::products_list(&pool, &c).await.unwrap().is_empty());
}

#[tokio::test]
async fn lite_admin_products_create_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let r = catalog::products_create(
        &pool,
        &c,
        catalog::CreateProduct {
            name: "Nuevo".into(),
            product_type: None,
            sku: Some("N-1".into()),
            barcode: None,
            unit_price: Some(500.0),
            category_id: None,
            unit_id: None,
        },
    )
    .await
    .unwrap();
    assert!(!r.product_id.is_empty());
    let qty: Option<f64> = sqlx::query_scalar(
        "SELECT quantity FROM stock_levels WHERE variant_id = ?1",
    )
    .bind(&r.variant_id)
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(qty, Some(0.0));
    let got = catalog::variant_get(&pool, &r.variant_id).await.unwrap();
    assert_eq!(got.base_price, 500.0);
    assert_eq!(got.variant_id, r.variant_id);
    assert!(got.is_active);
    catalog::variant_patch(
        &pool,
        &r.variant_id,
        catalog::PatchVariant {
            name: None,
            sku: None,
            barcode: None,
            unit_price: Some(750.0),
            cost: None,
            active: None,
            attribute_values: None,
        },
    )
    .await
    .unwrap();
    let patched = catalog::variant_get(&pool, &r.variant_id).await.unwrap();
    assert_eq!(patched.unit_price, 750.0);
    assert_eq!(patched.base_price, 750.0);
}

#[tokio::test]
async fn lite_admin_products_create_bad() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let err = catalog::products_create(
        &pool,
        &c,
        catalog::CreateProduct {
            name: "  ".into(),
            product_type: None,
            sku: None,
            barcode: None,
            unit_price: None,
            category_id: None,
            unit_id: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));
}

#[tokio::test]
async fn lite_admin_products_bulk_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let r = catalog::products_bulk(
        &pool,
        &c,
        vec![catalog::CreateProduct {
            name: "Bulk1".into(),
            product_type: None,
            sku: None,
            barcode: None,
            unit_price: Some(1.0),
            category_id: None,
            unit_id: None,
        }],
    )
    .await
    .unwrap();
    assert!(r.get("items").unwrap().as_array().unwrap().len() == 1);
}

#[tokio::test]
async fn lite_admin_products_patch_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let p = catalog::products_list(&pool, &c).await.unwrap();
    catalog::products_patch(
        &pool,
        &c,
        &p[0].id,
        catalog::PatchProduct {
            name: Some("Renamed".into()),
            active: None,
            category_id: None,
        },
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn lite_admin_products_patch_404() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let err = catalog::products_patch(
        &pool,
        &c,
        "missing",
        catalog::PatchProduct {
            name: Some("x".into()),
            active: None,
            category_id: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::NotFound(_)));
}

#[tokio::test]
async fn lite_admin_variants_flow() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let p = catalog::products_list(&pool, &c).await.unwrap();
    let list = catalog::variants_list(&pool, &p[0].id).await.unwrap();
    assert!(!list.is_empty());
    let created = catalog::variants_create(
        &pool,
        &p[0].id,
        catalog::CreateVariant {
            name: Some("V2".into()),
            sku: Some("V2".into()),
            barcode: None,
            unit_price: Some(10.0),
            cost: None,
            unit_id: None,
            active: None,
            attribute_values: None,
        },
    )
    .await
    .unwrap();
    let got = catalog::variant_get(&pool, &created.id).await.unwrap();
    assert_eq!(got.name, "V2");
    catalog::variant_patch(
        &pool,
        &created.id,
        catalog::PatchVariant {
            name: Some("V2b".into()),
            sku: None,
            barcode: None,
            unit_price: None,
            cost: None,
            active: None,
            attribute_values: None,
        },
    )
    .await
    .unwrap();
    let err = catalog::variant_get(&pool, "nope").await.unwrap_err();
    assert!(matches!(err, LiteError::NotFound(_)));
    catalog::pack_put(
        &pool,
        &created.id,
        vec![catalog::PackLine {
            child_variant_id: list[0].id.clone(),
            quantity: 2.0,
        }],
    )
    .await
    .unwrap();
    assert_eq!(catalog::pack_get(&pool, &created.id).await.unwrap().len(), 1);
}

#[tokio::test]
async fn lite_admin_taxonomy_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    assert!(!catalog::units_list(&pool, &c).await.unwrap().is_empty());
    assert!(!catalog::storages_list(&pool, &c).await.unwrap().is_empty());
    assert!(!catalog::categories_list(&pool, &c).await.unwrap().is_empty());
    let attr = catalog::attributes_create(
        &pool,
        &c,
        catalog::NamedCreate {
            name: "Color".into(),
            symbol: None,
        },
    )
    .await
    .unwrap();
    catalog::attributes_patch(
        &pool,
        &c,
        &attr.id,
        catalog::NamedPatch {
            name: Some("Colour".into()),
            symbol: None,
            active: None,
        },
    )
    .await
    .unwrap();
    catalog::attributes_delete(&pool, &c, &attr.id).await.unwrap();
    let cat = catalog::categories_create(
        &pool,
        &c,
        catalog::NamedCreate {
            name: "TempCat".into(),
            symbol: None,
        },
    )
    .await
    .unwrap();
    catalog::categories_delete(&pool, &c, &cat.id).await.unwrap();
}

#[tokio::test]
async fn lite_admin_stock_flow() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let (vid, sid) = variant_storage(&pool).await;
    assert!(!stock::stock_list(&pool, &c).await.unwrap().is_empty());
    stock::stock_adjust(
        &pool,
        stock::StockAdjust {
            variant_id: vid.clone(),
            storage_id: sid.clone(),
            quantity: 20.0,
            reason: Some("set".into()),
        },
    )
    .await
    .unwrap();
    let err = stock::stock_adjust(
        &pool,
        stock::StockAdjust {
            variant_id: vid.clone(),
            storage_id: sid.clone(),
            quantity: -1.0,
            reason: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));
    stock::stock_delta(
        &pool,
        stock::StockDelta {
            variant_id: vid.clone(),
            storage_id: sid.clone(),
            delta: 1.0,
            reason: None,
        },
    )
    .await
    .unwrap();
    let s2 = catalog::storages_create(
        &pool,
        &c,
        catalog::NamedCreate {
            name: "Secundaria".into(),
            symbol: None,
        },
    )
    .await
    .unwrap();
    stock::stock_transfer(
        &pool,
        stock::StockTransfer {
            variant_id: vid.clone(),
            from_storage_id: sid.clone(),
            to_storage_id: s2.id.clone(),
            quantity: 2.0,
        },
    )
    .await
    .unwrap();
    let err = stock::stock_transfer(
        &pool,
        stock::StockTransfer {
            variant_id: vid.clone(),
            from_storage_id: sid.clone(),
            to_storage_id: sid.clone(),
            quantity: 1.0,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));
        stock::receptions_create(
            &pool,
            &c,
            &admin_id(&pool).await,
            stock::ReceptionCreate {
                storage_id: Some(sid),
                supplier_id: None,
                supplier_name: Some("Prov Test".into()),
                note: None,
                lines: vec![stock::ReceptionLineIn {
                    variant_id: vid,
                    quantity: 3.0,
                    unit_cost: Some(1.0),
                }],
            },
        )
        .await
        .unwrap();
        assert!(!stock::receptions_list(&pool, &c).await.unwrap().is_empty());
        let err = stock::receptions_create(
            &pool,
            &c,
            &admin_id(&pool).await,
            stock::ReceptionCreate {
                storage_id: None,
                supplier_id: None,
                supplier_name: None,
                note: None,
                lines: vec![],
            },
        )
        .await
        .unwrap_err();
        assert!(matches!(err, LiteError::BadRequest(_)));
    }

#[tokio::test]
async fn lite_pos_sale_and_cash() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let (vid, _) = variant_storage(&pool).await;

    let err = commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: vid.clone(),
                quantity: 1.0,
                unit_price: None,
                name: None,
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 1000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));

    let sess = ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: Some(100.0),
        },
    )
    .await
    .unwrap();
    let err = ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::Conflict(_)));

    let sale = commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: vid.clone(),
                quantity: 1.0,
                unit_price: None,
                name: None,
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 1000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: Some("CASH".into()),
            total: Some(1000.0),
        },
    )
    .await
    .unwrap();
    assert_eq!(sale.status, "COMPLETED");

    // qty alias via serde_json
    let sale2: commerce::SaleRequest = serde_json::from_value(serde_json::json!({
        "lines": [{ "variantId": vid, "qty": 1, "unitPrice": 1000 }],
        "payments": [{ "method": "CASH", "amount": 1000 }],
        "method": "CASH",
        "total": 1000
    }))
    .unwrap();
    assert_eq!(sale2.lines[0].quantity, 1.0);

    // Oversell is allowed (negative stock).
    let oversell = commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: vid.clone(),
                quantity: 99999.0,
                unit_price: None,
                name: None,
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 1.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(oversell.status, "COMPLETED");

    let got = commerce::sales_get(&pool, &c, &sale.id).await.unwrap();
    assert_eq!(got.id, sale.id);
    let err = commerce::sales_get(&pool, &c, "nope").await.unwrap_err();
    assert!(matches!(err, LiteError::NotFound(_)));
    assert!(!commerce::sales_list(&pool, &c).await.unwrap().is_empty());
    commerce::sales_void(&pool, &c, &sale.id).await.unwrap();
    let err = commerce::sales_void(&pool, &c, &sale.id).await.unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));

    assert!(!commerce::customers_list(&pool, &c).await.unwrap().is_empty());
    assert!(!commerce::suppliers_list(&pool, &c).await.unwrap().is_empty());

    ops::cash_deposit(
        &pool,
        &c,
        &sess.id,
        ops::CashAmount {
            amount: 50.0,
            note: None,
        },
    )
    .await
    .unwrap();
    ops::cash_withdrawal(
        &pool,
        &c,
        &sess.id,
        ops::CashAmount {
            amount: 10.0,
            note: Some("out".into()),
        },
    )
    .await
    .unwrap();
    assert!(!ops::cash_movements(&pool, &sess.id).await.unwrap().is_empty());
    assert!(!ops::cash_list(&pool, &c).await.unwrap().is_empty());
    ops::cash_close(
        &pool,
        &c,
        &uid,
        &sess.id,
        ops::CloseCash {
            counted: None,
            closing_amount: Some(140.0),
            counts_by_method: None,
        },
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn lite_admin_users_company_dashboard() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let dash = admin::dashboard(&pool, &c).await.unwrap();
    assert!(dash.products >= 1);
    assert_eq!(dash.sales_by_month.len(), 12);
    assert_eq!(dash.sales_today_count, dash.sales_today);
    assert!(dash.sales_mtd_amount >= 0.0);
    let co = admin::company_get(&pool, &c).await.unwrap();
    assert_eq!(co.company.id, c);
    admin::company_patch(
        &pool,
        &c,
        admin::CompanyPatch {
            name: Some("Lite Co".into()),
            razon_social: None,
            nombre_fantasia: None,
            rut: None,
            business_activity: None,
            address: None,
            commune: None,
            city: None,
            phone: None,
            mail: None,
        },
    )
    .await
    .unwrap();
    let patched = admin::company_get(&pool, &c).await.unwrap();
    assert_eq!(patched.company.name.as_deref(), Some("Lite Co"));
    assert!(!admin::pos_list(&pool, &c).await.unwrap().is_empty());
    let cur = admin::pos_current(&pool, &c).await.unwrap();
    admin::pos_current_patch(
        &pool,
        &c,
        admin::PosCurrentPatch {
            point_of_sale_id: Some(cur.id.clone()),
            show_product_search: Some(false),
            enabled_payment_methods: Some(vec!["CASH".into(), "TRANSFER".into()]),
        },
    )
    .await
    .unwrap();
    let after = admin::pos_current(&pool, &c).await.unwrap();
    assert!(!after.show_product_search);
    assert_eq!(
        after.enabled_payment_methods,
        vec!["CASH".to_string(), "TRANSFER".to_string()]
    );
    assert!(!admin::users_list(&pool, &c).await.unwrap().is_empty());
    let u = admin::users_create(
        &pool,
        &c,
        admin::UserCreate {
            username: "extra".into(),
            name: "Extra".into(),
            password: "extra1234".into(),
            email: None,
            roles: Some(vec!["CASHIER".into()]),
        },
    )
    .await
    .unwrap();
    let err = admin::users_create(
        &pool,
        &c,
        admin::UserCreate {
            username: "extra".into(),
            name: "Extra".into(),
            password: "extra1234".into(),
            email: None,
            roles: None,
        },
    )
    .await
    .unwrap_err();
    assert!(matches!(err, LiteError::Conflict(_)));
    admin::users_delete(&pool, &c, &u.id, &uid).await.unwrap();
    let err = admin::users_delete(&pool, &c, &uid, &uid).await.unwrap_err();
    assert!(matches!(err, LiteError::BadRequest(_)));
}

#[tokio::test]
async fn lite_sales_report_run_ok() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let vid: String = sqlx::query_scalar("SELECT id FROM product_variants LIMIT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: Some(0.0),
        },
    )
    .await
    .unwrap();
    commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: vid.clone(),
                quantity: 2.0,
                unit_price: Some(1500.0),
                name: None,
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 3000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();

    let to = chrono::Local::now().format("%Y-%m-%d").to_string();
    let from = format!("{}-01", &to[..7]);
    let product_id: String = sqlx::query_scalar(
        "SELECT product_id FROM product_variants WHERE id = ?1",
    )
    .bind(&vid)
    .fetch_one(&pool)
    .await
    .unwrap();

    let cases = [
        (
            "sales-by-period",
            serde_json::json!({
                "dateFrom": from, "dateTo": to, "granularity": "day",
                "compareWith": "previousPeriod"
            }),
        ),
        (
            "sales-detail",
            serde_json::json!({ "dateFrom": from, "dateTo": to, "granularity": "day" }),
        ),
        (
            "sales-period-compare",
            serde_json::json!({
                "dateFrom": from, "dateTo": to,
                "compareWith": "samePeriodLastYear"
            }),
        ),
        (
            "sales-by-product",
            serde_json::json!({ "dateFrom": from, "dateTo": to, "productId": product_id }),
        ),
        (
            "top-products",
            serde_json::json!({ "dateFrom": from, "dateTo": to, "topN": 5 }),
        ),
        (
            "sales-by-category",
            serde_json::json!({ "dateFrom": from, "dateTo": to }),
        ),
        (
            "cash-session-close",
            serde_json::json!({ "dateFrom": from, "dateTo": to }),
        ),
        (
            "sales-by-payment-method",
            serde_json::json!({
                "dateFrom": from, "dateTo": to,
                "compareWith": "previousPeriod"
            }),
        ),
    ];
    for (id, params) in cases {
        let res = reports::run_report(&pool, &c, id, params).await.unwrap();
        assert_eq!(res["reportId"], id, "{id}");
        assert!(res["series"].as_array().is_some(), "{id} series");
    }

    let res = reports::run_report(
        &pool,
        &c,
        "sales-by-period",
        serde_json::json!({
            "dateFrom": from, "dateTo": to, "granularity": "day",
            "compareWith": "previousPeriod"
        }),
    )
    .await
    .unwrap();
    assert!(res["summary"]["ticketCount"].as_f64().unwrap_or(0.0) >= 1.0);
    assert!(res["summary"]["totalSales"].as_f64().unwrap_or(0.0) >= 3000.0);

    let mix = reports::run_report(
        &pool,
        &c,
        "sales-by-payment-method",
        serde_json::json!({
            "dateFrom": from, "dateTo": to,
            "compareWith": "previousPeriod"
        }),
    )
    .await
    .unwrap();
    assert!(!mix["rows"].as_array().unwrap().is_empty());

    let err = reports::run_report(&pool, &c, "no-such-report", serde_json::json!({}))
        .await
        .unwrap_err();
    assert!(matches!(err, LiteError::NotFound(_)));
}

#[tokio::test]
async fn lite_catalog_nest_payload_and_negative_stock() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let products = catalog::products_list(&pool, &c).await.unwrap();
    let product_id = products[0].id.clone();

    // Nest UI createVariant: no name, basePrice, isActive, attributeValues.
    let dto: catalog::CreateVariant = serde_json::from_value(serde_json::json!({
        "sku": "NEST-V",
        "basePrice": 99.0,
        "isActive": true,
        "attributeValues": { "color": "rojo" }
    }))
    .unwrap();
    let created = catalog::variants_create(&pool, &product_id, dto)
        .await
        .unwrap();
    assert_eq!(created.base_price, 99.0);
    assert_eq!(created.variant_id, created.id);
    assert!(created.is_active);

    // Nest UI patchVariant basePrice.
    let patch: catalog::PatchVariant = serde_json::from_value(serde_json::json!({
        "basePrice": 120.0,
        "isActive": false,
        "attributeValues": null
    }))
    .unwrap();
    let patched = catalog::variant_patch(&pool, &created.id, patch)
        .await
        .unwrap();
    assert_eq!(patched.unit_price, 120.0);
    assert!(!patched.is_active);

    // Sale with zero/insufficient stock must succeed (negative allowed).
    ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: Some(0.0),
        },
    )
    .await
    .unwrap();
    let (vid, sid) = variant_storage(&pool).await;
    sqlx::query("UPDATE stock_levels SET quantity = 0 WHERE variant_id = ?1 AND storage_id = ?2")
        .bind(&vid)
        .bind(&sid)
        .execute(&pool)
        .await
        .unwrap();
    commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: vid.clone(),
                quantity: 3.0,
                unit_price: Some(100.0),
                name: None,
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 300.0,
            }],
            customer_id: None,
            storage_id: Some(sid.clone()),
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();
    let qty: f64 = sqlx::query_scalar(
        "SELECT quantity FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
    )
    .bind(&vid)
    .bind(&sid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(qty, -3.0);

    // Transfer that drives source negative is allowed.
    let s2 = catalog::storages_create(
        &pool,
        &c,
        catalog::NamedCreate {
            name: "DestinoNeg".into(),
            symbol: None,
        },
    )
    .await
    .unwrap();
    stock::stock_transfer(
        &pool,
        stock::StockTransfer {
            variant_id: vid,
            from_storage_id: sid,
            to_storage_id: s2.id,
            quantity: 5.0,
        },
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn lite_pos_sale_open_item_skips_stock() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let (vid, sid) = variant_storage(&pool).await;
    let before: f64 = sqlx::query_scalar(
        "SELECT quantity FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
    )
    .bind(&vid)
    .bind(&sid)
    .fetch_one(&pool)
    .await
    .unwrap();

    ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: Some(0.0),
        },
    )
    .await
    .unwrap();

    let sale = commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: "open:test-item".into(),
                quantity: 2.0,
                unit_price: Some(500.0),
                name: Some("Producto especial".into()),
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 1000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(sale.total, 1000.0);

    let line_name: String = sqlx::query_scalar(
        "SELECT name FROM transaction_lines WHERE transaction_id = ?1",
    )
    .bind(&sale.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(line_name, "Producto especial");

    let after: f64 = sqlx::query_scalar(
        "SELECT quantity FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
    )
    .bind(&vid)
    .bind(&sid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(after, before);

    commerce::sales_void(&pool, &c, &sale.id).await.unwrap();
    let after_void: f64 = sqlx::query_scalar(
        "SELECT quantity FROM stock_levels WHERE variant_id = ?1 AND storage_id = ?2",
    )
    .bind(&vid)
    .bind(&sid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(after_void, before);
}

#[tokio::test]
async fn lite_cash_close_summary_expected() {
    let pool = lite_test_pool().await;
    let c = company(&pool).await;
    let uid = admin_id(&pool).await;
    let sess = ops::cash_open(
        &pool,
        &c,
        &uid,
        ops::OpenCash {
            point_of_sale_id: None,
            opening_amount: Some(20_000.0),
        },
    )
    .await
    .unwrap();

    commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: "open:cash-1".into(),
                quantity: 1.0,
                unit_price: Some(9_000.0),
                name: Some("Venta efectivo".into()),
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 10_000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();

    commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: "open:tr-1".into(),
                quantity: 1.0,
                unit_price: Some(5_000.0),
                name: Some("Venta transferencia".into()),
            }],
            payments: vec![commerce::PaymentIn {
                method: "TRANSFER".into(),
                amount: 5_000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();

    let voided = commerce::pos_sale(
        &pool,
        &c,
        &uid,
        commerce::SaleRequest {
            lines: vec![commerce::SaleLineIn {
                variant_id: "open:void-1".into(),
                quantity: 1.0,
                unit_price: Some(3_000.0),
                name: Some("Anulada".into()),
            }],
            payments: vec![commerce::PaymentIn {
                method: "CASH".into(),
                amount: 3_000.0,
            }],
            customer_id: None,
            storage_id: None,
            method: None,
            total: None,
        },
    )
    .await
    .unwrap();
    commerce::sales_void(&pool, &c, &voided.id).await.unwrap();

    ops::cash_withdrawal(
        &pool,
        &c,
        &sess.id,
        ops::CashAmount {
            amount: 2_000.0,
            note: Some("retiro".into()),
        },
    )
    .await
    .unwrap();

    let summary = ops::cash_close_summary(&pool, &c, &sess.id).await.unwrap();
    assert_eq!(summary.cash_received, 10_000.0);
    assert_eq!(summary.change_given, 1_000.0);
    assert_eq!(summary.cash_net, 9_000.0);
    assert_eq!(summary.withdrawals, 2_000.0);
    assert_eq!(summary.expected_cash, 27_000.0);
    assert_eq!(summary.ticket_count, 2);
    assert_eq!(summary.void_count, 1);
    assert_eq!(summary.sales_total, 14_000.0);
    assert_eq!(
        summary.methods.iter().map(|m| m.method.as_str()).collect::<Vec<_>>(),
        vec!["CASH", "TRANSFER"]
    );
    assert_eq!(summary.ledger.first().map(|l| l.balance), Some(27_000.0));
    assert_eq!(summary.ledger.last().map(|l| l.label.as_str()), Some("Apertura"));
    assert_eq!(summary.ledger.last().map(|l| l.kind.as_str()), Some("OPENING"));
    assert_eq!(summary.ledger.last().map(|l| l.code.as_str()), Some(""));
    let sale_lines: Vec<_> = summary.ledger.iter().filter(|l| l.kind == "SALE").collect();
    assert_eq!(sale_lines.len(), 2);
    assert!(!sale_lines[0].code.is_empty());
    assert_eq!(sale_lines[0].code, sale_lines[1].code);
}
