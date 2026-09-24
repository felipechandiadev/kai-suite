use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMonthPoint {
    pub period: String,
    pub label: String,
    pub total: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardDto {
    /// Ticket count today (alias Nest / UI).
    pub sales_today: i64,
    pub sales_count: i64,
    pub sales_today_count: i64,
    pub sales_today_amount: f64,
    pub sales_mtd_amount: f64,
    pub sales_mtd_count: i64,
    pub average_ticket_mtd: f64,
    pub stock_low_count: i64,
    pub stock_sku_count: i64,
    pub open_sessions: i64,
    /// Kept for older callers.
    pub products: i64,
    pub variants: i64,
    pub open_cash_sessions: i64,
    pub sales_total_today: f64,
    pub sales_by_month: Vec<DashboardMonthPoint>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDto {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub razon_social: Option<String>,
    pub nombre_fantasia: Option<String>,
    pub rut: Option<String>,
    pub business_activity: Option<String>,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub city: Option<String>,
    pub phone: Option<String>,
    /// Nest / UI use `mail` (not `email`).
    pub mail: Option<String>,
    pub default_currency: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyBranchDto {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyStorageDto {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanySummaryDto {
    pub company: CompanyDto,
    pub branch: Option<CompanyBranchDto>,
    pub storage: Option<CompanyStorageDto>,
    pub warehouses: Vec<CompanyStorageDto>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyPatch {
    pub name: Option<String>,
    pub razon_social: Option<String>,
    pub nombre_fantasia: Option<String>,
    pub rut: Option<String>,
    pub business_activity: Option<String>,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub city: Option<String>,
    pub phone: Option<String>,
    #[serde(alias = "email")]
    pub mail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PosRow {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub branch_id: Option<String>,
    pub active: bool,
    pub is_current: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCurrentPatch {
    pub point_of_sale_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserRow {
    pub id: String,
    pub name: String,
    pub user_name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserCreate {
    pub username: String,
    pub name: String,
    pub password: String,
    pub email: Option<String>,
    pub roles: Option<Vec<String>>,
}

const LOW_STOCK_THRESHOLD: f64 = 5.0;

const MONTHS_ES_SHORT: [&str; 12] = [
    "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic",
];

fn month_label_es(year: i32, month: u32) -> String {
    let idx = month.saturating_sub(1) as usize;
    let name = MONTHS_ES_SHORT.get(idx).copied().unwrap_or("?");
    let yy = year.rem_euclid(100);
    format!("{name} {yy:02}")
}

pub async fn dashboard(pool: &LitePool, company_id: &str) -> LiteResult<DashboardDto> {
    let products: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE company_id = ?1")
            .bind(company_id)
            .fetch_one(pool)
            .await?;
    let variants: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM product_variants v
           JOIN products p ON p.id = v.product_id WHERE p.company_id = ?1"#,
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;
    let open_cash: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cash_sessions WHERE company_id = ?1 AND status = 'OPEN'",
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;

    let today_row = sqlx::query(
        r#"SELECT CAST(COALESCE(SUM(total),0) AS REAL) AS total, COUNT(*) AS cnt
           FROM transactions
           WHERE company_id = ?1 AND status = 'COMPLETED' AND date(created_at) = date('now')"#,
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;
    let sales_today_amount: f64 = today_row.get("total");
    let sales_today_count: i64 = today_row.get("cnt");

    let mtd_row = sqlx::query(
        r#"SELECT CAST(COALESCE(SUM(total),0) AS REAL) AS total, COUNT(*) AS cnt
           FROM transactions
           WHERE company_id = ?1 AND status = 'COMPLETED'
             AND date(created_at) >= date('now', 'start of month')
             AND date(created_at) <= date('now')"#,
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;
    let sales_mtd_amount: f64 = mtd_row.get("total");
    let sales_mtd_count: i64 = mtd_row.get("cnt");
    let average_ticket_mtd = if sales_mtd_count > 0 {
        (sales_mtd_amount / sales_mtd_count as f64).round()
    } else {
        0.0
    };

    let month_rows = sqlx::query(
        r#"SELECT strftime('%Y-%m', created_at) AS period,
                  CAST(COALESCE(SUM(total),0) AS REAL) AS total
           FROM transactions
           WHERE company_id = ?1 AND status = 'COMPLETED'
             AND date(created_at) >= date('now', 'start of month', '-11 months')
           GROUP BY strftime('%Y-%m', created_at)"#,
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    let mut by_period = std::collections::HashMap::<String, f64>::new();
    for r in month_rows {
        let period: String = r.get("period");
        let total: f64 = r.get("total");
        by_period.insert(period, total);
    }

    let now = chrono::Local::now().date_naive();
    let mut cursor = NaiveDate::from_ymd_opt(now.year(), now.month(), 1)
        .unwrap_or(now)
        .checked_sub_months(chrono::Months::new(11))
        .unwrap_or(now);
    let mut sales_by_month = Vec::with_capacity(12);
    for _ in 0..12 {
        let period = format!("{:04}-{:02}", cursor.year(), cursor.month());
        sales_by_month.push(DashboardMonthPoint {
            period: period.clone(),
            label: month_label_es(cursor.year(), cursor.month()),
            total: *by_period.get(&period).unwrap_or(&0.0),
        });
        cursor = cursor
            .checked_add_months(chrono::Months::new(1))
            .unwrap_or(cursor);
    }

    let stock_sku_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM stock_levels sl
           JOIN product_variants v ON v.id = sl.variant_id
           JOIN products p ON p.id = v.product_id
           WHERE p.company_id = ?1"#,
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;

    // Lite schema has no minimum_stock; mirror Nest default threshold (=5).
    let stock_low_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM stock_levels sl
           JOIN product_variants v ON v.id = sl.variant_id
           JOIN products p ON p.id = v.product_id
           WHERE p.company_id = ?1 AND sl.quantity <= ?2"#,
    )
    .bind(company_id)
    .bind(LOW_STOCK_THRESHOLD)
    .fetch_one(pool)
    .await?;

    Ok(DashboardDto {
        sales_today: sales_today_count,
        sales_count: sales_today_count,
        sales_today_count,
        sales_today_amount,
        sales_mtd_amount,
        sales_mtd_count,
        average_ticket_mtd,
        stock_low_count,
        stock_sku_count,
        open_sessions: open_cash,
        products,
        variants,
        open_cash_sessions: open_cash,
        sales_total_today: sales_today_amount,
        sales_by_month,
    })
}

pub async fn company_get(pool: &LitePool, company_id: &str) -> LiteResult<CompanySummaryDto> {
    let r = sqlx::query(
        "SELECT id, name, razon_social, nombre_fantasia, rut, business_activity, address, commune, city, phone, email FROM companies WHERE id = ?1",
    )
    .bind(company_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| LiteError::NotFound("company not found".into()))?;

    let name: String = r.get("name");
    let razon: Option<String> = r.get("razon_social");
    let company = CompanyDto {
        id: r.get("id"),
        name: Some(name.clone()),
        razon_social: razon.or(Some(name)),
        nombre_fantasia: r.get("nombre_fantasia"),
        rut: r.get("rut"),
        business_activity: r.get("business_activity"),
        address: r.get("address"),
        commune: r.get("commune"),
        city: r.get("city"),
        phone: r.get("phone"),
        mail: r.get("email"),
        default_currency: "CLP".into(),
    };

    let branch = sqlx::query("SELECT id, name FROM branches WHERE company_id = ?1 ORDER BY name LIMIT 1")
        .bind(company_id)
        .fetch_optional(pool)
        .await?
        .map(|b| CompanyBranchDto {
            id: b.get("id"),
            name: b.get("name"),
        });

    let storage = sqlx::query("SELECT id, name FROM storages WHERE company_id = ?1 ORDER BY name LIMIT 1")
        .bind(company_id)
        .fetch_optional(pool)
        .await?
        .map(|s| CompanyStorageDto {
            id: s.get("id"),
            name: s.get("name"),
            is_default: true,
        });

    let warehouses = storage
        .as_ref()
        .map(|s| {
            vec![CompanyStorageDto {
                id: s.id.clone(),
                name: s.name.clone(),
                is_default: s.is_default,
            }]
        })
        .unwrap_or_default();

    Ok(CompanySummaryDto {
        company,
        branch,
        storage,
        warehouses,
    })
}

pub async fn company_patch(
    pool: &LitePool,
    company_id: &str,
    dto: CompanyPatch,
) -> LiteResult<CompanySummaryDto> {
    let _ = company_get(pool, company_id).await?;
    if let Some(v) = dto.name {
        sqlx::query("UPDATE companies SET name = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.razon_social {
        sqlx::query("UPDATE companies SET razon_social = ?1, name = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.nombre_fantasia {
        sqlx::query("UPDATE companies SET nombre_fantasia = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.rut {
        sqlx::query("UPDATE companies SET rut = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.business_activity {
        sqlx::query("UPDATE companies SET business_activity = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.address {
        sqlx::query("UPDATE companies SET address = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.commune {
        sqlx::query("UPDATE companies SET commune = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.city {
        sqlx::query("UPDATE companies SET city = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.phone {
        sqlx::query("UPDATE companies SET phone = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    if let Some(v) = dto.mail {
        sqlx::query("UPDATE companies SET email = ?1 WHERE id = ?2")
            .bind(v)
            .bind(company_id)
            .execute(pool)
            .await?;
    }
    company_get(pool, company_id).await
}

pub async fn pos_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<PosRow>> {
    let rows = sqlx::query(
        "SELECT id, name, code, branch_id, active, is_current FROM points_of_sale WHERE company_id = ?1",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| PosRow {
            id: r.get("id"),
            name: r.get("name"),
            code: r.get("code"),
            branch_id: r.get("branch_id"),
            active: r.get::<i64, _>("active") != 0,
            is_current: r.get::<i64, _>("is_current") != 0,
        })
        .collect())
}

pub async fn pos_current(pool: &LitePool, company_id: &str) -> LiteResult<PosRow> {
    let mut list = pos_list(pool, company_id).await?;
    if let Some(cur) = list.iter().find(|p| p.is_current).cloned() {
        return Ok(cur);
    }
    list.pop()
        .ok_or_else(|| LiteError::NotFound("no POS".into()))
}

pub async fn pos_current_patch(
    pool: &LitePool,
    company_id: &str,
    dto: PosCurrentPatch,
) -> LiteResult<PosRow> {
    sqlx::query("UPDATE points_of_sale SET is_current = 0 WHERE company_id = ?1")
        .bind(company_id)
        .execute(pool)
        .await?;
    let res = sqlx::query(
        "UPDATE points_of_sale SET is_current = 1 WHERE id = ?1 AND company_id = ?2",
    )
    .bind(&dto.point_of_sale_id)
    .bind(company_id)
    .execute(pool)
    .await?;
    if res.rows_affected() == 0 {
        return Err(LiteError::NotFound("POS not found".into()));
    }
    pos_current(pool, company_id).await
}

pub async fn users_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<UserRow>> {
    let rows = sqlx::query(
        "SELECT id, name, username, email FROM users WHERE company_id = ?1 AND active = 1",
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    let mut out = Vec::new();
    for r in rows {
        let id: String = r.get("id");
        let roles: Vec<String> = sqlx::query_scalar("SELECT role FROM user_roles WHERE user_id = ?1")
            .bind(&id)
            .fetch_all(pool)
            .await?;
        out.push(UserRow {
            id,
            name: r.get("name"),
            user_name: r.get("username"),
            email: r.get("email"),
            roles,
        });
    }
    Ok(out)
}

pub async fn users_create(
    pool: &LitePool,
    company_id: &str,
    dto: UserCreate,
) -> LiteResult<UserRow> {
    if dto.username.trim().is_empty() || dto.password.len() < 4 {
        return Err(LiteError::BadRequest("invalid username/password".into()));
    }
    let exists: Option<(String,)> =
        sqlx::query_as("SELECT id FROM users WHERE company_id = ?1 AND username = ?2")
            .bind(company_id)
            .bind(dto.username.trim())
            .fetch_optional(pool)
            .await?;
    if exists.is_some() {
        return Err(LiteError::Conflict("username exists".into()));
    }
    let id = Uuid::new_v4().to_string();
    let hash = bcrypt::hash(&dto.password, 12)
        .map_err(|e| LiteError::Other(anyhow::anyhow!(e)))?;
    sqlx::query(
        "INSERT INTO users (id, company_id, username, email, name, password_hash) VALUES (?1,?2,?3,?4,?5,?6)",
    )
    .bind(&id)
    .bind(company_id)
    .bind(dto.username.trim())
    .bind(&dto.email)
    .bind(&dto.name)
    .bind(&hash)
    .execute(pool)
    .await?;
    let roles = dto.roles.unwrap_or_else(|| vec!["CASHIER".into()]);
    for role in &roles {
        sqlx::query("INSERT INTO user_roles (user_id, role) VALUES (?1,?2)")
            .bind(&id)
            .bind(role)
            .execute(pool)
            .await?;
    }
    Ok(UserRow {
        id,
        name: dto.name,
        user_name: dto.username.trim().into(),
        email: dto.email,
        roles,
    })
}

pub async fn users_delete(
    pool: &LitePool,
    company_id: &str,
    user_id: &str,
    actor_id: &str,
) -> LiteResult<()> {
    if user_id == actor_id {
        return Err(LiteError::BadRequest("cannot delete self".into()));
    }
    let admins: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM users u
           JOIN user_roles r ON r.user_id = u.id
           WHERE u.company_id = ?1 AND u.active = 1 AND r.role IN ('ADMIN','OWNER')"#,
    )
    .bind(company_id)
    .fetch_one(pool)
    .await?;
    let is_admin: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_roles WHERE user_id = ?1 AND role IN ('ADMIN','OWNER')",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    if is_admin > 0 && admins <= 1 {
        return Err(LiteError::BadRequest("cannot delete last admin".into()));
    }
    let res = sqlx::query("UPDATE users SET active = 0 WHERE id = ?1 AND company_id = ?2")
        .bind(user_id)
        .bind(company_id)
        .execute(pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(LiteError::NotFound("user not found".into()));
    }
    Ok(())
}
