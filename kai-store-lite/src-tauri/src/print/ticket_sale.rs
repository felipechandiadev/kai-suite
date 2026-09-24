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
    let bytes = build_escpos_for_body(&text, false, &cfg)?;
    dispatch_escpos(&bytes, &text)
}

pub fn print_cash_closing(
    counted: f64,
    opening_float: f64,
    company: Option<CompanyHeader>,
) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled || !cfg.auto_print_cash_closing {
        return Ok(());
    }
    let text = render_cash_closing_text(&cfg, company.as_ref(), counted, opening_float);
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
            false,
        ),
        "cashclosing" | "closing" | "cierre" => (
            "Cierre de caja".to_string(),
            render_cash_closing_text(&cfg, co.as_ref(), 128_450.0, 50_000.0),
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
    append_company_header(&mut text, company, cfg);
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
    append_company_header(&mut text, company, cfg);
    text.push_str("APERTURA CAJA\n");
    text.push_str(&format!("Fondo: {}\n", fmt_money(amount, &cfg.currency_symbol)));
    text
}

fn render_cash_closing_text(
    cfg: &PrintConfig,
    company: Option<&CompanyHeader>,
    counted: f64,
    opening_float: f64,
) -> String {
    let mut text = String::new();
    append_company_header(&mut text, company, cfg);
    text.push_str("CIERRE CAJA\n");
    text.push_str(&format!("Apertura: {}\n", fmt_money(opening_float, &cfg.currency_symbol)));
    text.push_str(&format!("Contado: {}\n", fmt_money(counted, &cfg.currency_symbol)));
    text.push_str(&format!(
        "Diff: {}\n",
        fmt_money(counted - opening_float, &cfg.currency_symbol)
    ));
    text
}

fn append_company_header(text: &mut String, company: Option<&CompanyHeader>, cfg: &PrintConfig) {
    let name = company
        .and_then(|c| c.name.as_deref())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("KaiStore Lite");
    text.push_str(name);
    text.push('\n');

    if let Some(c) = company {
        if cfg.show_company_rut {
            if let Some(rut) = c.rut.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                text.push_str(&format!("RUT: {rut}\n"));
            }
        }
        if cfg.show_company_address {
            if let Some(addr) = c.address.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                text.push_str(addr);
                text.push('\n');
            }
            let loc = [c.commune.as_deref(), c.city.as_deref()]
                .into_iter()
                .flatten()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
                .join(", ");
            if !loc.is_empty() {
                text.push_str(&loc);
                text.push('\n');
            }
        }
        if cfg.show_company_phone {
            if let Some(phone) = c.phone.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                text.push_str(&format!("Tel: {phone}\n"));
            }
        }
    }
    text.push_str("----------------\n");
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
