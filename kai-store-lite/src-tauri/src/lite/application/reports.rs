//! Sales reports for Lite (sqlx) — mirrors Nest handlers for the Lite registry.
use crate::lite::db::LitePool;
use crate::lite::error::{LiteError, LiteResult};
use chrono::{Datelike, Duration, NaiveDate};
use serde_json::{json, Map, Value};
use sqlx::Row;

const MAX_ROWS: i64 = 1000;

fn money(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn param_str(params: &Value, key: &str) -> Option<String> {
    params
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn parse_date_range(params: &Value) -> LiteResult<(NaiveDate, NaiveDate, String, String)> {
    let from_raw = param_str(params, "dateFrom")
        .or_else(|| param_str(params, "from"))
        .ok_or_else(|| LiteError::BadRequest("dateFrom es requerido (YYYY-MM-DD)".into()))?;
    let to_raw = param_str(params, "dateTo")
        .or_else(|| param_str(params, "to"))
        .ok_or_else(|| LiteError::BadRequest("dateTo es requerido (YYYY-MM-DD)".into()))?;
    let from_str = from_raw.chars().take(10).collect::<String>();
    let to_str = to_raw.chars().take(10).collect::<String>();
    let from = NaiveDate::parse_from_str(&from_str, "%Y-%m-%d")
        .map_err(|_| LiteError::BadRequest("Rango de fechas inválido".into()))?;
    let to = NaiveDate::parse_from_str(&to_str, "%Y-%m-%d")
        .map_err(|_| LiteError::BadRequest("Rango de fechas inválido".into()))?;
    if from > to {
        return Err(LiteError::BadRequest(
            "dateFrom no puede ser posterior a dateTo".into(),
        ));
    }
    Ok((from, to, from_str, to_str))
}

fn days_in_range(from: NaiveDate, to: NaiveDate) -> i64 {
    (to - from).num_days().max(0) + 1
}

fn resolve_granularity(raw: Option<&str>, from: NaiveDate, to: NaiveDate) -> &'static str {
    match raw {
        Some("day") => "day",
        Some("week") => "week",
        Some("month") => "month",
        _ => {
            let days = days_in_range(from, to);
            if days <= 45 {
                "day"
            } else if days <= 180 {
                "week"
            } else {
                "month"
            }
        }
    }
}

fn parse_compare_with(raw: Option<&str>) -> &'static str {
    match raw {
        Some("previousPeriod") => "previousPeriod",
        Some("samePeriodLastYear") => "samePeriodLastYear",
        _ => "none",
    }
}

fn to_iso(d: NaiveDate) -> String {
    d.format("%Y-%m-%d").to_string()
}

fn compare_date_range(
    from: NaiveDate,
    to: NaiveDate,
    mode: &str,
) -> Option<(NaiveDate, NaiveDate, String, String)> {
    if mode == "none" {
        return None;
    }
    let days = days_in_range(from, to);
    if mode == "samePeriodLastYear" {
        let prev_from = NaiveDate::from_ymd_opt(from.year() - 1, from.month(), from.day())
            .unwrap_or(from - Duration::days(365));
        let prev_to = NaiveDate::from_ymd_opt(to.year() - 1, to.month(), to.day())
            .unwrap_or(to - Duration::days(365));
        return Some((prev_from, prev_to, to_iso(prev_from), to_iso(prev_to)));
    }
    // previousPeriod
    let prev_to = from - Duration::days(1);
    let prev_from = prev_to - Duration::days(days - 1);
    Some((prev_from, prev_to, to_iso(prev_from), to_iso(prev_to)))
}

fn compute_delta_pct(current: f64, previous: f64) -> Option<f64> {
    if !current.is_finite() || !previous.is_finite() {
        return None;
    }
    if previous == 0.0 {
        return if current == 0.0 { Some(0.0) } else { None };
    }
    Some(((current - previous) / previous.abs() * 1000.0).round() / 10.0)
}

fn build_summary_delta(current: &Map<String, Value>, previous: &Map<String, Value>) -> Value {
    let mut out = Map::new();
    for (key, c_val) in current {
        let c = c_val.as_f64().unwrap_or(0.0);
        let p = previous.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0);
        out.insert(
            key.clone(),
            json!({
                "current": c,
                "previous": p,
                "deltaPct": compute_delta_pct(c, p),
            }),
        );
    }
    Value::Object(out)
}

fn bucket_expr(grain: &str) -> &'static str {
    match grain {
        "month" => "strftime('%Y-%m', t.created_at)",
        "week" => "strftime('%Y-W%W', t.created_at)",
        _ => "strftime('%Y-%m-%d', t.created_at)",
    }
}

fn grain_label(grain: &str) -> &'static str {
    match grain {
        "month" => "mes",
        "week" => "semana",
        _ => "día",
    }
}

fn margin_footnote(coverage: f64) -> String {
    format!(
        "Margen usa costo actual de variante (coverage {coverage}%). Líneas sin costo no aportan margen."
    )
}

struct SalesFilter {
    customer_id: Option<String>,
    payment_method: Option<String>,
    cash_session_id: Option<String>,
    product_id: Option<String>,
}

impl SalesFilter {
    fn empty() -> Self {
        Self {
            customer_id: None,
            payment_method: None,
            cash_session_id: None,
            product_id: None,
        }
    }
}

