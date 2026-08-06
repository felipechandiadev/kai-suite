//! Comanda de cocina 80 mm en ESC/POS.

use crate::pos_kitchen_ticket::{
    parse_pos_kitchen_ticket_from_value, PosKitchenTicket, PosKitchenTicketLine,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_section_gap, append_ticket_logo, escpos_align, escpos_apply_ticket_typography,
    escpos_bold, escpos_dense_body, escpos_init, format_datetime, pad_left, wrap_lines,
    layout_width, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

const KITCHEN_TICKET_BOTTOM_BLANK_LINES: usize = 4;
const KITCHEN_TICKET_BOTTOM_FEED_UNITS: u8 = 8;

fn format_qty(qty: f64) -> String {
    if (qty.fract()).abs() < 0.001 {
        format!("{}", qty.round() as i64)
    } else {
        format!("{:.2}", qty)
    }
}

fn append_line_notes(buf: &mut Vec<u8>, line: &PosKitchenTicketLine) {
    if let Some(notes) = line.notes.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        for wrapped in wrap_lines(&format!("  * {notes}"), layout_width()) {
            append_line(buf, &wrapped);
        }
    }
}

fn append_kitchen_bottom_feed(buf: &mut Vec<u8>) {
    for _ in 0..KITCHEN_TICKET_BOTTOM_BLANK_LINES {
        append_line(buf, "");
    }
    buf.extend_from_slice(&[0x1B, b'd', KITCHEN_TICKET_BOTTOM_FEED_UNITS]);
}

pub fn build_pos_kitchen_ticket_escpos(t: &PosKitchenTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_AND_RUT);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    let title = if t.is_replica.unwrap_or(false) {
        "COMANDA (COPIA)"
    } else {
        "COMANDA"
    };
    append_line(&mut buf, title);
    escpos_bold(&mut buf, false);

    append_line(
        &mut buf,
        &pad_left("Pedido #:", &t.fire_number.to_string()),
    );
    append_label_value_wrapped(&mut buf, "Estación:", t.production_unit_name.trim());
    append_label_value_wrapped(&mut buf, "Cuenta:", t.account_label.trim());
    if let Some(code) = t
        .table_code
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        append_line(&mut buf, &pad_left("Mesa:", code));
    }
    if let Some(b) = t.branch_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Sucursal:", b.trim()));
    }
    append_line(
        &mut buf,
        &pad_left("Emitido:", &format_datetime(&t.issued_at)),
    );

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "PREPARAR");
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in t.lines.iter().enumerate() {
        let name = line.name.trim();
        let qty = format_qty(line.quantity);
        escpos_bold(&mut buf, true);
        append_line(&mut buf, &format!("{qty}x {name}"));
        escpos_bold(&mut buf, false);
        append_line_notes(&mut buf, line);
        if idx + 1 < t.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    append_divider(&mut buf);
    let footer = t.footer_note.trim();
    if !footer.is_empty() {
        for wrapped in wrap_lines(footer, layout_width()) {
            append_line(&mut buf, &wrapped);
        }
    }
    append_kitchen_bottom_feed(&mut buf);

    Ok(buf)
}

pub fn write_pos_kitchen_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_kitchen_ticket_from_value(value)?;
    let bytes = build_pos_kitchen_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("kitchen_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn builds_non_empty_escpos_from_payload() {
        let value = json!({
            "version": 1,
            "company": {
                "razonSocial": "Ohlala SpA",
                "nombreFantasia": "Ohlala",
                "rut": "76.543.211-1"
            },
            "productionUnitName": "Cocina",
            "fireNumber": 7,
            "accountLabel": "Mesa 3",
            "tableCode": "M3",
            "issuedAt": "2026-08-05T12:00:00.000Z",
            "lines": [{
                "name": "Completo",
                "quantity": 2,
                "notes": "sin mayo"
            }],
            "footerNote": "Comanda de cocina",
            "isReplica": false
        });
        let t = parse_pos_kitchen_ticket_from_value(&value).expect("parse");
        let bytes = build_pos_kitchen_ticket_escpos(&t).expect("build");
        assert!(!bytes.is_empty());
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("COMANDA"));
        assert!(text.contains("PREPARAR"));
        assert!(text.contains("Completo"));
        assert!(
            bytes
                .windows(3)
                .any(|w| w == [0x1B, b'd', KITCHEN_TICKET_BOTTOM_FEED_UNITS]),
            "expected ESC d feed at end of kitchen ticket"
        );
    }
}
