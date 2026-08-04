//! Planilla de conteo 80 mm en ESC/POS (alineado a `cash-count-sheet-print.ts`).

use crate::pos_cash_count_sheet_ticket::{
    parse_pos_cash_count_sheet_ticket_from_value, PosCashCountSheetTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_ticket_logo, escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_init, format_datetime, pad_left,
    wrap_lines, layout_width, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

const DEFAULT_PAYMENT_ROWS: [&str; 6] = [
    "Efectivo",
    "Tarjeta debito",
    "Tarjeta credito",
    "Transferencia",
    "Cheque",
    "Otros",
];

const WRITABLE_FILL: &str = "________________________________";

fn payment_rows(t: &PosCashCountSheetTicket) -> Vec<String> {
    let from_payload: Vec<String> = t
        .payment_lines
        .iter()
        .map(|p| p.label.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if !from_payload.is_empty() {
        return from_payload;
    }
    DEFAULT_PAYMENT_ROWS
        .iter()
        .map(|s| (*s).to_string())
        .collect()
}

fn append_writable_line(buf: &mut Vec<u8>, label: &str) {
    let label = label.trim();
    if label.is_empty() {
        return;
    }
    append_label_value_wrapped(buf, label, WRITABLE_FILL);
}

pub fn build_pos_cash_count_sheet_ticket_escpos(t: &PosCashCountSheetTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_ONLY);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "PLANILLA DE CONTEO");
    escpos_bold(&mut buf, false);
    append_line(&mut buf, "Cierre de caja — anotar montos");

    let origin = [t.branch_name.as_deref(), t.point_of_sale_name.as_deref()]
        .into_iter()
        .filter_map(|s| s.map(str::trim).filter(|s| !s.is_empty()))
        .collect::<Vec<_>>()
        .join(" · ");
    if !origin.is_empty() {
        append_divider(&mut buf);
        append_label_value_wrapped(&mut buf, "Origen:", &origin);
    }
    if let Some(op) = t.operator_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Operador:", op.trim()));
    }
    let sid = t.cash_session_id.trim();
    if !sid.is_empty() {
        let short: String = if sid.chars().count() > 8 {
            sid.chars().take(8).collect::<String>().to_uppercase()
        } else {
            sid.to_uppercase()
        };
        append_line(&mut buf, &pad_left("Sesion:", &short));
    }
    if let Some(opened) = t.session_opened_at.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(
            &mut buf,
            &pad_left("Apertura:", &format_datetime(opened)),
        );
    }
    let printed = t.printed_at.trim();
    if !printed.is_empty() {
        append_line(
            &mut buf,
            &pad_left("Impresion:", &format_datetime(printed)),
        );
    }

    append_divider(&mut buf);
    for line in wrap_lines(
        "Escriba el monto contado en cada linea antes de ingresarlo en el POS.",
        layout_width(),
    ) {
        append_line(&mut buf, &line);
    }

    append_divider(&mut buf);
    for label in payment_rows(t) {
        append_writable_line(&mut buf, &label);
        append_line(&mut buf, "");
    }

    escpos_bold(&mut buf, true);
    append_writable_line(&mut buf, "TOTAL");
    escpos_bold(&mut buf, false);

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Firma operador:");
    append_line(&mut buf, "_______________________");
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_cash_count_sheet_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_cash_count_sheet_ticket_from_value(value)?;
    let bytes = build_pos_cash_count_sheet_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cash_count_sheet_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}