fn bind_sale_filters<'q>(
    mut q: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    company_id: &'q str,
    from: &'q str,
    to: &'q str,
    filter: &'q SalesFilter,
) -> sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>> {
    q = q.bind(company_id).bind(from).bind(to);
    if let Some(ref c) = filter.customer_id {
        q = q.bind(c.as_str());
    }
    if let Some(ref m) = filter.payment_method {
        q = q.bind(m.as_str());
    }
    if let Some(ref s) = filter.cash_session_id {
        q = q.bind(s.as_str());
    }
    if let Some(ref p) = filter.product_id {
        q = q.bind(p.as_str());
    }
    q
}

fn sale_where(filter: &SalesFilter, lines_join: bool) -> String {
    let mut w = String::from(
        "t.company_id = ?1 AND t.status = 'COMPLETED' \
         AND date(t.created_at) >= date(?2) AND date(t.created_at) <= date(?3)",
    );
    let mut idx = 4;
    if filter.customer_id.is_some() {
        w.push_str(&format!(" AND t.customer_id = ?{idx}"));
        idx += 1;
    }
    if filter.payment_method.is_some() {
        w.push_str(&format!(
            " AND EXISTS (SELECT 1 FROM payments p WHERE p.transaction_id = t.id AND p.method = ?{idx})"
        ));
        idx += 1;
    }
    if filter.cash_session_id.is_some() {
        w.push_str(&format!(" AND t.cash_session_id = ?{idx}"));
        idx += 1;
    }
    if filter.product_id.is_some() && lines_join {
        w.push_str(&format!(" AND p.id = ?{idx}"));
    }
    let _ = idx;
    w
}

async fn sales_summary(
    pool: &LitePool,
    company_id: &str,
    from: &str,
    to: &str,
    filter: &SalesFilter,
) -> LiteResult<(f64, i64, f64)> {
    let sql = format!(
        "SELECT COALESCE(SUM(t.total), 0) AS total, COUNT(*) AS cnt \
         FROM transactions t WHERE {}",
        sale_where(filter, false)
    );
    let row = bind_sale_filters(sqlx::query(&sql), company_id, from, to, filter)
        .fetch_one(pool)
        .await?;
    let total: f64 = row.get("total");
    let count: i64 = row.get("cnt");
    let avg = if count > 0 {
        total / count as f64
    } else {
        0.0
    };
    Ok((total, count, avg))
}

async fn sales_by_bucket(
    pool: &LitePool,
    company_id: &str,
    from: &str,
    to: &str,
    filter: &SalesFilter,
    grain: &str,
) -> LiteResult<Vec<(String, f64, i64, f64)>> {
    let bucket = bucket_expr(grain);
    let sql = format!(
        "SELECT {bucket} AS day, COALESCE(SUM(t.total), 0) AS total, COUNT(*) AS cnt \
         FROM transactions t WHERE {} GROUP BY {bucket} ORDER BY {bucket} ASC",
        sale_where(filter, false)
    );
    let rows = bind_sale_filters(sqlx::query(&sql), company_id, from, to, filter)
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .map(|r| {
            let total: f64 = r.get("total");
            let count: i64 = r.get("cnt");
            let avg = if count > 0 {
                total / count as f64
            } else {
                0.0
            };
            (r.get::<String, _>("day"), total, count, avg)
        })
        .collect())
}

async fn margin_for_lines(
    pool: &LitePool,
    company_id: &str,
    from: &str,
    to: &str,
    filter: &SalesFilter,
) -> LiteResult<(f64, f64, f64, i64, i64)> {
    let mut where_sql = sale_where(filter, filter.product_id.is_some());
    // Always join lines + variants
    let sql = format!(
        "SELECT \
            COALESCE(SUM(tl.line_total), 0) AS revenue, \
            COALESCE(SUM(CASE WHEN v.cost > 0 THEN v.cost * tl.quantity ELSE 0 END), 0) AS cogs, \
            COALESCE(SUM(CASE WHEN v.cost > 0 THEN 1 ELSE 0 END), 0) AS with_cost, \
            COALESCE(SUM(CASE WHEN v.cost IS NULL OR v.cost <= 0 THEN 1 ELSE 0 END), 0) AS missing_cost \
         FROM transaction_lines tl \
         INNER JOIN transactions t ON t.id = tl.transaction_id \
         LEFT JOIN product_variants v ON v.id = tl.variant_id \
         LEFT JOIN products p ON p.id = v.product_id \
         WHERE {where_sql}"
    );
    let _ = &mut where_sql;
    let row = bind_sale_filters(sqlx::query(&sql), company_id, from, to, filter)
        .fetch_one(pool)
        .await?;
    let revenue: f64 = row.get("revenue");
    let cogs: f64 = row.get("cogs");
    let with_cost: i64 = row.get("with_cost");
    let missing: i64 = row.get("missing_cost");
    Ok((revenue, cogs, revenue - cogs, with_cost, missing))
}

