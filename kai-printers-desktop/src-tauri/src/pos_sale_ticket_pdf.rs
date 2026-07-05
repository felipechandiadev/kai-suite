//! Ticket de venta POS 80 mm (PDF vectorial desde JSON enviado por la PWA).
//! Layout alineado con `pwa-pos` → `thermal-receipt-ticket-styles.ts` + `buildPosSaleReceiptHtml`.

use crate::ticket_barcode::{
    draw_code128_bars_centered, ticket_footer_tail_height_mm, BARCODE_FOLIO_FONT_PT,
    BARCODE_SECTION_TOP_GAP_MM,
};
use anyhow::{Context, Result};
use printpdf::{BuiltinFont, Color, Line, Mm, PdfDocument, Point, Rgb};
use serde::Deserialize;
use serde::de::Deserializer;
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};

/// Bobina nominal 80 mm; el PDF usa el ancho **imprimible** (~72 mm) para que CUPS no
/// escale una página de 80 mm dentro de la zona real (eso dejaba el texto otra vez ~64 mm).
const PAGE_W_MM: f32 = 72.0;
const MARGIN_L_MM: f32 = 1.0;
const MARGIN_R_MM: f32 = 1.0;
const CONTENT_W_MM: f32 = PAGE_W_MM - MARGIN_L_MM - MARGIN_R_MM;
const CONTENT_R_MM: f32 = MARGIN_L_MM + CONTENT_W_MM;
const LINE_MM: f32 = 3.5;
const FONT_BODY: f32 = 8.0;
const FONT_SMALL: f32 = 7.0;
/// Detalle de venta y folio bajo el código de barras.
const FONT_DETAIL: f32 = BARCODE_FOLIO_FONT_PT;
const FONT_STORE: f32 = 10.0;
const FONT_TOTAL: f32 = 9.0;
/// Avance tras el pie (corte térmico). Sin logo arriba; altura de página = contenido + esto.
const BOTTOM_FEED_MM: f32 = 14.0;
/// Ancho reservado a la derecha para el total de línea (el nombre usa el resto).
const LINE_TOTAL_COL_MM: f32 = 13.0;
const WRAP_NAME_CHARS: usize = 36;
const WRAP_BODY_CHARS: usize = 42;
/// Separadores entre bloques (detalle, pagos, totales, etc.).
const SECTION_SEP_THICKNESS_MM: f32 = 0.65;
const SECTION_SEP_RGB: f32 = 0.28;

