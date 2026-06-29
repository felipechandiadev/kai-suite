//! Ticket de prueba 80 mm (mismo formato base que venta POS: @page 80mm, receipt ~72mm).

use crate::ticket_barcode::draw_code128_centered;
use anyhow::Result;
use printpdf::{BuiltinFont, Color, Line, Mm, PdfDocument, Point, Rgb};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

const PAGE_W_MM: f32 = 72.0;
/// Contenido + cola inferior (corte / feed térmico, alineado con POS).
const PAGE_H_MM: f32 = 188.0;
const MARGIN_L_MM: f32 = 1.0;
const MARGIN_R_MM: f32 = 1.0;
const CONTENT_R_MM: f32 = PAGE_W_MM - MARGIN_R_MM;
const LINE_MM: f32 = 3.8;
const FONT_BODY: f32 = 8.0;
const FONT_SMALL: f32 = 7.0;
const FONT_STORE: f32 = 10.0;
const FONT_TOTAL: f32 = 9.0;
const TEST_BARCODE_VALUE: &str = "PRUEBA-80MM";

fn y_from_top(page_h: f32, top_mm: f32) -> Mm {
    Mm(page_h - top_mm)
}

fn write_line(
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    x_mm: f32,
    top_mm: f32,
    text: &str,
) {
    layer.use_text(text, size, Mm(x_mm), y_from_top(PAGE_H_MM, top_mm), font);
}

fn write_line_right(
    layer: &printpdf::PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    right_mm: f32,
    top_mm: f32,
    text: &str,
) {
    let approx_w = text.chars().count() as f32 * size * 0.52;
    let x = (right_mm - approx_w).max(MARGIN_L_MM);
    write_line(layer, font, size, x, top_mm, text);
}

fn dashed_sep(page_h: f32, layer: &printpdf::PdfLayerReference, top_mm: f32) {
    let y = page_h - top_mm;
    let line = Line {
        points: vec![
            (Point::new(Mm(MARGIN_L_MM), Mm(y)), false),
            (Point::new(Mm(CONTENT_R_MM), Mm(y)), false),
        ],
        is_closed: false,
    };
    layer.set_outline_color(Color::Rgb(Rgb::new(0.28, 0.28, 0.28, None)));
    layer.set_outline_thickness(0.65);
    layer.add_line(line);
}

fn format_clp(n: i64) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out.chars().rev().collect::<String>()
}

/// Genera PDF 80 mm tipo ticket de venta POS (datos de ejemplo).
pub fn write_pos_ticket_test_pdf(path: &Path, store_label: &str) -> Result<()> {
    let store = {
        let t = store_label.trim();
        if t.is_empty() {
            "KaiStore"
        } else {
            t
        }
    };

    // Altura fija con espacio para CODE128 de prueba al final.
    let page_h = PAGE_H_MM;
    let (doc, page1, layer1) =
        PdfDocument::new("Prueba ticket", Mm(PAGE_W_MM), Mm(page_h), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let layer = doc.get_page(page1).get_layer(layer1);

    let mut t = 3.0_f32;

    write_line(
        &layer,
        &font_bold,
        FONT_STORE,
        MARGIN_L_MM + 8.0,
        t,
        store,
    );
    t += LINE_MM + 1.0;
    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM + 6.0,
        t,
        "PRUEBA DE IMPRESION",
    );
    t += LINE_MM;
    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM + 14.0,
        t,
        "RUT: 00.000.000-0",
    );
    t += LINE_MM + 2.0;
    dashed_sep(page_h, &layer, t);
    t += LINE_MM + 2.0;

    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM + 10.0,
        t,
        "Folio: PRUEBA-80MM",
    );
    t += LINE_MM;
    let now = chrono::Local::now().format("%d/%m/%Y %H:%M").to_string();
    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM + 10.0,
        t,
        &now,
    );
    t += LINE_MM + 2.0;
    dashed_sep(page_h, &layer, t);
    t += LINE_MM + 2.0;

    write_line(
        &layer,
        &font_bold,
        FONT_BODY,
        MARGIN_L_MM,
        t,
        "DETALLE DE VENTA",
    );
    t += LINE_MM + 1.0;

    write_line(
        &layer,
        &font,
        FONT_BODY,
        MARGIN_L_MM,
        t,
        "Producto de prueba 1",
    );
    t += LINE_MM - 0.5;
    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM,
        t,
        "1 x $1.000",
    );
    write_line_right(
        &layer,
        &font,
        FONT_BODY,
        CONTENT_R_MM,
        t - LINE_MM + 0.5,
        &format!("${}", format_clp(1000)),
    );
    t += LINE_MM + 1.5;

    write_line(
        &layer,
        &font,
        FONT_BODY,
        MARGIN_L_MM,
        t,
        "Producto de prueba 2",
    );
    t += LINE_MM - 0.5;
    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM,
        t,
        "2 x $500",
    );
    write_line_right(
        &layer,
        &font,
        FONT_BODY,
        CONTENT_R_MM,
        t - LINE_MM + 0.5,
        &format!("${}", format_clp(1000)),
    );
    t += LINE_MM + 2.0;
    dashed_sep(page_h, &layer, t);
    t += LINE_MM + 1.0;

    write_line(
        &layer,
        &font,
        FONT_BODY,
        MARGIN_L_MM,
        t,
        "Subtotal neto",
    );
    write_line_right(
        &layer,
        &font,
        FONT_BODY,
        CONTENT_R_MM,
        t,
        &format!("${}", format_clp(1681)),
    );
    t += LINE_MM;
    write_line(&layer, &font, FONT_BODY, MARGIN_L_MM, t, "Impuestos");
    write_line_right(
        &layer,
        &font,
        FONT_BODY,
        CONTENT_R_MM,
        t,
        &format!("${}", format_clp(319)),
    );
    t += LINE_MM + 0.5;
    write_line(&layer, &font_bold, FONT_TOTAL, MARGIN_L_MM, t, "TOTAL");
    write_line_right(
        &layer,
        &font_bold,
        FONT_TOTAL,
        CONTENT_R_MM,
        t,
        &format!("${}", format_clp(2000)),
    );
    t += LINE_MM + 2.0;
    dashed_sep(page_h, &layer, t);
    t += LINE_MM + 2.0;

    write_line(
        &layer,
        &font,
        FONT_SMALL,
        MARGIN_L_MM + 8.0,
        t,
        "Gracias por su compra",
    );
    t += LINE_MM + 2.0;
    dashed_sep(page_h, &layer, t);
    t += LINE_MM + 2.0;

    let _ = draw_code128_centered(page_h, &layer, &font, t, TEST_BARCODE_VALUE, FONT_SMALL)?;

    let _ = t;

    let file = File::create(path)?;
    doc.save(&mut BufWriter::new(file))?;
    Ok(())
}