fn coverage_pct(with_cost: i64, missing: i64) -> f64 {
    let total = with_cost + missing;
    if total > 0 {
        ((with_cost as f64 / total as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    }
}

fn merge_bucket_points(
    current: &[(String, f64, i64, f64)],
    previous: &[(String, f64, i64, f64)],
) -> Vec<Value> {
    let len = current.len().max(previous.len());
    let mut points = Vec::with_capacity(len);
    for i in 0..len {
        let cur = current.get(i);
        let prev = previous.get(i);
        points.push(json!({
            "x": cur.map(|c| c.0.as_str()).or(prev.map(|p| p.0.as_str())).unwrap_or(""),
            "y": money(cur.map(|c| c.1).unwrap_or(0.0)),
            "y2": prev.map(|p| money(p.1)),
        }));
    }
    points
}

async fn run_sales_by_period(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let grain = resolve_granularity(param_str(params, "granularity").as_deref(), from_d, to_d);
    let compare = parse_compare_with(param_str(params, "compareWith").as_deref());
    let filter = SalesFilter::empty();

    let (total, count, avg) = sales_summary(pool, company_id, &from, &to, &filter).await?;
    let buckets = sales_by_bucket(pool, company_id, &from, &to, &filter, grain).await?;
    let (_rev, _cogs, margin, with_cost, missing) =
        margin_for_lines(pool, company_id, &from, &to, &filter).await?;
    let cov = coverage_pct(with_cost, missing);

    let mut summary = Map::new();
    summary.insert("totalSales".into(), json!(money(total)));
    summary.insert("ticketCount".into(), json!(count as f64));
    summary.insert("avgTicket".into(), json!(money(avg)));
    summary.insert("grossMargin".into(), json!(money(margin)));
    summary.insert("marginCoveragePct".into(), json!(cov));

    let mut summary_delta = None;
    let mut prev_buckets = Vec::new();
    if let Some((_, _, pf, pt)) = compare_date_range(from_d, to_d, compare) {
        let (ptotal, pcount, pavg) = sales_summary(pool, company_id, &pf, &pt, &filter).await?;
        prev_buckets = sales_by_bucket(pool, company_id, &pf, &pt, &filter, grain).await?;
        let (_, _, pmargin, pwc, pmc) =
            margin_for_lines(pool, company_id, &pf, &pt, &filter).await?;
        let pcov = coverage_pct(pwc, pmc);
        let mut prev = Map::new();
        prev.insert("totalSales".into(), json!(money(ptotal)));
        prev.insert("ticketCount".into(), json!(pcount as f64));
        prev.insert("avgTicket".into(), json!(money(pavg)));
        prev.insert("grossMargin".into(), json!(money(pmargin)));
        prev.insert("marginCoveragePct".into(), json!(pcov));
        summary_delta = Some(build_summary_delta(&summary, &prev));
    }

    let gl = grain_label(grain);
    let sales_points = if prev_buckets.is_empty() {
        buckets
            .iter()
            .map(|b| json!({"x": b.0, "y": money(b.1)}))
            .collect::<Vec<_>>()
    } else {
        merge_bucket_points(&buckets, &prev_buckets)
    };

    Ok(json!({
        "reportId": "sales-by-period",
        "title": "Resumen de ventas",
        "generatedAt": now_iso(),
        "params": {
            "dateFrom": from,
            "dateTo": to,
            "granularity": grain,
            "compareWith": compare,
        },
        "summary": summary,
        "summaryDelta": summary_delta,
        "series": [
            {
                "id": "sales-by-bucket",
                "label": if prev_buckets.is_empty() {
                    format!("Ventas por {gl}")
                } else {
                    format!("Ventas por {gl} (actual vs comparación)")
                },
                "chart": "area",
                "points": sales_points,
            },
            {
                "id": "avg-ticket-by-bucket",
                "label": format!("Ticket promedio por {gl}"),
                "chart": "bar",
                "points": buckets.iter().map(|b| json!({"x": b.0, "y": money(b.3)})).collect::<Vec<_>>(),
            }
        ],
        "columns": [
            {"key": "day", "label": if grain == "month" { "Mes" } else if grain == "week" { "Semana" } else { "Día" }},
            {"key": "count", "label": "Tickets", "align": "right"},
            {"key": "total", "label": "Total", "align": "right"},
            {"key": "avgTicket", "label": "Ticket prom.", "align": "right"},
        ],
        "rows": buckets.iter().map(|b| json!({
            "day": b.0, "count": b.2, "total": money(b.1), "avgTicket": money(b.3)
        })).collect::<Vec<_>>(),
        "totals": {"total": money(total), "count": count as f64, "margin": money(margin)},
        "marginQuality": {
            "linesWithCost": with_cost,
            "linesMissingCost": missing,
            "coveragePct": cov,
        },
        "footnotes": [margin_footnote(cov)],
    }))
}

async fn run_sales_detail(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let grain = resolve_granularity(param_str(params, "granularity").as_deref(), from_d, to_d);
    let filter = SalesFilter {
        customer_id: param_str(params, "customerId"),
        payment_method: param_str(params, "paymentMethod"),
        cash_session_id: None,
        product_id: None,
    };
    let (total, count, avg) = sales_summary(pool, company_id, &from, &to, &filter).await?;
    let buckets = sales_by_bucket(pool, company_id, &from, &to, &filter, grain).await?;

    let sql = format!(
        "SELECT t.id, t.created_at, t.status, t.total, t.customer_id, \
            (SELECT GROUP_CONCAT(DISTINCT p.method) FROM payments p WHERE p.transaction_id = t.id) AS payment_method \
         FROM transactions t WHERE {} ORDER BY t.created_at DESC LIMIT {}",
        sale_where(&filter, false),
        MAX_ROWS + 1
    );
    let rows = bind_sale_filters(sqlx::query(&sql), company_id, &from, &to, &filter)
        .fetch_all(pool)
        .await?;
    let truncated = rows.len() as i64 > MAX_ROWS;
    let detail: Vec<Value> = rows
        .into_iter()
        .take(MAX_ROWS as usize)
        .map(|r| {
            json!({
                "id": r.get::<String, _>("id"),
                "createdAt": r.get::<String, _>("created_at"),
                "paymentMethod": r.try_get::<Option<String>, _>("payment_method").ok().flatten(),
                "status": r.get::<String, _>("status"),
                "total": money(r.get::<f64, _>("total")),
                "customerId": r.try_get::<Option<String>, _>("customer_id").ok().flatten(),
            })
        })
        .collect();

    let gl = grain_label(grain);
    Ok(json!({
        "reportId": "sales-detail",
        "title": "Detalle de ventas",
        "generatedAt": now_iso(),
        "params": {
            "dateFrom": from,
            "dateTo": to,
            "customerId": filter.customer_id,
            "paymentMethod": filter.payment_method,
            "granularity": grain,
        },
        "summary": {
            "totalSales": money(total),
            "ticketCount": count as f64,
            "avgTicket": money(avg),
        },
        "series": [{
            "id": "sales-by-bucket",
            "label": format!("Montos por {gl}"),
            "chart": "bar",
            "points": buckets.iter().map(|b| json!({"x": b.0, "y": money(b.1)})).collect::<Vec<_>>(),
        }],
        "columns": [
            {"key": "createdAt", "label": "Fecha"},
            {"key": "id", "label": "ID"},
            {"key": "paymentMethod", "label": "Pago"},
            {"key": "status", "label": "Estado"},
            {"key": "total", "label": "Total", "align": "right"},
        ],
        "rows": detail,
        "totals": {"total": money(total), "count": count as f64},
        "truncated": truncated,
        "footnotes": if truncated {
            json!(["Resultado truncado a 1000 filas. Acotá el rango o filtros."])
        } else {
            Value::Null
        },
    }))
}

async fn run_sales_period_compare(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let grain = resolve_granularity(param_str(params, "granularity").as_deref(), from_d, to_d);
    let mut compare = parse_compare_with(param_str(params, "compareWith").as_deref());
    if compare == "none" {
        compare = "previousPeriod";
    }
    let filter = SalesFilter::empty();
    let cmp = compare_date_range(from_d, to_d, compare)
        .ok_or_else(|| LiteError::BadRequest("compareWith es requerido".into()))?;
    let (_, _, pf, pt) = cmp;

    let (total, count, avg) = sales_summary(pool, company_id, &from, &to, &filter).await?;
    let buckets = sales_by_bucket(pool, company_id, &from, &to, &filter, grain).await?;
    let (_, _, margin, with_cost, missing) =
        margin_for_lines(pool, company_id, &from, &to, &filter).await?;
    let cov = coverage_pct(with_cost, missing);

    let (ptotal, pcount, pavg) = sales_summary(pool, company_id, &pf, &pt, &filter).await?;
    let prev_buckets = sales_by_bucket(pool, company_id, &pf, &pt, &filter, grain).await?;
    let (_, _, pmargin, pwc, pmc) = margin_for_lines(pool, company_id, &pf, &pt, &filter).await?;
    let pcov = coverage_pct(pwc, pmc);

    let mut summary = Map::new();
    summary.insert("totalSales".into(), json!(money(total)));
    summary.insert("ticketCount".into(), json!(count as f64));
    summary.insert("avgTicket".into(), json!(money(avg)));
    summary.insert("grossMargin".into(), json!(money(margin)));
    summary.insert("marginCoveragePct".into(), json!(cov));
    let mut prev = Map::new();
    prev.insert("totalSales".into(), json!(money(ptotal)));
    prev.insert("ticketCount".into(), json!(pcount as f64));
    prev.insert("avgTicket".into(), json!(money(pavg)));
    prev.insert("grossMargin".into(), json!(money(pmargin)));
    prev.insert("marginCoveragePct".into(), json!(pcov));

    let len = buckets.len().max(prev_buckets.len());
    let compare_rows: Vec<Value> = (0..len)
        .map(|i| {
            let cur = buckets.get(i);
            let prev_b = prev_buckets.get(i);
            json!({
                "day": cur.map(|c| c.0.as_str()).or(prev_b.map(|p| p.0.as_str())).unwrap_or(""),
                "total": money(cur.map(|c| c.1).unwrap_or(0.0)),
                "prevTotal": money(prev_b.map(|p| p.1).unwrap_or(0.0)),
            })
        })
        .collect();

    Ok(json!({
        "reportId": "sales-period-compare",
        "title": "Comparativo de período",
        "generatedAt": now_iso(),
        "params": {
            "dateFrom": from,
            "dateTo": to,
            "granularity": grain,
            "compareWith": compare,
            "compareFrom": pf,
            "compareTo": pt,
        },
        "summary": summary,
        "summaryDelta": build_summary_delta(&summary, &prev),
        "series": [{
            "id": "sales-compare",
            "label": "Ventas actual vs comparación",
            "chart": "line",
            "points": merge_bucket_points(&buckets, &prev_buckets),
        }],
        "columns": [
            {"key": "day", "label": "Período"},
            {"key": "total", "label": "Actual", "align": "right"},
            {"key": "prevTotal", "label": "Comparación", "align": "right"},
        ],
        "rows": compare_rows,
        "totals": {
            "total": money(total),
            "prevTotal": money(ptotal),
            "margin": money(margin),
        },
        "marginQuality": {
            "linesWithCost": with_cost,
            "linesMissingCost": missing,
            "coveragePct": cov,
        },
        "footnotes": [margin_footnote(cov), format!("Comparación: {pf} → {pt}.")],
    }))
}

async fn run_sales_by_product(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (_from_d, _to_d, from, to) = parse_date_range(params)?;
    let product_id = param_str(params, "productId")
        .ok_or_else(|| LiteError::BadRequest("productId es requerido".into()))?;
    let filter = SalesFilter {
        customer_id: None,
        payment_method: None,
        cash_session_id: None,
        product_id: Some(product_id.clone()),
    };

    let bucket = bucket_expr("day");
    let by_day_sql = format!(
        "SELECT {bucket} AS day, COALESCE(SUM(tl.quantity), 0) AS qty, COALESCE(SUM(tl.line_total), 0) AS amount \
         FROM transaction_lines tl \
         INNER JOIN transactions t ON t.id = tl.transaction_id \
         INNER JOIN product_variants v ON v.id = tl.variant_id \
         INNER JOIN products p ON p.id = v.product_id \
         WHERE {} GROUP BY {bucket} ORDER BY {bucket} ASC",
        sale_where(&filter, true)
    );
    let by_day_rows =
        bind_sale_filters(sqlx::query(&by_day_sql), company_id, &from, &to, &filter)
            .fetch_all(pool)
            .await?;
    let by_day: Vec<(String, f64, f64)> = by_day_rows
        .into_iter()
        .map(|r| {
            (
                r.get("day"),
                r.get::<f64, _>("qty"),
                r.get::<f64, _>("amount"),
            )
        })
        .collect();
    let qty: f64 = by_day.iter().map(|d| d.1).sum();
    let amount: f64 = by_day.iter().map(|d| d.2).sum();
    let (_, _, margin, with_cost, missing) =
        margin_for_lines(pool, company_id, &from, &to, &filter).await?;
    let cov = coverage_pct(with_cost, missing);

    let lines_sql = format!(
        "SELECT t.created_at, v.sku, tl.quantity, tl.unit_price, tl.line_total, \
            CASE WHEN v.cost > 0 THEN tl.line_total - v.cost * tl.quantity ELSE NULL END AS margin \
         FROM transaction_lines tl \
         INNER JOIN transactions t ON t.id = tl.transaction_id \
         INNER JOIN product_variants v ON v.id = tl.variant_id \
         INNER JOIN products p ON p.id = v.product_id \
         WHERE {} ORDER BY t.created_at DESC LIMIT {}",
        sale_where(&filter, true),
        MAX_ROWS + 1
    );
    let line_rows =
        bind_sale_filters(sqlx::query(&lines_sql), company_id, &from, &to, &filter)
            .fetch_all(pool)
            .await?;
    let truncated = line_rows.len() as i64 > MAX_ROWS;
    let rows: Vec<Value> = line_rows
        .into_iter()
        .take(MAX_ROWS as usize)
        .map(|r| {
            let margin_opt: Option<f64> = r.try_get("margin").ok().flatten();
            json!({
                "createdAt": r.get::<String, _>("created_at"),
                "productSku": r.try_get::<Option<String>, _>("sku").ok().flatten(),
                "quantity": money(r.get::<f64, _>("quantity")),
                "unitPrice": money(r.get::<f64, _>("unit_price")),
                "subtotal": money(r.get::<f64, _>("line_total")),
                "margin": margin_opt.map(money),
            })
        })
        .collect();

    let mut footnotes = vec![margin_footnote(cov)];
    if truncated {
        footnotes.push("Resultado truncado a 1000 filas.".into());
    }

    Ok(json!({
        "reportId": "sales-by-product",
        "title": "Ventas de un producto",
        "generatedAt": now_iso(),
        "params": {"dateFrom": from, "dateTo": to, "productId": product_id},
        "summary": {
            "quantity": money(qty),
            "amount": money(amount),
            "grossMargin": money(margin),
            "marginCoveragePct": cov,
        },
        "series": [
            {
                "id": "qty-by-day",
                "label": "Cantidad por día",
                "chart": "line",
                "points": by_day.iter().map(|d| json!({"x": d.0, "y": money(d.1), "y2": money(d.2)})).collect::<Vec<_>>(),
            },
            {
                "id": "amount-by-day",
                "label": "Monto por día",
                "chart": "bar",
                "points": by_day.iter().map(|d| json!({"x": d.0, "y": money(d.2)})).collect::<Vec<_>>(),
            }
        ],
        "columns": [
            {"key": "createdAt", "label": "Fecha"},
            {"key": "productSku", "label": "SKU"},
            {"key": "quantity", "label": "Cant.", "align": "right"},
            {"key": "unitPrice", "label": "P. unit.", "align": "right"},
            {"key": "subtotal", "label": "Subtotal", "align": "right"},
            {"key": "margin", "label": "Margen", "align": "right"},
        ],
        "rows": rows,
        "totals": {"quantity": money(qty), "amount": money(amount), "margin": money(margin)},
        "truncated": truncated,
        "marginQuality": {
            "linesWithCost": with_cost,
            "linesMissingCost": missing,
            "coveragePct": cov,
        },
        "footnotes": footnotes,
    }))
}

async fn run_top_products(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let top_n = params
        .get("topN")
        .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|i| i as f64)))
        .unwrap_or(20.0)
        .clamp(1.0, 100.0) as i64;
    let compare = parse_compare_with(param_str(params, "compareWith").as_deref());
    let filter = SalesFilter::empty();

    let sql = format!(
        "SELECT p.id AS product_id, MAX(p.name) AS product_name, MAX(v.sku) AS product_sku, \
            COALESCE(SUM(tl.quantity), 0) AS qty, COALESCE(SUM(tl.line_total), 0) AS amount, \
            COALESCE(SUM(CASE WHEN v.cost > 0 THEN tl.line_total - v.cost * tl.quantity ELSE 0 END), 0) AS margin \
         FROM transaction_lines tl \
         INNER JOIN transactions t ON t.id = tl.transaction_id \
         INNER JOIN product_variants v ON v.id = tl.variant_id \
         INNER JOIN products p ON p.id = v.product_id \
         WHERE {} GROUP BY p.id ORDER BY amount DESC LIMIT {top_n}",
        sale_where(&filter, false)
    );
    let rows_db = bind_sale_filters(sqlx::query(&sql), company_id, &from, &to, &filter)
        .fetch_all(pool)
        .await?;
    let rows: Vec<(String, String, Option<String>, f64, f64, f64)> = rows_db
        .into_iter()
        .map(|r| {
            (
                r.get("product_id"),
                r.get("product_name"),
                r.try_get("product_sku").ok().flatten(),
                r.get("qty"),
                r.get("amount"),
                r.get("margin"),
            )
        })
        .collect();
    let total_amount: f64 = rows.iter().map(|r| r.4).sum();
    let total_margin: f64 = rows.iter().map(|r| r.5).sum();

    let mut summary = Map::new();
    summary.insert("products".into(), json!(rows.len() as f64));
    summary.insert("totalAmount".into(), json!(money(total_amount)));
    summary.insert("grossMargin".into(), json!(money(total_margin)));

    let mut summary_delta = None;
    let mut prev_by_product = std::collections::HashMap::<String, f64>::new();
    let mut cmp_note = None;
    if let Some((_, _, pf, pt)) = compare_date_range(from_d, to_d, compare) {
        let prev_sql = format!(
            "SELECT p.id AS product_id, COALESCE(SUM(tl.line_total), 0) AS amount, \
                COALESCE(SUM(CASE WHEN v.cost > 0 THEN tl.line_total - v.cost * tl.quantity ELSE 0 END), 0) AS margin \
             FROM transaction_lines tl \
             INNER JOIN transactions t ON t.id = tl.transaction_id \
             INNER JOIN product_variants v ON v.id = tl.variant_id \
             INNER JOIN products p ON p.id = v.product_id \
             WHERE {} GROUP BY p.id ORDER BY amount DESC LIMIT {top_n}",
            sale_where(&filter, false)
        );
        let prev_rows =
            bind_sale_filters(sqlx::query(&prev_sql), company_id, &pf, &pt, &filter)
                .fetch_all(pool)
                .await?;
        let mut prev_amount = 0.0;
        let mut prev_margin = 0.0;
        for r in &prev_rows {
            let id: String = r.get("product_id");
            let amt: f64 = r.get("amount");
            let m: f64 = r.get("margin");
            prev_by_product.insert(id, amt);
            prev_amount += amt;
            prev_margin += m;
        }
        let mut prev = Map::new();
        prev.insert("products".into(), json!(prev_rows.len() as f64));
        prev.insert("totalAmount".into(), json!(money(prev_amount)));
        prev.insert("grossMargin".into(), json!(money(prev_margin)));
        summary_delta = Some(build_summary_delta(&summary, &prev));
        cmp_note = Some(format!("Comparación: {pf} → {pt}."));
    }

    let mut footnotes = vec![
        "Margen solo suma líneas con cost > 0 (costo actual de variante).".to_string(),
    ];
    if let Some(n) = cmp_note {
        footnotes.push(n);
    }

    Ok(json!({
        "reportId": "top-products",
        "title": "Productos más vendidos",
        "generatedAt": now_iso(),
        "params": {"dateFrom": from, "dateTo": to, "topN": top_n, "compareWith": compare},
        "summary": summary,
        "summaryDelta": summary_delta,
        "series": [{
            "id": "top-by-amount",
            "label": if prev_by_product.is_empty() { "Top por monto" } else { "Top por monto (actual vs comparación)" },
            "chart": "bar",
            "points": rows.iter().map(|r| {
                let label = r.2.as_deref().unwrap_or(&r.1);
                let mut pt = json!({"x": label.chars().take(24).collect::<String>(), "y": money(r.4)});
                if !prev_by_product.is_empty() {
                    pt["y2"] = json!(money(*prev_by_product.get(&r.0).unwrap_or(&0.0)));
                }
                pt
            }).collect::<Vec<_>>(),
        }],
        "columns": [
            {"key": "productSku", "label": "SKU"},
            {"key": "productName", "label": "Producto"},
            {"key": "qty", "label": "Cant.", "align": "right"},
            {"key": "amount", "label": "Monto", "align": "right"},
            {"key": "margin", "label": "Margen", "align": "right"},
        ],
        "rows": rows.iter().map(|r| json!({
            "productId": r.0,
            "productName": r.1,
            "productSku": r.2,
            "qty": money(r.3),
            "amount": money(r.4),
            "margin": money(r.5),
        })).collect::<Vec<_>>(),
        "totals": {"amount": money(total_amount), "margin": money(total_margin)},
        "footnotes": footnotes,
    }))
}

