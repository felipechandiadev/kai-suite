//! Ticket de preventa 80 mm en ESC/POS (alineado a `presale-ticket-print.ts`).

use crate::pos_presale_ticket::{parse_pos_presale_ticket_from_value, PosPresaleTicket};
use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_company_store_header, append_divider, append_line,
    append_ticket_logo, append_operator_footer, escpos_align, escpos_apply_ticket_typography,
    escpos_bold, escpos_double_height_off, escpos_double_height_on, escpos_init, format_datetime,
    money, pad_left, wrap_lines, layout_width, CompanyHeaderStyle,
};
use crate::ticket_header_prefs;
use anyhow::Result;
use std::path::PathBuf;

/// Líneas en blanco al final del contenido (antes del feed/corte del worker).
const PRESALE_BOTTOM_FEED_LINES: usize = 4;

fn scannable_payload(ticket: &PosPresaleTicket) -> &str {
    let qr = ticket.qr_payload.trim();
    if !qr.is_empty() {
        return qr;
    }
    ticket.code.trim()
}

fn append_presale_bottom_feed(buf: &mut Vec<u8>) {
    for _ in 0..PRESALE_BOTTOM_FEED_LINES {
        append_line(buf, "");
    }
}

pub fn build_pos_presale_ticket_escpos(ticket: &PosPresaleTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, ticket.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &ticket.company, CompanyHeaderStyle::FULL, ticket.branch_name.as_deref());

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    append_line(&mut buf, "TICKET DE PREVENTA");
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);

    if ticket_header_prefs::should_emit_branch_line(ticket.branch_name.as_deref()) {
        if let Some(b) = ticket.branch_name.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            append_line(&mut buf, &pad_left("Sucursal:", b));
        }
    }
    if let Some(p) = ticket
        .point_of_sale_name
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_line(&mut buf, &pad_left("Punto venta:", p.trim()));
    }

    let code = ticket.code.trim();
    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    for line in wrap_lines(code, layout_width() / 2) {
        append_line(&mut buf, &line);
    }
    escpos_bold(&mut buf, false);
    append_line(&mut buf, "Presenta este codigo en caja");
    escpos_align(&mut buf, 0);

    let payload = scannable_payload(ticket);
    if !payload.is_empty() {
        append_barcode_centered(&mut buf, payload);
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("TOTAL:", &money(ticket.total)));
    escpos_bold(&mut buf, false);

    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Presenta este codigo en caja");
    append_line(&mut buf, &format_datetime(&ticket.issued_at));
    append_operator_footer(&mut buf, ticket.operator_name.as_deref());
    escpos_align(&mut buf, 0);
    append_presale_bottom_feed(&mut buf);

    Ok(buf)
}

pub fn write_pos_presale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let ticket = parse_pos_presale_ticket_from_value(value)?;
    let bytes = build_pos_presale_ticket_escpos(&ticket)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("presale_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presale_escpos_has_preventa_heading_and_code_without_detail() {
        let code = "TESTPRESALE12345678";
        let v = serde_json::json!({
            "code": code,
            "qrPayload": code,
            "issuedAt": "2026-01-01T12:00:00Z",
            "company": { "razonSocial": "Tienda" },
            "lines": [{
                "productName": "Item",
                "quantity": 1,
                "total": 1190
            }],
            "total": 1190
        });
        let ticket = parse_pos_presale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_presale_ticket_escpos(&ticket).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
        assert!(text.contains("PREVENTA"));
        assert!(text.contains(code));
        assert!(text.contains("TOTAL:"));
        assert!(!text.contains("DETALLE"));
    }
}
