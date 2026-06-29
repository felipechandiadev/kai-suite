//! Arqueo de caja POS 80 mm — PDF vectorial.

use crate::pos_cash_closing_ticket::{
    parse_pos_cash_closing_ticket_from_value, CountedBuckets, PosCashClosingTicket,
};
use anyhow::Result;
use printpdf::{BuiltinFont, Mm, PdfDocument};
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};

const PAGE_W_MM: f32 = 72.0;
const MARGIN_L_MM: f32 = 1.0;
const CONTENT_R_MM: f32 = 71.0;
const LINE_MM: f32 = 3.5;
const FONT_BODY: f32 = 8.0;
const FONT_SMALL: f32 = 7.0;
const FONT_STORE: f32 = 10.0;
const BOTTOM_FEED_MM: f32 = 14.0;

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
    fn page_height_mm(&self) -> f32 {
        (self.y + BOTTOM_FEED_MM).max(50.0)
    }
}

fn ticket_text(s: &str) -> String {
    s.chars().filter(|c| !c.is_control()).collect()
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
    out.chars().rev().collect()
}

fn money(n: f64) -> String {
    format!("${}", format_clp(n))
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

fn y_from_top(page_h: f32, top_mm: f32) -> Mm {
    Mm(page_h - top_mm)
}

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
    if !t.is_empty() {
        layer.use_text(&t, size, Mm(x_mm), y_from_top(page_h, top_mm), font);
    }
}

fn write_line_centered(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    top_mm: f32,
    text: &str,
) {
    write_line(page_h, layer, font, size, MARGIN_L_MM, top_mm, text);
}

fn write_row(
    page_h: f32,
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    layout: &mut Layout,
    label: &str,
    value: &str,
) {
    write_line(page_h, layer, font, size, MARGIN_L_MM, layout.y, label);
    write_line(page_h, layer, font, size, CONTENT_R_MM - 28.0, layout.y, value);
    layout.advance(LINE_MM);
}

const COUNTED_ROWS: [(&str, fn(&CountedBuckets) -> f64); 6] = [
    ("Efectivo", |c| c.cash),
    ("Tarjeta débito", |c| c.debit_card),
    ("Tarjeta crédito", |c| c.credit_card),
    ("Transferencia", |c| c.transfer),
    ("Cheque", |c| c.check),
    ("Otros", |c| c.other),
];

pub fn write_pos_cash_closing_ticket_pdf(path: &Path, t: &PosCashClosingTicket) -> Result<()> {
    let mut layout = Layout::new();
    layout.advance(80.0);
    let page_h = layout.page_height_mm();
    layout = Layout::new();

    let (doc, page1, layer1) = PdfDocument::new("Arqueo de caja", Mm(PAGE_W_MM), Mm(page_h), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let layer = doc.get_page(page1).get_layer(layer1);

    let store = t
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(t.company.razon_social.as_str());
    write_line_centered(page_h, &layer, &font_bold, FONT_STORE, layout.y, store);
    layout.advance(LINE_MM + 2.0);
    write_line_centered(page_h, &layer, &font_bold, FONT_BODY, layout.y, "ARQUEO DE CAJA");
    layout.advance(LINE_MM);
    write_line_centered(page_h, &layer, &font, FONT_SMALL, layout.y, "Cierre de sesión");
    layout.advance(LINE_MM + 1.0);

    if let Some(opened) = t.session_opened_at.as_deref().filter(|s| !s.trim().is_empty()) {
        write_row(
            page_h,
            &layer,
            &font,
            FONT_BODY,
            &mut layout,
            "Apertura",
            &format_datetime(opened),
        );
    }
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Cierre",
        &format_datetime(&t.closed_at),
    );

    layout.advance(1.0);
    write_line(page_h, &layer, &font_bold, FONT_BODY, MARGIN_L_MM, layout.y, "Conteo declarado");
    layout.advance(LINE_MM);

    let mut any = false;
    for (label, getter) in COUNTED_ROWS {
        let amt = getter(&t.counted);
        if amt <= 0.01 {
            continue;
        }
        any = true;
        write_row(page_h, &layer, &font, FONT_BODY, &mut layout, label, &money(amt));
    }
    if !any {
        write_line_centered(page_h, &layer, &font, FONT_SMALL, layout.y, "Sin montos");
        layout.advance(LINE_MM);
    }
    write_row(
        page_h,
        &layer,
        &font_bold,
        FONT_BODY + 1.0,
        &mut layout,
        "TOTAL",
        &money(t.counted_grand),
    );

    if t.used_blind_count {
        layout.advance(1.0);
        write_line(page_h, &layer, &font_bold, FONT_BODY, MARGIN_L_MM, layout.y, "Cuadre");
        layout.advance(LINE_MM);
        write_row(
            page_h,
            &layer,
            &font,
            FONT_BODY,
            &mut layout,
            "Efectivo teórico",
            &money(t.system_cash_expected.unwrap_or(0.0)),
        );
        write_row(
            page_h,
            &layer,
            &font,
            FONT_BODY,
            &mut layout,
            "Efectivo contado",
            &money(t.counted.cash),
        );
        if let Some(diff) = t.difference {
            write_row(page_h, &layer, &font, FONT_BODY, &mut layout, "Diferencia", &money(diff));
        }
    }

    layout.advance(2.0);
    let msg = t
        .message
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("Sesión cerrada");
    write_line_centered(page_h, &layer, &font, FONT_SMALL, layout.y, msg);
    layout.advance(LINE_MM);

    let file = File::create(path)?;
    doc.save(&mut BufWriter::new(file))?;
    Ok(())
}

pub fn write_pos_cash_closing_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_cash_closing_ticket_from_value(value)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cash_closing_ticket_{id}.pdf"));
    write_pos_cash_closing_ticket_pdf(&p, &t)?;
    Ok(p)
}