async fn run_sales_by_category(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let compare = parse_compare_with(param_str(params, "compareWith").as_deref());
    let filter = SalesFilter::empty();

    let sql = format!(
        "SELECT COALESCE(c.id, '') AS category_id, COALESCE(c.name, 'Sin categoría') AS category_name, \
            COALESCE(SUM(tl.quantity), 0) AS qty, COALESCE(SUM(tl.line_total), 0) AS amount \
         FROM transaction_lines tl \
         INNER JOIN transactions t ON t.id = tl.transaction_id \
         INNER JOIN product_variants v ON v.id = tl.variant_id \
         INNER JOIN products p ON p.id = v.product_id \
         LEFT JOIN categories c ON c.id = p.category_id \
         WHERE {} GROUP BY c.id, c.name ORDER BY amount DESC",
        sale_where(&filter, false)
    );
    let rows_db = bind_sale_filters(sqlx::query(&sql), company_id, &from, &to, &filter)
        .fetch_all(pool)
        .await?;
    let rows: Vec<(String, String, f64, f64)> = rows_db
        .into_iter()
        .map(|r| {
            (
                r.get("category_id"),
                r.get("category_name"),
                r.get("qty"),
                r.get("amount"),
            )
        })
        .collect();
    let total: f64 = rows.iter().map(|r| r.3).sum();

    let mut summary = Map::new();
    summary.insert("categories".into(), json!(rows.len() as f64));
    summary.insert("totalAmount".into(), json!(money(total)));

    let mut summary_delta = None;
    let mut prev_map = std::collections::HashMap::<String, f64>::new();
    if let Some((_, _, pf, pt)) = compare_date_range(from_d, to_d, compare) {
        let prev_rows =
            bind_sale_filters(sqlx::query(&sql), company_id, &pf, &pt, &filter)
                .fetch_all(pool)
                .await?;
        let mut prev_total = 0.0;
        for r in &prev_rows {
            let id: String = r.get("category_id");
            let amt: f64 = r.get("amount");
            prev_map.insert(id, amt);
            prev_total += amt;
        }
        let mut prev = Map::new();
        prev.insert("categories".into(), json!(prev_rows.len() as f64));
        prev.insert("totalAmount".into(), json!(money(prev_total)));
        summary_delta = Some(build_summary_delta(&summary, &prev));
    }

    Ok(json!({
        "reportId": "sales-by-category",
        "title": "Ventas por categoría",
        "generatedAt": now_iso(),
        "params": {"dateFrom": from, "dateTo": to, "compareWith": compare},
        "summary": summary,
        "summaryDelta": summary_delta,
        "series": [{
            "id": "by-category",
            "label": "Monto por categoría",
            "chart": "pie",
            "points": rows.iter().map(|r| json!({"x": r.1, "y": money(r.3)})).collect::<Vec<_>>(),
        }],
        "columns": [
            {"key": "categoryName", "label": "Categoría"},
            {"key": "qty", "label": "Cant.", "align": "right"},
            {"key": "amount", "label": "Monto", "align": "right"},
        ],
        "rows": rows.iter().map(|r| json!({
            "categoryId": r.0,
            "categoryName": r.1,
            "qty": money(r.2),
            "amount": money(r.3),
            "prevAmount": prev_map.get(&r.0).map(|v| money(*v)),
        })).collect::<Vec<_>>(),
        "totals": {"amount": money(total)},
    }))
}

