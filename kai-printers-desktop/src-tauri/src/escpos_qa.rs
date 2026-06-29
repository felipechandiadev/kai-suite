//! Hoja de prueba ESC/POS (QA): valida RAW, tipografía, montos, código de barras y logo opcional.

use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_default_kai_ticket_logo, append_divider, append_line,
    append_ticket_logo, escpos_align, escpos_apply_ticket_typography, escpos_bold,
    escpos_dense_body, escpos_double_height_off, escpos_double_height_on, escpos_font_a,
    escpos_font_b, escpos_init, layout_width, pad_left, WIDTH_FONT_B,
};
use anyhow::Result;
use chrono::Local;
use std::path::Path;

const QA_BARCODE_WIDTH_58: &str = "QA-ESC-POS-58";
const QA_BARCODE_WIDTH_80: &str = "QA-ESC-POS-80";

fn qa_barcode_label() -> &'static str {
    if crate::escpos_width::escpos_width_chars() <= 32 {
        QA_BARCODE_WIDTH_58
    } else {
        QA_BARCODE_WIDTH_80
    }
}

/// Genera bytes de la hoja de prueba (sin corte; el worker lo añade si corresponde).
pub fn build_escpos_qa_bytes(
    agent_label: &str,
    system_printer: &str,
    include_cut: bool,
    include_logo: bool,
    logo_base64: Option<&str>,
) -> Vec<u8> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);
    escpos_align(&mut buf, 1);
    if include_logo {
        if let Some(b64) = logo_base64.map(str::trim).filter(|s| !s.is_empty()) {
            append_ticket_logo(&mut buf, Some(b64));
        } else {
            append_default_kai_ticket_logo(&mut buf);
        }
    }
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    append_line(&mut buf, "PRUEBA ESC/POS");
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_divider(&mut buf);
    append_line(&mut buf, &format!("Agente: {agent_label}"));
    append_line(&mut buf, &format!("Impresora: {system_printer}"));
    append_line(
        &mut buf,
        &format!("Fecha: {}", Local::now().format("%d/%m/%Y %H:%M")),
    );
    append_line(&mut buf, &format!("Ancho A: {} col", layout_width()));
    append_line(&mut buf, &format!("Ancho B: {WIDTH_FONT_B} col"));
    append_divider(&mut buf);
    escpos_font_b(&mut buf);
    append_line(&mut buf, "Font B — línea de prueba");
    escpos_font_a(&mut buf);
    escpos_dense_body(&mut buf);
    append_line(&mut buf, &pad_left("Monto:", "$12.345"));
    append_divider(&mut buf);
    append_barcode_centered(&mut buf, qa_barcode_label());
    if include_cut {
        buf.extend(crate::pos_sale_ticket_escpos::escpos_post_print_trailer(true, false));
    }
    buf
}

pub fn write_escpos_qa_file(
    path: &Path,
    agent_label: &str,
    system_printer: &str,
    include_cut: bool,
    include_logo: bool,
    logo_base64: Option<&str>,
) -> Result<usize> {
    let bytes = build_escpos_qa_bytes(
        agent_label,
        system_printer,
        include_cut,
        include_logo,
        logo_base64,
    );
    let len = bytes.len();
    std::fs::write(path, &bytes)?;
    Ok(len)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qa_without_logo_omits_raster_logo() {
        let with = build_escpos_qa_bytes("Agent", "printer", false, true, None);
        let without = build_escpos_qa_bytes("Agent", "printer", false, false, None);
        assert!(without.len() < with.len());
        assert!(without.windows(14).any(|w| w == b"PRUEBA ESC/POS"));
    }

    #[test]
    fn qa_with_logo_uses_kai_default_when_no_base64() {
        let bytes = build_escpos_qa_bytes("Agent", "printer", false, true, None);
        let tiny = build_escpos_qa_bytes("Agent", "printer", false, false, None);
        assert!(bytes.len() > tiny.len());
    }

    #[test]
    fn qa_with_global_base64_is_larger_than_without() {
        let b64 = crate::ticket_logos::kai_default_logo_base64();
        let with = build_escpos_qa_bytes("Agent", "printer", false, true, Some(&b64));
        let without = build_escpos_qa_bytes("Agent", "printer", false, false, None);
        assert!(with.len() > without.len());
    }
}
