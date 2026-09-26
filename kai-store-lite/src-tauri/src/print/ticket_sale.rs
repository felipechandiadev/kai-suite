//! Renderizado de texto de tickets (impresión real + vista previa).

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::print::db::{get_config, PrintConfig};
use crate::print::platform::dispatch_escpos;

#[derive(Debug, Default, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyHeader {
    pub name: Option<String>,
    pub rut: Option<String>,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub city: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaleTicketArgs {
    pub sale_id: String,
    pub total: f64,
    pub method: String,
    pub lines: Value,
    #[serde(default)]
    pub sold_at: Option<String>,
    #[serde(default)]
    pub company: Option<CompanyHeader>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintPreviewDto {
    pub kind: String,
    pub title: String,
    pub text: String,
    pub cols: u32,
    pub paper_profile: String,
    pub text_encoding: String,
    pub copies: u8,
    pub auto_cut: bool,
    pub open_cash_drawer: bool,
}

pub fn paper_cols(paper_profile: &str) -> u32 {
    match paper_profile {
        "58mm" => 32,
        _ => 42,
    }
}

fn demo_company() -> CompanyHeader {
    CompanyHeader {
        name: Some("Comercio Demo SpA".into()),
        rut: Some("76.123.456-7".into()),
        address: Some("Av. Ejemplo 1234".into()),
        commune: Some("Santiago".into()),
        city: Some("Santiago".into()),
        phone: Some("+56 2 2345 6789".into()),
    }
}

fn resolve_cfg(override_cfg: Option<PrintConfig>) -> Result<PrintConfig, String> {
    match override_cfg {
        Some(mut c) => {
            c.paper_profile = normalize_paper(&c.paper_profile);
            c.text_encoding = normalize_encoding(&c.text_encoding);
            c.sale_ticket_copies = if c.sale_ticket_copies >= 2 { 2 } else { 1 };
            Ok(c)
        }
        None => get_config(),
    }
}

fn normalize_paper(raw: &str) -> String {
    match raw.trim().to_lowercase().as_str() {
        "58mm" | "58" => "58mm".into(),
        _ => "80mm".into(),
    }
}

pub fn normalize_encoding(raw: &str) -> String {
    match raw.trim().to_lowercase().as_str() {
        "cp437" | "ibm437" => "cp437".into(),
        "utf8" | "utf-8" => "utf8".into(),
        _ => "cp850".into(),
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseTicketMethod {
    pub method: String,
    pub amount: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseTicketMovement {
    pub kind: String,
    pub amount: f64,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashCloseTicketArgs {
    pub session_id: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub cashier_name: Option<String>,
    pub ticket_count: i64,
    pub void_count: i64,
    pub sales_total: f64,
    pub average_ticket: f64,
    pub methods: Vec<CashCloseTicketMethod>,
    pub cash_received: f64,
    pub change_given: f64,
    pub cash_net: f64,
    pub opening_amount: f64,
    pub deposits: f64,
    pub withdrawals: f64,
    pub expected_cash: f64,
    pub counted: f64,
    pub movements: Vec<CashCloseTicketMovement>,
    #[serde(default)]
    pub company: Option<CompanyHeader>,
}

pub fn print_sale(args: SaleTicketArgs) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled || !cfg.auto_print_sale {
        return Ok(());
    }
    let text = render_sale_text(&cfg, args.company.as_ref(), &args)?;
    let bytes = build_escpos_for_body(&text, cfg.open_cash_drawer, &cfg)?;
    let copies = cfg.sale_ticket_copies.max(1).min(2);
    for _ in 0..copies {
        dispatch_escpos(&bytes, &text)?;
    }
    Ok(())
}

pub fn print_cash_opening(amount: f64, company: Option<CompanyHeader>) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled || !cfg.auto_print_cash_opening {
        return Ok(());
    }
    let text = render_cash_opening_text(&cfg, company.as_ref(), amount);
    let bytes = build_escpos_for_body(&text, cfg.open_cash_drawer, &cfg)?;
    dispatch_escpos(&bytes, &text)
}

pub fn print_cash_closing(args: CashCloseTicketArgs) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled || !cfg.auto_print_cash_closing {
        return Ok(());
    }
    let text = render_cash_closing_text(&cfg, &args);
    let bytes = build_escpos_for_body(&text, cfg.open_cash_drawer, &cfg)?;
    dispatch_escpos(&bytes, &text)
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionDetailMethod {
    pub method: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionDetailLine {
    pub label: String,
    pub created_at: String,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub code: String,
    pub direction: String,
    pub amount: f64,
    pub balance: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionDetailArgs {
    pub session_id: String,
    pub opening_amount: f64,
    pub sales_total: f64,
    pub expected_cash: f64,
    pub methods: Vec<CashSessionDetailMethod>,
    /// Libro tal como lo ve el diálogo: el más nuevo primero. El ticket lo invierte.
    pub ledger: Vec<CashSessionDetailLine>,
    #[serde(default)]
    pub company: Option<CompanyHeader>,
}

pub fn print_cash_session_detail(args: CashSessionDetailArgs) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled {
        return Err("La impresión está deshabilitada".into());
    }
    let text = render_cash_session_detail_text(&cfg, &args);
    let bytes = build_escpos_for_body(&text, false, &cfg)?;
    dispatch_escpos(&bytes, &text)
}

/// Vista previa con datos de ejemplo (o empresa real si se pasa).
pub fn print_preview(
    kind: &str,
    company: Option<CompanyHeader>,
    config_override: Option<PrintConfig>,
) -> Result<PrintPreviewDto, String> {
    let cfg = resolve_cfg(config_override)?;
    let co = company.or_else(|| Some(demo_company()));
    let cols = paper_cols(&cfg.paper_profile);

    let (title, text, copies, open_drawer) = match kind.trim().to_lowercase().as_str() {
        "sale" | "venta" => {
            let args = SaleTicketArgs {
                sale_id: "preview-ABCDEF12".into(),
                total: 15_990.0,
                method: "Efectivo".into(),
                lines: serde_json::json!([
                    { "name": "Café americano", "qty": 2, "unitPrice": 2500 },
                    { "name": "Medialuna", "qty": 1, "unitPrice": 1490 },
                    { "name": "Jugo natural", "qty": 1, "unitPrice": 3500 },
                ]),
                sold_at: None,
                company: co.clone(),
            };
            (
                "Ticket de venta".to_string(),
                render_sale_text(&cfg, co.as_ref(), &args)?,
                cfg.sale_ticket_copies,
                cfg.open_cash_drawer,
            )
        }
        "cashopening" | "opening" | "apertura" => (
            "Apertura de caja".to_string(),
            render_cash_opening_text(&cfg, co.as_ref(), 50_000.0),
            1,
            cfg.open_cash_drawer,
        ),
        "cashclosing" | "closing" | "cierre" => (
            "Cierre de caja".to_string(),
            render_cash_closing_text(&cfg, &demo_cash_close(co.clone())),
            1,
            cfg.open_cash_drawer,
        ),
        "cashsession" | "cashsessiondetail" | "session" | "detalle" => (
            "Detalle de sesión".to_string(),
            render_cash_session_detail_text(&cfg, &demo_cash_session_detail(co.clone())),
            1,
            false,
        ),
        _ => return Err("Tipo de documento inválido".into()),
    };

    let text = fit_preview_width(&text, cols);

    Ok(PrintPreviewDto {
        kind: kind.to_string(),
        title,
        text,
        cols,
        paper_profile: cfg.paper_profile.clone(),
        text_encoding: cfg.text_encoding.clone(),
        copies,
        auto_cut: cfg.auto_cut_enabled,
        open_cash_drawer: open_drawer,
    })
}

/// Vista previa de un ticket de venta real (post-cobro / reimpresión UI).
pub fn print_sale_preview(args: SaleTicketArgs) -> Result<PrintPreviewDto, String> {
    let cfg = get_config()?;
    let cols = paper_cols(&cfg.paper_profile);
    let text = render_sale_text(&cfg, args.company.as_ref(), &args)?;
    let text = fit_preview_width(&text, cols);
    Ok(PrintPreviewDto {
        kind: "sale".into(),
        title: "Ticket de venta".into(),
        text,
        cols,
        paper_profile: cfg.paper_profile.clone(),
        text_encoding: cfg.text_encoding.clone(),
        copies: cfg.sale_ticket_copies.max(1).min(2),
        auto_cut: cfg.auto_cut_enabled,
        open_cash_drawer: cfg.open_cash_drawer,
    })
}

fn render_sale_text(
    cfg: &PrintConfig,
    company: Option<&CompanyHeader>,
    args: &SaleTicketArgs,
) -> Result<String, String> {
    let mut text = String::new();
    append_company_header(&mut text, company, cfg, true);
    text.push_str(&format!("VENTA {}\n", short_id(&args.sale_id)));
    text.push_str("----------------\n");

    if let Some(arr) = args.lines.as_array() {
        for line in arr {
            let name = line
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("item");
            let qty = line.get("qty").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let unit = line
                .get("unitPrice")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let line_total = qty * unit;
            text.push_str(&format!(
                "{name}\n  {qty} x {} = {}\n",
                fmt_money(unit, &cfg.currency_symbol),
                fmt_money(line_total, &cfg.currency_symbol)
            ));
        }
    } else {
        text.push_str(&format!("Lines: {}\n", args.lines));
    }

    text.push_str("----------------\n");
    text.push_str(&format!("TOTAL: {}\n", fmt_money(args.total, &cfg.currency_symbol)));
    text.push_str(&format!("Pago: {}\n", args.method));
    if cfg.show_sale_datetime {
        let cols = paper_cols(&cfg.paper_profile) as usize;
        text.push('\n');
        text.push_str(&center_line(&format_sale_stamp(args.sold_at.as_deref()), cols));
        text.push('\n');
    }
    let footer = cfg.ticket_footer.trim();
    if !footer.is_empty() {
        text.push('\n');
        text.push_str(footer);
        text.push('\n');
    }
    Ok(text)
}

fn render_cash_opening_text(cfg: &PrintConfig, company: Option<&CompanyHeader>, amount: f64) -> String {
    let mut text = String::new();
    append_company_header(&mut text, company, cfg, false);
    text.push_str("APERTURA CAJA\n");
    text.push_str(&format!("Fondo: {}\n", fmt_money(amount, &cfg.currency_symbol)));
    text
}

fn demo_cash_close(company: Option<CompanyHeader>) -> CashCloseTicketArgs {
    CashCloseTicketArgs {
        session_id: "preview-ABCDEF12".into(),
        opened_at: "2026-09-26 09:00:00".into(),
        closed_at: Some("2026-09-26 18:30:00".into()),
        cashier_name: Some("Cajero".into()),
        ticket_count: 12,
        void_count: 1,
        sales_total: 186_000.0,
        average_ticket: 15_500.0,
        methods: vec![
            CashCloseTicketMethod {
                method: "CASH".into(),
                amount: 90_000.0,
                count: 6,
            },
            CashCloseTicketMethod {
                method: "TRANSFER".into(),
                amount: 96_000.0,
                count: 6,
            },
        ],
        cash_received: 95_000.0,
        change_given: 5_000.0,
        cash_net: 90_000.0,
        opening_amount: 20_000.0,
        deposits: 10_000.0,
        withdrawals: 8_000.0,
        expected_cash: 112_000.0,
        counted: 111_000.0,
        movements: vec![
            CashCloseTicketMovement {
                kind: "DEPOSIT".into(),
                amount: 10_000.0,
                note: Some("Fondo extra".into()),
                created_at: "2026-09-26 11:00:00".into(),
            },
            CashCloseTicketMovement {
                kind: "WITHDRAWAL".into(),
                amount: 8_000.0,
                note: Some("Pago proveedor".into()),
                created_at: "2026-09-26 16:10:00".into(),
            },
        ],
        company,
    }
}

fn render_cash_closing_text(cfg: &PrintConfig, args: &CashCloseTicketArgs) -> String {
    let sym = cfg.currency_symbol.as_str();
    let mut text = String::new();
    append_company_header(&mut text, args.company.as_ref(), cfg, false);
    text.push_str("CIERRE DE CAJA\n");
    text.push_str(&format!("Sesión: {}\n", short_id(&args.session_id)));
    text.push_str(&format!("Apertura: {}\n", fmt_when(&args.opened_at)));
    text.push_str(&format!(
        "Cierre: {}\n",
        args.closed_at
            .as_deref()
            .map(fmt_when)
            .unwrap_or_else(|| "—".into())
    ));
    if let Some(name) = args.cashier_name.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        text.push_str(&format!("Cajero: {name}\n"));
    }

    text.push_str("----------------\n");
    text.push_str("VENTAS\n");
    text.push_str(&format!("Tickets: {}\n", args.ticket_count));
    text.push_str(&format!("Anuladas: {}\n", args.void_count));
    text.push_str(&format!("Total: {}\n", fmt_money(args.sales_total, sym)));
    text.push_str(&format!(
        "Promedio: {}\n",
        fmt_money(args.average_ticket, sym)
    ));

    text.push_str("----------------\n");
    text.push_str("MEDIOS\n");
    let cash_used = args.cash_received > 0.0 || args.change_given > 0.0;
    if cash_used {
        text.push_str("Efectivo\n");
        text.push_str(&format!("  Recibido: {}\n", fmt_money(args.cash_received, sym)));
        text.push_str(&format!("  Vuelto: {}\n", fmt_money(args.change_given, sym)));
        text.push_str(&format!("  Neto: {}\n", fmt_money(args.cash_net, sym)));
    }
    let mut other = false;
    for method in &args.methods {
        if method.method == "CASH" {
            continue;
        }
        other = true;
        text.push_str(&format!("{}\n", payment_label(&method.method)));
        text.push_str(&format!(
            "  {} ({})\n",
            fmt_money(method.amount, sym),
            method.count
        ));
    }
    if !cash_used && !other {
        text.push_str("Sin cobros\n");
    }

    text.push_str("----------------\n");
    text.push_str("CAJÓN\n");
    text.push_str(&format!("Fondo: {}\n", fmt_money(args.opening_amount, sym)));
    text.push_str(&format!("Neto ventas: {}\n", fmt_money(args.cash_net, sym)));
    text.push_str(&format!("Ingresos: {}\n", fmt_money(args.deposits, sym)));
    text.push_str(&format!("Retiros: {}\n", fmt_money(args.withdrawals, sym)));
    text.push_str(&format!(
        "Efectivo esperado: {}\n",
        fmt_money(args.expected_cash, sym)
    ));
    text.push_str(&format!("Contado: {}\n", fmt_money(args.counted, sym)));
    let diff = args.counted - args.expected_cash;
    if diff.abs() < 0.5 {
        text.push_str("Cuadra\n");
    } else if diff > 0.0 {
        text.push_str(&format!("Sobrante: {}\n", fmt_money(diff, sym)));
    } else {
        text.push_str(&format!("Faltante: {}\n", fmt_money(diff.abs(), sym)));
    }
    text
}

fn demo_cash_session_detail(company: Option<CompanyHeader>) -> CashSessionDetailArgs {
    CashSessionDetailArgs {
        session_id: "preview-ABCDEF12".into(),
        opening_amount: 3_000.0,
        sales_total: 101_500.0,
        expected_cash: 99_500.0,
        methods: vec![
            CashSessionDetailMethod {
                method: "CASH".into(),
                amount: 96_500.0,
            },
            CashSessionDetailMethod {
                method: "DEBIT_CARD".into(),
                amount: 4_000.0,
            },
            CashSessionDetailMethod {
                method: "TRANSFER".into(),
                amount: 1_000.0,
            },
        ],
        ledger: vec![
            CashSessionDetailLine {
                label: "Vuelto".into(),
                created_at: "2026-09-26 10:16:00".into(),
                kind: "SALE".into(),
                code: "preview-ABCDEF12".into(),
                direction: "out".into(),
                amount: 3_500.0,
                balance: 99_500.0,
            },
            CashSessionDetailLine {
                label: "Efectivo recibido".into(),
                created_at: "2026-09-26 10:15:00".into(),
                kind: "SALE".into(),
                code: "preview-ABCDEF12".into(),
                direction: "in".into(),
                amount: 100_000.0,
                balance: 103_000.0,
            },
            CashSessionDetailLine {
                label: "Apertura".into(),
                created_at: "2026-09-26 09:00:00".into(),
                kind: "OPENING".into(),
                code: String::new(),
                direction: "in".into(),
                amount: 3_000.0,
                balance: 3_000.0,
            },
        ],
        company,
    }
}

fn render_cash_session_detail_text(cfg: &PrintConfig, args: &CashSessionDetailArgs) -> String {
    let sym = cfg.currency_symbol.as_str();
    let mut text = String::new();
    append_company_header(&mut text, args.company.as_ref(), cfg, false);
    text.push_str("DETALLE DE SESIÓN\n");
    text.push_str(&format!("Sesión: {}\n", short_id(&args.session_id)));
    text.push_str("----------------\n");
    text.push_str(&format!(
        "Efectivo en caja: {}\n",
        fmt_money(args.expected_cash, sym)
    ));
    text.push_str(&format!(
        "Fondo de apertura: {}\n",
        fmt_money(args.opening_amount, sym)
    ));
    text.push_str(&format!(
        "Ventas totales: {}\n",
        fmt_money(args.sales_total, sym)
    ));
    if !args.methods.is_empty() {
        text.push_str("Detalles de ventas\n");
        for method in &args.methods {
            text.push_str(&format!(
                "  {}: {}\n",
                payment_label(&method.method),
                fmt_money(method.amount, sym)
            ));
        }
    }
    text.push_str("----------------\n");
    text.push_str("MOVIMIENTOS\n");
    if args.ledger.is_empty() {
        text.push_str("Sin movimientos\n");
    } else {
        for line in args.ledger.iter().rev() {
            let sign = if line.direction == "out" { "-" } else { "+" };
            if line.kind == "SALE" && !line.code.trim().is_empty() {
                text.push_str(&format!(
                    "{}  Venta {}\n",
                    fmt_clock(&line.created_at),
                    short_id(&line.code)
                ));
                text.push_str(&format!("  {}\n", line.label));
            } else {
                text.push_str(&format!(
                    "{}  {}\n",
                    fmt_clock(&line.created_at),
                    line.label
                ));
            }
            text.push_str(&format!(
                "  {sign}{}   Saldo {}\n",
                fmt_money(line.amount, sym),
                fmt_money(line.balance, sym)
            ));
        }
    }
    text
}

fn fmt_clock(raw: &str) -> String {
    let t = raw.trim().replace('T', " ");
    if t.len() >= 16 {
        t[11..16].to_string()
    } else if t.len() >= 5 {
        t[t.len() - 5..].to_string()
    } else {
        t
    }
}

fn payment_label(method: &str) -> String {
    match method {
        "CASH" => "Efectivo".into(),
        "CREDIT_CARD" => "Tarjeta crédito".into(),
        "DEBIT_CARD" => "Tarjeta débito".into(),
        "TRANSFER" => "Transferencia".into(),
        other => other.to_string(),
    }
}

fn fmt_when(raw: &str) -> String {
    let t = raw.trim().replace('T', " ");
    if t.len() >= 16 {
        t[..16].to_string()
    } else {
        t
    }
}

fn append_company_header(
    text: &mut String,
    company: Option<&CompanyHeader>,
    cfg: &PrintConfig,
    center: bool,
) {
    let cols = paper_cols(&cfg.paper_profile) as usize;
    let push = |text: &mut String, line: &str| {
        if center {
            text.push_str(&center_line(line, cols));
        } else {
            text.push_str(line);
        }
        text.push('\n');
    };

    let name = company
        .and_then(|c| c.name.as_deref())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("KaiStore Lite");
    push(text, name);

    if let Some(c) = company {
        if cfg.show_company_rut {
            if let Some(rut) = c.rut.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                push(text, &format!("RUT: {rut}"));
            }
        }
        if cfg.show_company_address {
            if let Some(addr) = c.address.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                push(text, addr);
            }
            let loc = [c.commune.as_deref(), c.city.as_deref()]
                .into_iter()
                .flatten()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
                .join(", ");
            if !loc.is_empty() {
                push(text, &loc);
            }
        }
        if cfg.show_company_phone {
            if let Some(phone) = c.phone.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                push(text, &format!("Tel: {phone}"));
            }
        }
    }
    text.push_str("----------------\n");
}

