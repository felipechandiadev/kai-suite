//! Hoja de prueba ESC/POS (QA): valida RAW, tipografía, montos, código de barras y logo opcional.

use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_default_kai_ticket_logo, append_divider, append_line,
    escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_dense_body,
    escpos_double_height_off, escpos_double_height_on, escpos_font_a, escpos_font_b, escpos_init,
    layout_width, pad_left, WIDTH_FONT_B,
};
use anyhow::Result;
use chrono::Local;
use std::path::Path;

const QA_BARCODE: &str = "QA-ESC-POS-80";

/// Genera bytes de la hoja de prueba (sin corte; el worker lo añade si corresponde).
pub fn build_escpos_qa_bytes(
    agent_label: &str,
    system_printer: &str,
    include_cut: bool,
) -> Vec<u8> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);
    escpos_align(&mut buf, 1);
    append_default_kai_ticket_logo(&mut buf);
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
    append_barcode_centered(&mut buf, QA_BARCODE);
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
) -> Result<usize> {
    let bytes = build_escpos_qa_bytes(agent_label, system_printer, include_cut);
    let len = bytes.len();
    std::fs::write(path, &bytes)?;
    Ok(len)
}
