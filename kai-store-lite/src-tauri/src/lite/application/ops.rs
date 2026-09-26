use std::collections::{HashMap, HashSet};

use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

const POS_PAYMENT_ORDER: &[&str] = &["CASH", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"];

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
    /// Contado físico. La UI Nest/Lite suele mandar solo `closingAmount`.
    pub counted: Option<f64>,
    pub closing_amount: Option<f64>,
    /// Ignorado por ahora (compat con PosClosingPage).
    #[serde(default)]
    pub counts_by_method: Option<serde_json::Value>,
}

impl CloseCash {
    /// Prefer `counted`, else `closingAmount` (contrato HTTP Lite).
    pub fn resolved_counted(&self) -> LiteResult<f64> {
        self.counted
            .or(self.closing_amount)
            .ok_or_else(|| LiteError::BadRequest("counted o closingAmount es requerido".into()))
    }
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseMethod {
    pub method: String,
    pub amount: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseMovement {
    pub id: String,
    pub kind: String,
    pub amount: f64,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseSummary {
    pub session_id: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub cashier_name: Option<String>,
    pub ticket_count: i64,
    pub void_count: i64,
    pub sales_total: f64,
    pub average_ticket: f64,
    pub methods: Vec<CashCloseMethod>,
    pub cash_received: f64,
    pub change_given: f64,
    pub cash_net: f64,
    pub opening_amount: f64,
    pub deposits: f64,
    pub withdrawals: f64,
    pub expected_cash: f64,
    pub movements: Vec<CashCloseMovement>,
    /// Libro del cajón, el más nuevo primero. El saldo de la primera línea es `expected_cash`.
    pub ledger: Vec<CashLedgerLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashLedgerLine {
    pub label: String,
    pub created_at: String,
    /// OPENING, SALE, DEPOSIT o WITHDRAWAL.
    pub kind: String,
    /// Id de la venta o del movimiento. Vacío en la apertura.
    pub code: String,
    pub direction: String,
    pub amount: f64,
    pub balance: f64,
}

pub async fn cash_close_summary(
    pool: &LitePool,
    company_id: &str,
    session_id: &str,
) -> LiteResult<CashCloseSummary> {
    let meta = sqlx::query(
        r#"SELECT cs.opened_at, cs.closed_at, cs.opening_amount,
                  COALESCE(uc.name, uo.name) AS cashier_name
           FROM cash_sessions cs
           LEFT JOIN users uo ON uo.id = cs.opened_by
           LEFT JOIN users uc ON uc.id = cs.closed_by
           WHERE cs.id = ?1 AND cs.company_id = ?2"#,
    )
    .bind(session_id)
    .bind(company_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| LiteError::NotFound("cash session not found".into()))?;

    let tx_rows = sqlx::query(
        "SELECT id, status, total, created_at FROM transactions WHERE company_id = ?1 AND cash_session_id = ?2",
    )
    .bind(company_id)
    .bind(session_id)
    .fetch_all(pool)
    .await?;

    let mut ticket_count: i64 = 0;
    let mut void_count: i64 = 0;
    let mut sales_total = 0.0;
    let mut completed_totals: HashMap<String, f64> = HashMap::new();
    let mut completed_at: HashMap<String, String> = HashMap::new();
    for row in tx_rows {
        let id: String = row.get("id");
        let status: String = row.get("status");
        let total: f64 = row.get("total");
        if status == "VOIDED" {
            void_count += 1;
        } else if status == "COMPLETED" {
            ticket_count += 1;
            sales_total += total;
            completed_at.insert(id.clone(), row.get("created_at"));
            completed_totals.insert(id, total);
        }
    }

    let pay_rows = sqlx::query(
        r#"SELECT p.transaction_id, p.method, p.amount
           FROM payments p
           INNER JOIN transactions t ON t.id = p.transaction_id
           WHERE t.company_id = ?1 AND t.cash_session_id = ?2 AND t.status = 'COMPLETED'"#,
    )
    .bind(company_id)
    .bind(session_id)
    .fetch_all(pool)
    .await?;

    let mut paid_by_tx: HashMap<String, f64> = HashMap::new();
    let mut cash_by_tx: HashMap<String, f64> = HashMap::new();
    let mut method_amount: HashMap<String, f64> = HashMap::new();
    let mut method_tickets: HashMap<String, HashSet<String>> = HashMap::new();
    let mut cash_received = 0.0;
    for row in pay_rows {
        let tx_id: String = row.get("transaction_id");
        if !completed_totals.contains_key(&tx_id) {
            continue;
        }
        let method = row.get::<String, _>("method").trim().to_ascii_uppercase();
        let amount: f64 = row.get("amount");
        *paid_by_tx.entry(tx_id.clone()).or_insert(0.0) += amount;
        *method_amount.entry(method.clone()).or_insert(0.0) += amount;
        method_tickets
            .entry(method.clone())
            .or_default()
            .insert(tx_id.clone());
        if method == "CASH" {
            cash_received += amount;
            *cash_by_tx.entry(tx_id).or_insert(0.0) += amount;
        }
    }

    let mut change_given = 0.0;
    for (tx_id, total) in &completed_totals {
        let paid = paid_by_tx.get(tx_id).copied().unwrap_or(0.0);
        let change = paid - *total;
        if change > 0.0 {
            change_given += change;
        }
    }

    let move_rows = sqlx::query(
        "SELECT id, kind, amount, note, created_at FROM cash_movements WHERE session_id = ?1 ORDER BY created_at",
    )
    .bind(session_id)
    .fetch_all(pool)
    .await?;
    let mut deposits = 0.0;
    let mut withdrawals = 0.0;
    let mut movements = Vec::new();
    for row in move_rows {
        let kind: String = row.get("kind");
        let amount: f64 = row.get("amount");
        if kind == "DEPOSIT" {
            deposits += amount;
        } else if kind == "WITHDRAWAL" {
            withdrawals += amount;
        }
        movements.push(CashCloseMovement {
            id: row.get("id"),
            kind,
            amount: money_clp(amount),
            note: row.get("note"),
            created_at: row.get("created_at"),
        });
    }

    let cash_net = cash_received - change_given;
    let opening: f64 = meta.get("opening_amount");
    let expected = opening + cash_net + deposits - withdrawals;
    let average = if ticket_count > 0 {
        sales_total / ticket_count as f64
    } else {
        0.0
    };

    let mut method_keys: Vec<String> = method_amount
        .iter()
        .filter(|(_, amount)| **amount > 0.0)
        .map(|(method, _)| method.clone())
        .collect();
    method_keys.sort_by_key(|method| payment_sort_key(method));

    let methods = method_keys
        .into_iter()
        .map(|method| CashCloseMethod {
            count: method_tickets.get(&method).map(|s| s.len() as i64).unwrap_or(0),
            amount: money_clp(*method_amount.get(&method).unwrap_or(&0.0)),
            method,
        })
        .collect();

    let ledger = build_cash_ledger(
        meta.get::<String, _>("opened_at"),
        opening,
        &completed_totals,
        &completed_at,
        &paid_by_tx,
        &cash_by_tx,
        &movements,
    );

    Ok(CashCloseSummary {
        session_id: session_id.to_string(),
        opened_at: meta.get("opened_at"),
        closed_at: meta.get("closed_at"),
        cashier_name: meta.get("cashier_name"),
        ticket_count,
        void_count,
        sales_total: money_clp(sales_total),
        average_ticket: money_clp(average),
        methods,
        cash_received: money_clp(cash_received),
        change_given: money_clp(change_given),
        cash_net: money_clp(cash_net),
        opening_amount: money_clp(opening),
        deposits: money_clp(deposits),
        withdrawals: money_clp(withdrawals),
        expected_cash: money_clp(expected),
        movements,
        ledger,
    })
}

struct LedgerDraft {
    at: String,
    seq: u8,
    label: String,
    kind: &'static str,
    code: String,
    direction: &'static str,
    amount: f64,
}

fn build_cash_ledger(
    opened_at: String,
    opening: f64,
    totals: &HashMap<String, f64>,
    created_at: &HashMap<String, String>,
    paid_by_tx: &HashMap<String, f64>,
    cash_by_tx: &HashMap<String, f64>,
    movements: &[CashCloseMovement],
) -> Vec<CashLedgerLine> {
    let mut drafts = vec![LedgerDraft {
        at: opened_at.clone(),
        seq: 0,
        label: "Apertura".into(),
        kind: "OPENING",
        code: String::new(),
        direction: "in",
        amount: money_clp(opening),
    }];

    let mut sale_ids: Vec<&String> = totals.keys().collect();
    sale_ids.sort();
    for tx_id in sale_ids {
        let at = created_at.get(tx_id).cloned().unwrap_or_else(|| opened_at.clone());
        let cash = money_clp(*cash_by_tx.get(tx_id).unwrap_or(&0.0));
        if cash > 0.0 {
            drafts.push(LedgerDraft {
                at: at.clone(),
                seq: 1,
                label: "Efectivo recibido".into(),
                kind: "SALE",
                code: tx_id.clone(),
                direction: "in",
                amount: cash,
            });
        }
        let paid = paid_by_tx.get(tx_id).copied().unwrap_or(0.0);
        let total = totals.get(tx_id).copied().unwrap_or(0.0);
        let change = money_clp(paid - total);
        if change > 0.0 {
            drafts.push(LedgerDraft {
                at,
                seq: 2,
                label: "Vuelto".into(),
                kind: "SALE",
                code: tx_id.clone(),
                direction: "out",
                amount: change,
            });
        }
    }

    for mov in movements {
        let (label, direction, kind) = match mov.kind.as_str() {
            "DEPOSIT" => ("Ingreso", "in", "DEPOSIT"),
            "WITHDRAWAL" => ("Egreso", "out", "WITHDRAWAL"),
            _ => continue,
        };
        let note = mov.note.as_deref().map(str::trim).filter(|s| !s.is_empty());
        drafts.push(LedgerDraft {
            at: mov.created_at.clone(),
            seq: 3,
            label: match note {
                Some(n) => format!("{label} · {n}"),
                None => label.to_string(),
            },
            kind,
            code: mov.id.clone(),
            direction,
            amount: money_clp(mov.amount),
        });
    }

    drafts.sort_by(|a, b| a.at.cmp(&b.at).then(a.seq.cmp(&b.seq)));

    let mut balance = 0.0;
    let mut lines = Vec::with_capacity(drafts.len());
    for draft in drafts {
        if draft.direction == "in" {
            balance += draft.amount;
        } else {
            balance -= draft.amount;
        }
        lines.push(CashLedgerLine {
            label: draft.label,
            created_at: draft.at,
            kind: draft.kind.to_string(),
            code: draft.code,
            direction: draft.direction.to_string(),
            amount: draft.amount,
            balance: money_clp(balance),
        });
    }
    lines.reverse();
    lines
}

fn money_clp(n: f64) -> f64 {
    n.round()
}

fn payment_sort_key(method: &str) -> (usize, String) {
    POS_PAYMENT_ORDER
        .iter()
        .position(|m| *m == method)
        .map(|i| (i, String::new()))
        .unwrap_or((POS_PAYMENT_ORDER.len(), method.to_string()))
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
    let counted = dto.resolved_counted()?;
    let closing = dto.closing_amount.unwrap_or(counted);
    sqlx::query(
        "UPDATE cash_sessions SET status = 'CLOSED', closed_by = ?1, counted = ?2, closing_amount = ?3, closed_at = datetime('now') WHERE id = ?4",
    )
    .bind(user_id)
    .bind(counted)
    .bind(closing)
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