fn center_line(line: &str, cols: usize) -> String {
    let width = line.chars().count();
    if cols == 0 || width >= cols {
        return line.to_string();
    }
    let pad = (cols - width) / 2;
    format!("{}{line}", " ".repeat(pad))
}

fn format_sale_stamp(raw: Option<&str>) -> String {
    let local = raw
        .and_then(parse_sale_stamp)
        .unwrap_or_else(chrono::Local::now);
    local.format("%d/%m/%Y - %H:%M").to_string()
}

fn parse_sale_stamp(raw: &str) -> Option<chrono::DateTime<chrono::Local>> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(t) {
        return Some(dt.with_timezone(&chrono::Local));
    }
    let naive = t.replace('T', " ");
    let naive = naive.split('.').next().unwrap_or(&naive);
    let parsed = chrono::NaiveDateTime::parse_from_str(naive, "%Y-%m-%d %H:%M:%S")
        .ok()
        .or_else(|| chrono::NaiveDateTime::parse_from_str(naive, "%Y-%m-%d %H:%M").ok())?;
    Some(parsed.and_utc().with_timezone(&chrono::Local))
}

/// Ajusta líneas largas al ancho del papel (preview / wrap suave).
fn fit_preview_width(text: &str, cols: u32) -> String {
    let w = cols.max(16) as usize;
    let mut out = String::new();
    for line in text.lines() {
        if line.chars().count() <= w {
            out.push_str(line);
            out.push('\n');
            continue;
        }
        let mut buf = String::new();
        for ch in line.chars() {
            if buf.chars().count() >= w {
                out.push_str(&buf);
                out.push('\n');
                buf.clear();
            }
            buf.push(ch);
        }
        if !buf.is_empty() {
            out.push_str(&buf);
            out.push('\n');
        }
    }
    out
}