async fn payment_mix(
    pool: &LitePool,
    company_id: &str,
    from: &str,
    to: &str,
    filter: &SalesFilter,
) -> LiteResult<Vec<(String, f64, i64)>> {
    let sql = format!(
        "SELECT pay.method AS payment_method, COALESCE(SUM(pay.amount), 0) AS total, COUNT(DISTINCT t.id) AS cnt \
         FROM payments pay \
         INNER JOIN transactions t ON t.id = pay.transaction_id \
         WHERE {} GROUP BY pay.method ORDER BY total DESC",
        sale_where(filter, false)
    );
    let rows = bind_sale_filters(sqlx::query(&sql), company_id, from, to, filter)
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.get("payment_method"),
                r.get("total"),
                r.get("cnt"),
            )
        })
        .collect())
}

async fn run_cash_session_close(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    if let Some(session_id) = param_str(params, "cashSessionId") {
        let session = sqlx::query(
            "SELECT id, status, opened_at, closed_at FROM cash_sessions WHERE company_id = ?1 AND id = ?2",
        )
        .bind(company_id)
        .bind(&session_id)
        .fetch_optional(pool)
        .await?;
        let filter = SalesFilter {
            customer_id: None,
            payment_method: None,
            cash_session_id: Some(session_id.clone()),
            product_id: None,
        };
        // Use wide date range for session-scoped filter (date still required by WHERE)
        let mix = payment_mix(pool, company_id, "1970-01-01", "2999-12-31", &filter).await?;
        let total: f64 = mix.iter().map(|m| m.1).sum();
        let count: i64 = mix.iter().map(|m| m.2).sum();
        let status = session
            .as_ref()
            .map(|r| r.get::<String, _>("status"))
            .unwrap_or_else(|| "—".into());
        return Ok(json!({
            "reportId": "cash-session-close",
            "title": "Cierre de sesión de caja",
            "generatedAt": now_iso(),
            "params": {
                "cashSessionId": session_id,
                "sessionStatus": session.as_ref().map(|r| r.get::<String, _>("status")),
                "openedAt": session.as_ref().and_then(|r| r.try_get::<Option<String>, _>("opened_at").ok().flatten()),
                "closedAt": session.as_ref().and_then(|r| r.try_get::<Option<String>, _>("closed_at").ok().flatten()),
            },
            "summary": {
                "totalSales": money(total),
                "ticketCount": count as f64,
                "sessionStatus": status,
            },
            "series": [{
                "id": "payment-mix",
                "label": "Mix de medios de pago",
                "chart": "pie",
                "points": mix.iter().map(|m| json!({"x": m.0, "y": money(m.1)})).collect::<Vec<_>>(),
            }],
            "columns": [
                {"key": "paymentMethod", "label": "Medio de pago"},
                {"key": "count", "label": "Tickets", "align": "right"},
                {"key": "total", "label": "Total", "align": "right"},
            ],
            "rows": mix.iter().map(|m| json!({
                "paymentMethod": m.0, "count": m.2, "total": money(m.1)
            })).collect::<Vec<_>>(),
            "totals": {"total": money(total), "count": count as f64},
        }));
    }

    let (_from_d, _to_d, from, to) = parse_date_range(params)?;
    let filter = SalesFilter::empty();
    let mix = payment_mix(pool, company_id, &from, &to, &filter).await?;
    let total: f64 = mix.iter().map(|m| m.1).sum();
    let count: i64 = mix.iter().map(|m| m.2).sum();
    Ok(json!({
        "reportId": "cash-session-close",
        "title": "Cierre de sesión de caja",
        "generatedAt": now_iso(),
        "params": {"dateFrom": from, "dateTo": to},
        "summary": {
            "totalSales": money(total),
            "ticketCount": count as f64,
        },
        "series": [{
            "id": "payment-mix",
            "label": "Mix de medios de pago",
            "chart": "pie",
            "points": mix.iter().map(|m| json!({"x": m.0, "y": money(m.1)})).collect::<Vec<_>>(),
        }],
        "columns": [
            {"key": "paymentMethod", "label": "Medio de pago"},
            {"key": "count", "label": "Tickets", "align": "right"},
            {"key": "total", "label": "Total", "align": "right"},
        ],
        "rows": mix.iter().map(|m| json!({
            "paymentMethod": m.0, "count": m.2, "total": money(m.1)
        })).collect::<Vec<_>>(),
        "totals": {"total": money(total), "count": count as f64},
    }))
}