/// Acepta `null` o array ausente → `Vec` vacío (payload POS envía `null` en colecciones vacías).
fn deserialize_null_as_default_vec<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt = Option::<Vec<T>>::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCompany {
    #[serde(default)]
    pub razon_social: String,
    pub nombre_fantasia: Option<String>,
    pub rut: Option<String>,
    pub business_activity: Option<String>,
    /// PNG/JPEG en base64 (sin prefijo `data:` o con él); logo en ticket ESC/POS/PDF.
    pub logo_base64: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCustomer {
    pub name: Option<String>,
    pub document: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TicketQuotation {
    pub(crate) document_number: Option<String>,
    pub(crate) valid_until: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketLine {
    pub product_name: String,
    #[serde(default)]
    pub attributes: Vec<String>,
    pub quantity: f64,
    pub unit_symbol: Option<String>,
    pub unit_price_with_tax: f64,
    pub line_gross: f64,
    #[serde(default)]
    pub discount_amount: Option<f64>,
    pub discount_label: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketPromotion {
    pub code: String,
    pub name: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketPayment {
    pub label: String,
    pub amount: f64,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketBackorder {
    pub percent: f64,
    pub deposit_amount: f64,
    pub order_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketTotals {
    pub subtotal_net: f64,
    pub taxes: f64,
    #[serde(default)]
    pub line_discounts: f64,
    #[serde(default)]
    pub order_discount: f64,
    pub total: f64,
    #[serde(default)]
    pub change: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCollectionRow {
    pub folio: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketQuotaCollectionRow {
    pub folio: String,
    pub due_date: Option<String>,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCreditInstallmentRow {
    pub installment_number: i32,
    pub due_date: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosSaleTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub folio: String,
    pub issued_at_iso: String,
    #[serde(default)]
    pub document_kind: String,
    pub backorder: Option<TicketBackorder>,
    #[serde(default)]
    pub fiscal_folio: Option<String>,
    #[serde(default)]
    pub fiscal_boleta_warning: Option<String>,
    #[serde(default)]
    pub collection_pending: bool,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub ar_collection: Vec<TicketCollectionRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub quota_collection: Vec<TicketQuotaCollectionRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub credit_installment_plan: Vec<TicketCreditInstallmentRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub nc_payout: Vec<TicketCollectionRow>,
    pub company: TicketCompany,
    pub customer: Option<TicketCustomer>,
    pub quotation: Option<TicketQuotation>,
    #[serde(default)]
    pub lines: Vec<TicketLine>,
    #[serde(default)]
    pub promotions: Vec<TicketPromotion>,
    pub totals: TicketTotals,
    #[serde(default)]
    pub payments: Vec<TicketPayment>,
    #[serde(default)]
    pub operator_name: Option<String>,
}

pub fn sale_ticket_section_heading(ticket: &PosSaleTicket) -> &'static str {
    if !ticket.nc_payout.is_empty() {
        return "DEVOLUCION SALDO NC";
    }
    if !ticket.quota_collection.is_empty() {
        return "COBRO DE CUOTAS";
    }
    if !ticket.ar_collection.is_empty() {
        return "COBRO PENDIENTE";
    }
    if ticket.document_kind == "backorder" {
        return "Detalle de Encargo";
    }
    "Detalle de Venta"
}

pub fn sale_ticket_thanks_message(ticket: &PosSaleTicket) -> &'static str {
    if !ticket.nc_payout.is_empty() {
        return "Comprobante de devolucion de saldo NC";
    }
    if !ticket.ar_collection.is_empty() || !ticket.quota_collection.is_empty() {
        return "Comprobante de cobro";
    }
    if ticket.document_kind == "backorder" {
        return "";
    }
    if ticket.collection_pending {
        return "Venta registrada - cobro pendiente";
    }
    "Gracias por su compra"
}

struct Layout {
    y: f32,
}

impl Layout {
    fn new() -> Self {
        Self { y: 0.0 }
    }

    fn advance(&mut self, mm: f32) {
        self.y += mm;
    }

    fn content_height_mm(&self) -> f32 {
        self.y.max(40.0)
    }

    fn page_height_mm(&self) -> f32 {
        (self.y + BOTTOM_FEED_MM).max(50.0)
    }
}

fn ticket_text(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
}

fn wrap_lines(text: &str, max_chars: usize) -> Vec<String> {
    let t = ticket_text(text);
    if t.is_empty() {
        return vec![];
    }
    let words: Vec<&str> = t.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut cur = String::new();
    for w in words {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.len() + 1 + w.len() <= max_chars {
            cur.push(' ');
            cur.push_str(w);
        } else {
            lines.push(cur);
            cur = w.to_string();
        }
    }
    if !cur.is_empty() {
        lines.push(cur);
    }
    lines
}

fn format_clp(n: f64) -> String {
    let v = n.round() as i64;
    let s = v.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out.chars().rev().collect::<String>()
}

fn money(n: f64) -> String {
    format!("${}", format_clp(n))
}

/// Una línea bajo el código de barras: `FOLIO · dd/mm/yyyy HH:MM`.
fn footer_folio_datetime_line(folio: &str, issued_at_iso: &str) -> String {
    let f = folio.trim();
    let dt = format_datetime(issued_at_iso);
    if f.is_empty() {
        dt
    } else if dt.is_empty() || dt == "—" {
        f.to_string()
    } else {
        format!("{f} · {dt}")
    }
}

fn format_datetime(iso: &str) -> String {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(iso) {
        return dt.with_timezone(&chrono::Local).format("%d/%m/%Y %H:%M").to_string();
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(iso, "%Y-%m-%dT%H:%M:%S%.fZ") {
        return dt.format("%d/%m/%Y %H:%M").to_string();
    }
    ticket_text(iso)
}

fn format_date_short(iso_or_date: &str) -> String {
    let s = iso_or_date.trim();
    if let Ok(dt) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return dt.format("%d/%m/%Y").to_string();
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return dt.format("%d/%m/%Y").to_string();
    }
    ticket_text(s)
}

/// Punto tipográfico → milímetros (PDF).
const PT_TO_MM: f32 = 0.352_778;

/// `top_mm`: distancia desde el borde superior del ticket (empresa primero, pie al final).
fn y_from_top(page_h: f32, top_mm: f32) -> Mm {
    Mm(page_h - top_mm)
}

/// Anchos Helvetica WinAnsi en milésimas de em (PDF 1.7, Helvetica).
fn helvetica_advance_thousandths(c: char) -> f32 {
    match c {
        ' ' => 278.0,
        '!' => 278.0,
        '"' => 355.0,
        '$' => 556.0,
        '%' => 889.0,
        '.' => 278.0,
        ',' => 278.0,
        '-' | '−' => 333.0,
        '0'..='9' => 556.0,
        ':' => 278.0,
        ';' => 278.0,
        'A'..='Z' => 667.0,
        'a'..='z' => 556.0,
        'Á' | 'É' | 'Í' | 'Ó' | 'Ú' | 'Ñ' => 667.0,
        'á' | 'é' | 'í' | 'ó' | 'ú' | 'ñ' => 556.0,
        _ => 600.0,
    }
}

fn text_width_mm(text: &str, size_pt: f32) -> f32 {
    let units: f32 = text.chars().map(helvetica_advance_thousandths).sum();
    units / 1000.0 * size_pt * PT_TO_MM
}

/// Borde derecho fijo del bloque de montos (todas las líneas terminan aquí).
const MONEY_RIGHT_EDGE_MM: f32 = CONTENT_R_MM;

fn write_line(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    x_mm: f32,
    top_mm: f32,
    text: &str,
) {
    let t = ticket_text(text);
    if t.is_empty() {
        return;
    }
    layer.use_text(&t, size, Mm(x_mm), y_from_top(page_h, top_mm), font);
}

fn write_line_centered(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    top_mm: f32,
    text: &str,
) {
    let t = ticket_text(text);
    if t.is_empty() {
        return;
    }
    let x = ((PAGE_W_MM - text_width_mm(&t, size)) / 2.0).max(MARGIN_L_MM);
    layer.use_text(&t, size, Mm(x), y_from_top(page_h, top_mm), font);
}

/// Montos alineados al borde derecho (`MONEY_RIGHT_EDGE_MM`).
fn write_line_right_edge(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size_pt: f32,
    top_mm: f32,
    text: &str,
) {
    let t = ticket_text(text);
    if t.is_empty() {
        return;
    }
    let w_mm = text_width_mm(&t, size_pt);
    let x = (MONEY_RIGHT_EDGE_MM - w_mm).max(MARGIN_L_MM);
    layer.use_text(&t, size_pt, Mm(x), y_from_top(page_h, top_mm), font);
}

fn write_row(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size_pt: f32,
    layout: &mut Layout,
    left: &str,
    right: &str,
) {
    let t = layout.y;
    write_line(page_h, layer, font, size_pt, MARGIN_L_MM, t, left);
    write_line_right_edge(page_h, layer, font, size_pt, t, right);
    layout.advance(LINE_MM);
}

fn dashed_sep(page_h: f32, layer: &printpdf::PdfLayerReference, layout: &mut Layout) {
    let y = page_h - layout.y;
    let line = Line {
        points: vec![
            (Point::new(Mm(MARGIN_L_MM), Mm(y)), false),
            (Point::new(Mm(CONTENT_R_MM), Mm(y)), false),
        ],
        is_closed: false,
    };
    layer.set_outline_color(Color::Rgb(Rgb::new(
        SECTION_SEP_RGB,
        SECTION_SEP_RGB,
        SECTION_SEP_RGB,
        None,
    )));
    layer.set_outline_thickness(SECTION_SEP_THICKNESS_MM);
    layer.add_line(line);
    layout.advance(LINE_MM + 1.5);
}

fn write_wrapped(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    layout: &mut Layout,
    text: &str,
    size: f32,
    centered: bool,
    max_chars: usize,
) {
    for line in wrap_lines(text, max_chars) {
        if centered {
            write_line_centered(page_h, layer, font, size, layout.y, &line);
        } else {
            write_line(page_h, layer, font, size, MARGIN_L_MM, layout.y, &line);
        }
        layout.advance(LINE_MM);
    }
}

fn write_section_title(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font_bold: &printpdf::IndirectFontRef,
    layout: &mut Layout,
    title: &str,
) {
    let upper = ticket_text(title).to_uppercase();
    write_line(
        page_h,
        layer,
        font_bold,
        FONT_BODY,
        MARGIN_L_MM,
        layout.y,
        &upper,
    );
    layout.advance(LINE_MM + 0.5);
}

fn write_product_line(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    _font_bold: &printpdf::IndirectFontRef,
    layout: &mut Layout,
    line: &TicketLine,
) {
    let name = format_product_line_name(line);
    let name_max_w = (MONEY_RIGHT_EDGE_MM - LINE_TOTAL_COL_MM - MARGIN_L_MM - 0.5).max(30.0);
    let name_wrap_chars = ((name_max_w / (FONT_DETAIL * 0.35)).floor() as usize)
        .max(WRAP_NAME_CHARS)
        .min(48);
    for wl in wrap_lines(&name, name_wrap_chars) {
        write_line(page_h, layer, font, FONT_DETAIL, MARGIN_L_MM, layout.y, &wl);
        layout.advance(LINE_MM);
    }
    let unit_suffix = line
        .unit_symbol
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|u| format!(" {u}"))
        .unwrap_or_default();
    let qty_line = format!(
        "{} × {}{}",
        trim_qty(line.quantity),
        money(line.unit_price_with_tax),
        unit_suffix
    );
    let qty_y = layout.y;
    write_line(page_h, layer, font, FONT_DETAIL, MARGIN_L_MM, layout.y, &qty_line);
    write_line_right_edge(page_h, layer, font, FONT_DETAIL, qty_y, &money(line.line_gross));
    layout.advance(LINE_MM);
    if line.discount_amount.unwrap_or(0.0) > 0.01 {
        let lbl = line
            .discount_label
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("Promo");
        write_line(
            page_h,
            layer,
            font,
            FONT_DETAIL,
            MARGIN_L_MM,
            layout.y,
            &format!("Desc.: {}", lbl),
        );
        write_line_right_edge(
            page_h,
            layer,
            font,
            FONT_DETAIL,
            layout.y,
            &format!("−{}", money(line.discount_amount.unwrap_or(0.0))),
        );
        layout.advance(LINE_MM - 0.3);
    }
    layout.advance(1.0);
}

fn measure_product_line(line: &TicketLine, layout: &mut Layout) {
    let name = format_product_line_name(line);
    for _ in wrap_lines(&name, WRAP_NAME_CHARS) {
        layout.advance(LINE_MM);
    }
    layout.advance(LINE_MM);
    if line.discount_amount.unwrap_or(0.0) > 0.01 {
        layout.advance(LINE_MM - 0.3);
    }
    layout.advance(1.0);
}

type DrawCtx<'a> = (
    &'a f32,
    &'a printpdf::PdfLayerReference,
    &'a printpdf::IndirectFontRef,
    &'a printpdf::IndirectFontRef,
);

fn plan_ticket(
    ticket: &PosSaleTicket,
    layout: &mut Layout,
    draw: Option<DrawCtx<'_>>,
) {
    let is_backorder = ticket.document_kind == "backorder";
    let store = ticket
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(ticket.company.razon_social.as_str());

    if let Some((page_h, layer, _font, font_bold)) = draw {
        write_wrapped(*page_h, layer, font_bold, layout, store, FONT_STORE, true, WRAP_BODY_CHARS);
    } else {
        for _ in wrap_lines(store, WRAP_BODY_CHARS) {
            layout.advance(LINE_MM);
        }
    }

    if let Some(fantasy) = ticket.company.nombre_fantasia.as_deref() {
        let rs = ticket.company.razon_social.trim();
        if !rs.is_empty() && fantasy.trim() != rs {
            if let Some((page_h, layer, font, _)) = draw {
                write_wrapped(*page_h, layer, font, layout, rs, FONT_SMALL, true, WRAP_BODY_CHARS);
            } else {
                for _ in wrap_lines(rs, WRAP_BODY_CHARS) {
                    layout.advance(LINE_MM);
                }
            }
        }
    }

    if let Some(rut) = ticket.company.rut.as_deref().filter(|s| !s.trim().is_empty()) {
        let rut_line = format!("RUT: {}", rut.trim());
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(*page_h, layer, font, layout, &rut_line, FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            for _ in wrap_lines(&rut_line, WRAP_BODY_CHARS) {
                layout.advance(LINE_MM);
            }
        }
    }

    if let Some(act) = ticket
        .company
        .business_activity
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(*page_h, layer, font, layout, act.trim(), FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            for _ in wrap_lines(act.trim(), WRAP_BODY_CHARS) {
                layout.advance(LINE_MM);
            }
        }
    }

    layout.advance(0.5);

    if draw.is_some() {
        if let Some((page_h, layer, _, _)) = draw {
            dashed_sep(*page_h, layer, layout);
        }
    } else {
        layout.advance(LINE_MM + 2.0);
    }
    let folio = ticket.folio.trim();
    if !folio.is_empty() {
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(
                *page_h,
                layer,
                font,
                layout,
                &format!("Folio: {folio}"),
                FONT_SMALL,
                true,
                WRAP_BODY_CHARS,
            );
        } else {
            layout.advance(LINE_MM);
        }
    }
    if let Some(ff) = ticket.fiscal_folio.as_deref().filter(|s| !s.trim().is_empty()) {
        let line = format!("Boleta SII: {}", ff.trim());
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(*page_h, layer, font, layout, &line, FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            layout.advance(LINE_MM);
        }
    }
    if let Some(w) = ticket
        .fiscal_boleta_warning
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(*page_h, layer, font, layout, w.trim(), FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            layout.advance(LINE_MM);
        }
    }
    let dt = format_datetime(&ticket.issued_at_iso);
    if !dt.is_empty() && dt != "—" {
        if let Some((page_h, layer, font, _)) = draw {
            write_wrapped(*page_h, layer, font, layout, &dt, FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            layout.advance(LINE_MM);
        }
    }
    if ticket.collection_pending {
        if let Some((page_h, layer, font_bold, _)) = draw {
            write_line_centered(*page_h, layer, font_bold, FONT_BODY, layout.y, "COBRO PENDIENTE");
            layout.advance(LINE_MM);
            let pending = format!("Saldo por cobrar: {}", money(ticket.totals.total));
            write_wrapped(*page_h, layer, font_bold, layout, &pending, FONT_SMALL, true, WRAP_BODY_CHARS);
        } else {
            layout.advance(LINE_MM * 2.0);
        }
    }

    if is_backorder {
        if let Some(bo) = &ticket.backorder {
            let mut s = format!("Abono: {}", money(bo.deposit_amount));
            if bo.percent > 0.01 {
                s.push_str(&format!(" · {:.0}%", bo.percent));
            }
            if let Some((page_h, layer, font, _)) = draw {
                write_wrapped(*page_h, layer, font, layout, &s, FONT_SMALL, true, WRAP_BODY_CHARS);
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if let Some(c) = &ticket.customer {
        let has = c.name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.document.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.phone.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.email.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false);
        if has {
            if draw.is_some() {
                if let Some((page_h, layer, _, font_bold)) = draw {
                    dashed_sep(*page_h, layer, layout);
                    write_section_title(*page_h, layer, font_bold, layout, "Cliente");
                }
            } else {
                layout.advance(LINE_MM + 2.0 + LINE_MM);
            }
            if let Some(name) = c.name.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Nombre", name.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
            if let Some(doc) = c.document.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Documento", doc.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
            if let Some(ph) = c.phone.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Teléfono", ph.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
            if let Some(em) = c.email.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Email", em.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
        }
    }

    if let Some(q) = &ticket.quotation {
        if q.document_number.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false) {
            if draw.is_some() {
                if let Some((page_h, layer, _, font_bold)) = draw {
                    dashed_sep(*page_h, layer, layout);
                    write_section_title(*page_h, layer, font_bold, layout, "Cotización origen");
                }
            } else {
                layout.advance(LINE_MM + 2.0 + LINE_MM);
            }
            if let Some(num) = q.document_number.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Folio", num.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
            if let Some(vu) = q.valid_until.as_deref().filter(|s| !s.trim().is_empty()) {
                if let Some((page_h, layer, font, _)) = draw {
                    write_row(*page_h, layer, font, FONT_BODY, layout, "Válida hasta", vu.trim());
                } else {
                    layout.advance(LINE_MM);
                }
            }
        }
    }

    if draw.is_some() {
        if let Some((page_h, layer, _, font_bold)) = draw {
            dashed_sep(*page_h, layer, layout);
            let heading = sale_ticket_section_heading(ticket);
            write_line_centered(*page_h, layer, font_bold, FONT_BODY, layout.y, heading);
            layout.advance(LINE_MM + 0.5);
        }
    } else {
        layout.advance(LINE_MM + 2.0 + LINE_MM);
    }

    for line in &ticket.lines {
        if let Some((page_h, layer, font, font_bold)) = draw {
            write_product_line(*page_h, layer, font, font_bold, layout, line);
        } else {
            measure_product_line(line, layout);
        }
    }

    if !ticket.promotions.is_empty() {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Promociones");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for p in &ticket.promotions {
            if let Some((page_h, layer, font, _)) = draw {
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    &format!("{} {}", p.code.trim(), p.name.trim()),
                    &format!("−{}", money(p.amount)),
                );
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if draw.is_some() {
        if let Some((page_h, layer, _, _)) = draw {
            dashed_sep(*page_h, layer, layout);
        }
    } else {
        layout.advance(LINE_MM + 2.0);
    }

    let tot = &ticket.totals;
    if let Some((page_h, layer, font, font_bold)) = draw {
        write_row(
            *page_h,
            layer,
            font,
            FONT_BODY,
            layout,
            "Subtotal neto",
            &money(tot.subtotal_net),
        );
        write_row(
            *page_h,
            layer,
            font,
            FONT_BODY,
            layout,
            "Impuestos",
            &money(tot.taxes),
        );
        if tot.line_discounts > 0.01 {
            write_row(
                *page_h,
                layer,
                font,
                FONT_BODY,
                layout,
                "Descuentos línea",
                &format!("−{}", money(tot.line_discounts)),
            );
        }
        if tot.order_discount > 0.01 {
            write_row(
                *page_h,
                layer,
                font,
                FONT_BODY,
                layout,
                "Descuento orden",
                &format!("−{}", money(tot.order_discount)),
            );
        }
        if is_backorder {
            if let Some(bo) = &ticket.backorder {
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    "Total pedido",
                    &money(bo.order_total),
                );
                write_row(
                    *page_h,
                    layer,
                    font_bold,
                    FONT_TOTAL,
                    layout,
                    "Abono",
                    &money(bo.deposit_amount),
                );
                let pending = (bo.order_total - bo.deposit_amount).max(0.0);
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    "Saldo pendiente",
                    &money(pending),
                );
            }
        } else {
            write_row(
                *page_h,
                layer,
                font_bold,
                FONT_TOTAL,
                layout,
                "TOTAL",
                &money(tot.total),
            );
        }
    } else {
        layout.advance(LINE_MM * 6.0);
    }

    let show_payments = !ticket.payments.is_empty() || tot.change > 0.01;
    if show_payments {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Pagos");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for p in &ticket.payments {
            if let Some((page_h, layer, font, _)) = draw {
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    p.label.trim(),
                    &money(p.amount),
                );
                if let Some(det) = p.detail.as_deref().filter(|s| !s.trim().is_empty()) {
                    for wl in wrap_lines(det, WRAP_BODY_CHARS) {
                        write_line(
                            *page_h,
                            layer,
                            font,
                            FONT_SMALL,
                            MARGIN_L_MM,
                            layout.y,
                            &wl,
                        );
                        layout.advance(LINE_MM - 0.3);
                    }
                }
            } else {
                layout.advance(LINE_MM);
            }
        }
        if tot.change > 0.01 {
            if let Some((page_h, layer, font, _)) = draw {
                write_row(*page_h, layer, font, FONT_BODY, layout, "Vuelto", &money(tot.change));
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if !ticket.ar_collection.is_empty() {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Ventas cobradas");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for row in &ticket.ar_collection {
            if let Some((page_h, layer, font, _)) = draw {
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    row.folio.trim(),
                    &money(row.amount),
                );
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if !ticket.quota_collection.is_empty() {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Cuotas cobradas");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for row in &ticket.quota_collection {
            let mut label = row.folio.trim().to_string();
            if let Some(due) = row.due_date.as_deref().filter(|s| !s.trim().is_empty()) {
                label.push_str(" · vence ");
                label.push_str(&format_date_short(due));
            }
            if let Some((page_h, layer, font, _)) = draw {
                write_row(*page_h, layer, font, FONT_BODY, layout, &label, &money(row.amount));
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if !ticket.credit_installment_plan.is_empty() {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Plan de cobro (credito interno)");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for row in &ticket.credit_installment_plan {
            let mut label = format!("Cuota {}", row.installment_number);
            if !row.due_date.trim().is_empty() {
                label.push_str(" · ");
                label.push_str(&format_date_short(row.due_date.trim()));
            }
            if let Some((page_h, layer, font, _)) = draw {
                write_row(*page_h, layer, font, FONT_BODY, layout, &label, &money(row.amount));
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    if !ticket.nc_payout.is_empty() {
        if draw.is_some() {
            if let Some((page_h, layer, _, font_bold)) = draw {
                dashed_sep(*page_h, layer, layout);
                write_section_title(*page_h, layer, font_bold, layout, "Notas de credito liquidadas");
            }
        } else {
            layout.advance(LINE_MM + 2.0 + LINE_MM);
        }
        for row in &ticket.nc_payout {
            if let Some((page_h, layer, font, _)) = draw {
                write_row(
                    *page_h,
                    layer,
                    font,
                    FONT_BODY,
                    layout,
                    row.folio.trim(),
                    &money(row.amount),
                );
            } else {
                layout.advance(LINE_MM);
            }
        }
    }

    let thanks = sale_ticket_thanks_message(ticket);
    if draw.is_some() {
        if let Some((page_h, layer, font, _)) = draw {
            let folio = ticket.folio.trim();
            if !folio.is_empty() {
                layout.advance(BARCODE_SECTION_TOP_GAP_MM);
                if let Ok(bar_h) = draw_code128_bars_centered(*page_h, layer, layout.y, folio) {
                    if bar_h > 0.0 {
                        layout.advance(bar_h + 2.0);
                    }
                }
            }
            let footer_line = footer_folio_datetime_line(folio, &ticket.issued_at_iso);
            if !footer_line.is_empty() {
                write_line_centered(*page_h, layer, font, FONT_SMALL, layout.y, &footer_line);
                layout.advance(LINE_MM);
            }
            write_wrapped(*page_h, layer, font, layout, thanks, FONT_SMALL, true, WRAP_BODY_CHARS);
            layout.advance(LINE_MM);
        }
    } else {
        if !ticket.folio.trim().is_empty() {
            layout.advance(ticket_footer_tail_height_mm());
        }
        layout.advance(LINE_MM);
    }
}

fn same_label(a: &str, b: &str) -> bool {
    a.trim().eq_ignore_ascii_case(b.trim())
}

pub(crate) fn format_product_line_name(line: &TicketLine) -> String {
    let base = line.product_name.trim();
    if base.is_empty() {
        return String::new();
    }
    let mut seen = std::collections::HashSet::new();
    let mut extras = Vec::new();
    for attr in &line.attributes {
        let a = ticket_text(attr);
        if a.is_empty() || same_label(&a, base) {
            continue;
        }
        let key = a.to_lowercase();
        if seen.insert(key) {
            extras.push(a);
        }
    }
    if extras.is_empty() {
        return base.to_string();
    }
    let mut parts = vec![base.to_string()];
    parts.extend(extras);
    parts.join(" · ")
}

fn trim_qty(q: f64) -> String {
    if (q.fract()).abs() < 0.0001 {
        format!("{}", q.round() as i64)
    } else {
        format!("{:.2}", q)
    }
}

pub fn write_pos_sale_ticket_pdf(path: &Path, ticket: &PosSaleTicket) -> Result<()> {
    let mut measure_layout = Layout::new();
    plan_ticket(ticket, &mut measure_layout, None);
    let content_h = measure_layout.content_height_mm();
    let page_h = measure_layout.page_height_mm();
    tracing::info!(
        page_w_mm = PAGE_W_MM,
        content_w_mm = CONTENT_W_MM,
        content_h_mm = content_h,
        page_h_mm = page_h,
        bottom_feed_mm = BOTTOM_FEED_MM,
        "pos_sale_ticket_pdf layout (top-down, sin logo)"
    );
    let (doc, page1, layer1) =
        PdfDocument::new("Ticket venta", Mm(PAGE_W_MM), Mm(page_h), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let layer = doc.get_page(page1).get_layer(layer1);
    let mut layout = Layout::new();
    plan_ticket(ticket, &mut layout, Some((&page_h, &layer, &font, &font_bold)));
    let file = File::create(path)?;
    doc.save(&mut BufWriter::new(file))?;
    Ok(())
}

#[cfg(test)]
mod money_align_tests {
    use super::*;

    #[test]
    fn money_width_is_much_smaller_than_old_heuristic() {
        let s = "$1.234.567";
        let w = text_width_mm(s, 7.0);
        let old = s.chars().count() as f32 * 7.0 * 0.48;
        assert!(w < old * 0.5, "w={w} old={old}");
    }

    #[test]
    fn right_edge_x_uses_measured_width() {
        let s = "$10.000";
        let w = text_width_mm(s, 8.0);
        let x = MONEY_RIGHT_EDGE_MM - w;
        assert!(x > 50.0 && x < 68.0, "x={x} w={w}");
    }
}

pub fn parse_pos_sale_ticket_from_value(value: &serde_json::Value) -> Result<PosSaleTicket> {
    serde_json::from_value(value.clone()).context("parse pos-sale-ticket")
}

pub fn write_pos_sale_ticket_pdf_from_value(dir: &PathBuf, value: &serde_json::Value) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let ticket = parse_pos_sale_ticket_from_value(value)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("sale_ticket_{id}.pdf"));
    write_pos_sale_ticket_pdf(&p, &ticket)?;
    Ok(p)
}