fn short_id(id: &str) -> &str {
    let t = id.trim();
    if t.len() > 8 {
        &t[t.len() - 8..]
    } else {
        t
    }
}

fn fmt_money(n: f64, symbol: &str) -> String {
    let rounded = n.round() as i64;
    let neg = rounded < 0;
    let digits = rounded.abs().to_string();
    let grouped = digits
        .as_bytes()
        .rchunks(3)
        .rev()
        .map(|c| std::str::from_utf8(c).unwrap_or(""))
        .collect::<Vec<_>>()
        .join(".");
    let with_symbol = format!("{symbol}{grouped}");
    if neg {
        format!("-{with_symbol}")
    } else {
        with_symbol
    }
}

fn encode_body(body: &str, encoding: &str) -> Vec<u8> {
    match normalize_encoding(encoding).as_str() {
        "utf8" => body.as_bytes().to_vec(),
        "cp437" => encode_to_single_byte(body, &CP437_MAP),
        _ => encode_to_single_byte(body, &CP850_MAP),
    }
}

/// Mapa aproximado Unicode → byte (CP850 / CP437) para español CL en térmicas.
fn encode_to_single_byte(body: &str, table: &[(char, u8)]) -> Vec<u8> {
    let mut out = Vec::with_capacity(body.len());
    for ch in body.chars() {
        if ch.is_ascii() {
            out.push(ch as u8);
            continue;
        }
        if let Some((_, b)) = table.iter().find(|(c, _)| *c == ch) {
            out.push(*b);
        } else {
            out.push(b'?');
        }
    }
    out
}