async fn run_sales_by_payment_method(
    pool: &LitePool,
    company_id: &str,
    params: &Value,
) -> LiteResult<Value> {
    let (from_d, to_d, from, to) = parse_date_range(params)?;
    let compare = parse_compare_with(param_str(params, "compareWith").as_deref());
    let filter = SalesFilter::empty();
    let mix = payment_mix(pool, company_id, &from, &to, &filter).await?;
    let total: f64 = mix.iter().map(|m| m.1).sum();

    let mut summary = Map::new();
    summary.insert("totalSales".into(), json!(money(total)));
    summary.insert("methods".into(), json!(mix.len() as f64));

    let mut summary_delta = None;
    let mut prev_by_method = std::collections::HashMap::<String, f64>::new();
    if let Some((_, _, pf, pt)) = compare_date_range(from_d, to_d, compare) {
        let prev_mix = payment_mix(pool, company_id, &pf, &pt, &filter).await?;
        let prev_total: f64 = prev_mix.iter().map(|m| m.1).sum();
        for m in &prev_mix {
            prev_by_method.insert(m.0.clone(), m.1);
        }
        let mut prev = Map::new();
        prev.insert("totalSales".into(), json!(money(prev_total)));
        prev.insert("methods".into(), json!(prev_mix.len() as f64));
        summary_delta = Some(build_summary_delta(&summary, &prev));
    }

    Ok(json!({
        "reportId": "sales-by-payment-method",
        "title": "Mix de medios de pago",
        "generatedAt": now_iso(),
        "params": {"dateFrom": from, "dateTo": to, "compareWith": compare},
        "summary": summary,
        "summaryDelta": summary_delta,
        "series": [
            {
                "id": "payment-mix",
                "label": "Mix de pagos",
                "chart": "pie",
                "points": mix.iter().map(|m| json!({"x": m.0, "y": money(m.1)})).collect::<Vec<_>>(),
            },
            {
                "id": "payment-bar",
                "label": if prev_by_method.is_empty() {
                    "Montos por medio"
                } else {
                    "Montos por medio (actual vs comparación)"
                },
                "chart": "bar",
                "points": mix.iter().map(|m| {
                    let mut pt = json!({"x": m.0, "y": money(m.1)});
                    if !prev_by_method.is_empty() {
                        pt["y2"] = json!(money(*prev_by_method.get(&m.0).unwrap_or(&0.0)));
                    }
                    pt
                }).collect::<Vec<_>>(),
            }
        ],
        "columns": [
            {"key": "paymentMethod", "label": "Medio"},
            {"key": "count", "label": "Tickets", "align": "right"},
            {"key": "total", "label": "Total", "align": "right"},
        ],
        "rows": mix.iter().map(|m| json!({
            "paymentMethod": m.0, "count": m.2, "total": money(m.1)
        })).collect::<Vec<_>>(),
        "totals": {"total": money(total)},
    }))
}

/// `params` = body.params from POST /sales-reports/:id/run
pub async fn run_report(
    pool: &LitePool,
    company_id: &str,
    report_id: &str,
    params: Value,
) -> LiteResult<Value> {
    match report_id {
        "sales-by-period" => run_sales_by_period(pool, company_id, &params).await,
        "sales-detail" => run_sales_detail(pool, company_id, &params).await,
        "sales-period-compare" => run_sales_period_compare(pool, company_id, &params).await,
        "sales-by-product" => run_sales_by_product(pool, company_id, &params).await,
        "top-products" => run_top_products(pool, company_id, &params).await,
        "sales-by-category" => run_sales_by_category(pool, company_id, &params).await,
        "cash-session-close" => run_cash_session_close(pool, company_id, &params).await,
        "sales-by-payment-method" => {
            run_sales_by_payment_method(pool, company_id, &params).await
        }
        _ => Err(LiteError::NotFound(format!(
            "reporte desconocido: {report_id}"
        ))),
    }
}
