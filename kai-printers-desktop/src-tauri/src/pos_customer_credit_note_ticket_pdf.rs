//! Nota de crédito POS 80 mm — PDF vectorial.

use crate::pos_customer_credit_note_ticket::{
    parse_pos_customer_credit_note_ticket_from_value, CreditNoteLine, PosCustomerCreditNoteTicket,
};
use crate::ticket_barcode::{draw_code128_bars_centered, BARCODE_SECTION_TOP_GAP_MM};
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

fn line_display_name(line: &CreditNoteLine) -> String {
    let base = line.product_name.trim();
    let attrs = line
        .attributes
        .iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" · ");
    if attrs.is_empty() {
        base.to_string()
    } else if base.is_empty() {
        attrs
    } else {
        format!("{base} · {attrs}")
    }
}

pub fn write_pos_customer_credit_note_ticket_pdf(
    path: &Path,
    nc: &PosCustomerCreditNoteTicket,
) -> Result<()> {
    let mut layout = Layout::new();
    let line_count = nc.lines.len().max(1) as f32;
    layout.advance(45.0 + line_count * (LINE_MM * 2.5) + 40.0);
    let page_h = layout.page_height_mm();
    layout = Layout::new();

    let (doc, page1, layer1) =
        PdfDocument::new("Nota de crédito", Mm(PAGE_W_MM), Mm(page_h), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let layer = doc.get_page(page1).get_layer(layer1);

    let store = nc
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(nc.company.razon_social.as_str());
    write_line_centered(page_h, &layer, &font_bold, FONT_STORE, layout.y, store);
    layout.advance(LINE_MM + 1.0);

    if let Some(rut) = nc.company.rut.as_deref().filter(|s| !s.trim().is_empty()) {
        write_line_centered(
            page_h,
            &layer,
            &font,
            FONT_SMALL,
            layout.y,
            &format!("RUT {}", rut.trim()),
        );
        layout.advance(LINE_MM);
    }

    layout.advance(2.0);
    write_line_centered(page_h, &layer, &font_bold, FONT_BODY, layout.y, "NOTA DE CRÉDITO");
    layout.advance(LINE_MM);
    let folio = nc.credit_note_folio.trim();
    write_line_centered(
        page_h,
        &layer,
        &font,
        FONT_SMALL,
        layout.y,
        &format_datetime(&nc.issued_at_iso),
    );
    layout.advance(LINE_MM);
    write_row(page_h, &layer, &font, FONT_BODY, &mut layout, "Folio NC", folio);

    layout.advance(1.0);
    write_line(page_h, &layer, &font_bold, FONT_BODY, MARGIN_L_MM, layout.y, "Referencias");
    layout.advance(LINE_MM);
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Venta origen",
        nc.original_sale_folio.trim(),
    );
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Devolución",
        nc.sale_return_folio.trim(),
    );

    layout.advance(1.0);
    write_line_centered(page_h, &layer, &font_bold, FONT_BODY, layout.y, "Detalle");
    layout.advance(LINE_MM);

    for line in &nc.lines {
        let name = line_display_name(line);
        write_line(page_h, &layer, &font, FONT_BODY, MARGIN_L_MM, layout.y, &name);
        layout.advance(LINE_MM);
        let qty_y = layout.y;
        let qty_line = format!(
            "{} × {}",
            line.quantity,
            money(line.unit_price_with_tax)
        );
        write_line(page_h, &layer, &font, FONT_BODY, MARGIN_L_MM, layout.y, &qty_line);
        write_line(
            page_h,
            &layer,
            &font,
            FONT_BODY,
            CONTENT_R_MM - 22.0,
            qty_y,
            &money(line.line_total),
        );
        layout.advance(LINE_MM);
    }

    layout.advance(1.0);
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Subtotal neto",
        &money(nc.totals.subtotal_net),
    );
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Impuestos",
        &money(nc.totals.taxes),
    );
    write_row(
        page_h,
        &layer,
        &font,
        FONT_BODY,
        &mut layout,
        "Descuentos",
        &money(nc.totals.discounts),
    );
    write_row(
        page_h,
        &layer,
        &font_bold,
        FONT_BODY + 1.0,
        &mut layout,
        "Monto NC",
        &money(nc.totals.total),
    );

    if !folio.is_empty() {
        layout.advance(BARCODE_SECTION_TOP_GAP_MM);
        let _ = draw_code128_bars_centered(page_h, &layer, layout.y, folio);
        layout.advance(14.0);
        write_line_centered(
            page_h,
            &layer,
            &font,
            FONT_SMALL,
            layout.y,
            &format!("{folio} · {}", format_datetime(&nc.issued_at_iso)),
        );
        layout.advance(LINE_MM);
    }

    let file = File::create(path)?;
    doc.save(&mut BufWriter::new(file))?;
    Ok(())
}

pub fn write_pos_customer_credit_note_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let nc = parse_pos_customer_credit_note_ticket_from_value(value)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("credit_note_ticket_{id}.pdf"));
    write_pos_customer_credit_note_ticket_pdf(&p, &nc)?;
    Ok(p)
}
