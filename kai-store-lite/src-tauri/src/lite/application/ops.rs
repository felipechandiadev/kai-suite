use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionRow {
    pub id: String,
    pub status: String,
    pub point_of_sale_id: String,
    pub point_of_sale_name: Option<String>,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub opening_amount: f64,
    pub closing_amount: Option<f64>,
    pub counted: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashMovementRow {
    pub id: String,
    pub kind: String,
    pub amount: f64,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenCash {
    pub point_of_sale_id: Option<String>,
    pub opening_amount: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseCash {
    pub counted: f64,
    pub closing_amount: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashAmount {
    pub amount: f64,
    pub note: Option<String>,
}

pub async fn cash_list(pool: &LitePool, company_id: &str) -> LiteResult<Vec<CashSessionRow>> {
    let rows = sqlx::query(
        r#"SELECT cs.id, cs.status, cs.point_of_sale_id, pos.name AS point_of_sale_name,
                  cs.opened_at, cs.closed_at, cs.opening_amount, cs.closing_amount, cs.counted
           FROM cash_sessions cs
           LEFT JOIN points_of_sale pos ON pos.id = cs.point_of_sale_id
           WHERE cs.company_id = ?1
           ORDER BY cs.opened_at DESC"#,
    )
    .bind(company_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(map_session).collect())
}

pub async fn cash_movements(pool: &LitePool, session_id: &str) -> LiteResult<Vec<CashMovementRow>> {
    let rows = sqlx::query(
        "SELECT id, kind, amount, note, created_at FROM cash_movements WHERE session_id = ?1 ORDER BY created_at",
    )
    .bind(session_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| CashMovementRow {
            id: r.get("id"),
            kind: r.get("kind"),
            amount: r.get("amount"),
            note: r.get("note"),
            created_at: r.get("created_at"),
        })
        .collect())
}

pub async fn cash_open(
    pool: &LitePool,
    company_id: &str,
    user_id: &str,
    dto: OpenCash,
) -> LiteResult<CashSessionRow> {
    let open: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM cash_sessions WHERE company_id = ?1 AND status = 'OPEN' LIMIT 1",
    )
    .bind(company_id)
    .fetch_optional(pool)
    .await?;
    if open.is_some() {
        return Err(LiteError::Conflict("cash session already open".into()));
    }
    let pos_id = if let Some(p) = dto.point_of_sale_id {
        p
    } else {
        sqlx::query_scalar(
            "SELECT id FROM points_of_sale WHERE company_id = ?1 AND is_current = 1 LIMIT 1",
        )
        .bind(company_id)
        .fetch_optional(pool)
        .await?
        .or(sqlx::query_scalar("SELECT id FROM points_of_sale WHERE company_id = ?1 LIMIT 1")
            .bind(company_id)
            .fetch_optional(pool)
            .await?)
        .ok_or_else(|| LiteError::BadRequest("no point of sale".into()))?
    };
    let id = Uuid::new_v4().to_string();
    let opening = dto.opening_amount.unwrap_or(0.0);
    sqlx::query(
        "INSERT INTO cash_sessions (id, company_id, point_of_sale_id, opened_by, status, opening_amount) VALUES (?1,?2,?3,?4,'OPEN',?5)",
    )
    .bind(&id)
    .bind(company_id)
    .bind(&pos_id)
    .bind(user_id)
    .bind(opening)
    .execute(pool)
    .await?;
    cash_get(pool, company_id, &id).await
}

pub async fn cash_close(
    pool: &LitePool,
    company_id: &str,
    user_id: &str,
    session_id: &str,
    dto: CloseCash,
) -> LiteResult<CashSessionRow> {
    let sess = cash_get(pool, company_id, session_id).await?;
    if sess.status != "OPEN" {
        return Err(LiteError::BadRequest("session not open".into()));
    }
    sqlx::query(
        "UPDATE cash_sessions SET status = 'CLOSED', closed_by = ?1, counted = ?2, closing_amount = ?3, closed_at = datetime('now') WHERE id = ?4",
    )
    .bind(user_id)
    .bind(dto.counted)
    .bind(dto.closing_amount.unwrap_or(dto.counted))
    .bind(session_id)
    .execute(pool)
    .await?;
    cash_get(pool, company_id, session_id).await
}

pub async fn cash_deposit(
    pool: &LitePool,
    company_id: &str,
    session_id: &str,
    dto: CashAmount,
) -> LiteResult<CashMovementRow> {
    cash_amount_move(pool, company_id, session_id, "DEPOSIT", dto).await
}

pub async fn cash_withdrawal(
    pool: &LitePool,
    company_id: &str,
    session_id: &str,
    dto: CashAmount,
) -> LiteResult<CashMovementRow> {
    cash_amount_move(pool, company_id, session_id, "WITHDRAWAL", dto).await
}

async fn cash_amount_move(
    pool: &LitePool,
    company_id: &str,
    session_id: &str,
    kind: &str,
    dto: CashAmount,
) -> LiteResult<CashMovementRow> {
    let sess = cash_get(pool, company_id, session_id).await?;
    if sess.status != "OPEN" {
        return Err(LiteError::BadRequest("session not open".into()));
    }
    if dto.amount <= 0.0 {
        return Err(LiteError::BadRequest("amount must be > 0".into()));
    }
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO cash_movements (id, session_id, kind, amount, note) VALUES (?1,?2,?3,?4,?5)",
    )
    .bind(&id)
    .bind(session_id)
    .bind(kind)
    .bind(dto.amount)
    .bind(&dto.note)
    .execute(pool)
    .await?;
    Ok(CashMovementRow {
        id,
        kind: kind.into(),
        amount: dto.amount,
        note: dto.note,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

async fn cash_get(pool: &LitePool, company_id: &str, id: &str) -> LiteResult<CashSessionRow> {
    let row = sqlx::query(
        r#"SELECT cs.id, cs.status, cs.point_of_sale_id, pos.name AS point_of_sale_name,
                  cs.opened_at, cs.closed_at, cs.opening_amount, cs.closing_amount, cs.counted
           FROM cash_sessions cs
           LEFT JOIN points_of_sale pos ON pos.id = cs.point_of_sale_id
           WHERE cs.id = ?1 AND cs.company_id = ?2"#,
    )
    .bind(id)
    .bind(company_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| LiteError::NotFound("cash session not found".into()))?;
    Ok(map_session(row))
}

fn map_session(r: sqlx::sqlite::SqliteRow) -> CashSessionRow {
    CashSessionRow {
        id: r.get("id"),
        status: r.get("status"),
        point_of_sale_id: r.get("point_of_sale_id"),
        point_of_sale_name: r.get("point_of_sale_name"),
        opened_at: r.get("opened_at"),
        closed_at: r.get("closed_at"),
        opening_amount: r.get("opening_amount"),
        closing_amount: r.get("closing_amount"),
        counted: r.get("counted"),
    }
}