/// CP850 (Latam) — tildes / ñ / signos frecuentes.
const CP850_MAP: &[(char, u8)] = &[
    ('á', 0xa0),
    ('é', 0x82),
    ('í', 0xa1),
    ('ó', 0xa2),
    ('ú', 0xa3),
    ('ü', 0x81),
    ('ñ', 0xa4),
    ('Á', 0xb5),
    ('É', 0x90),
    ('Í', 0xd6),
    ('Ó', 0xe0),
    ('Ú', 0xe9),
    ('Ü', 0x9a),
    ('Ñ', 0xa5),
    ('¿', 0xa8),
    ('¡', 0xad),
    ('°', 0xf8),
    ('×', 0x9e),
    ('—', 0xc4),
    ('–', 0xc4),
    ('“', 0xf2),
    ('”', 0xf3),
    ('‘', 0x60),
    ('’', 0x27),
];

/// CP437 — subset útil (usa mismas tildes donde existen; resto ?).
const CP437_MAP: &[(char, u8)] = &[
    ('á', 0xa0),
    ('é', 0x82),
    ('í', 0xa1),
    ('ó', 0xa2),
    ('ú', 0xa3),
    ('ü', 0x81),
    ('ñ', 0xa4),
    ('Á', 0x41),
    ('É', 0x45),
    ('Í', 0x49),
    ('Ó', 0x4f),
    ('Ú', 0x55),
    ('Ü', 0x9a),
    ('Ñ', 0xa5),
    ('¿', 0xa8),
    ('¡', 0xad),
    ('°', 0xf8),
];

pub(crate) fn build_escpos_for_body(
    body: &str,
    open_drawer: bool,
    cfg: &PrintConfig,
) -> Result<Vec<u8>, String> {
    let encoded = encode_body(body, &cfg.text_encoding);
    let mut out: Vec<u8> = Vec::with_capacity(encoded.len() + 32);
    out.extend_from_slice(&[0x1b, 0x40]);
    out.extend_from_slice(&encoded);
    if !body.ends_with('\n') {
        out.push(b'\n');
    }
    out.extend_from_slice(b"\n\n\n");
    if open_drawer {
        out.extend_from_slice(&[0x1b, 0x70, 0x00, 0x19, 0xfa]);
    }
    if cfg.auto_cut_enabled {
        out.extend_from_slice(&[0x1d, 0x56, 0x00]);
    }
    Ok(out)
}
