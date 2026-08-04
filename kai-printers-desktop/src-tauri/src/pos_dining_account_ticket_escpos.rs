//! Cuenta dining (pre-cuenta) 80 mm en ESC/POS.

use crate::pos_dining_account_ticket::{
    parse_pos_dining_account_ticket_from_value, PosDiningAccountTicket, PosDiningAccountTicketLine,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_product_line_block, append_section_gap, append_ticket_logo, escpos_align,
    escpos_apply_ticket_typography, escpos_bold, escpos_dense_body, escpos_init, format_datetime, money, pad_left, wrap_lines,
    layout_width, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

/// Líneas en blanco al final (antes del feed/corte del worker).
const DINING_ACCOUNT_BOTTOM_BLANK_LINES: usize = 4;
/// Avance extra de papel (`ESC d n`) para que el pie no quede bajo la cuchilla.
const DINING_ACCOUNT_BOTTOM_FEED_UNITS: u8 = 8;

fn kind_label(kind: &str) -> &'static str {
    match kind.trim().to_uppercase().as_str() {
        "TABLE" => "Mesa",
        "COUNTER" => "Barra",
        "TAKEAWAY" => "Para llevar",
        _ => "Cuenta",
    }
}

fn format_qty(qty: f64) -> String {
    if (qty.fract()).abs() < 0.001 {
        format!("{}", qty.round() as i64)
    } else {
        format!("{:.2}", qty)
    }
}

fn append_line_notes(buf: &mut Vec<u8>, line: &PosDiningAccountTicketLine) {
    if let Some(notes) = line.notes.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        for wrapped in wrap_lines(&format!("  * {notes}"), layout_width()) {
            append_line(buf, &wrapped);
        }
    }
}

fn append_dining_account_bottom_feed(buf: &mut Vec<u8>) {
    for _ in 0..DINING_ACCOUNT_BOTTOM_BLANK_LINES {
        append_line(buf, "");
    }
    buf.extend_from_slice(&[0x1B, b'd', DINING_ACCOUNT_BOTTOM_FEED_UNITS]);
}

pub fn build_pos_dining_account_ticket_escpos(t: &PosDiningAccountTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_AND_RUT);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "CUENTA");
    escpos_bold(&mut buf, false);

    append_label_value_wrapped(&mut buf, "Cuenta:", t.account.display_label.trim());
    if let Some(code) = t
        .account
        .table_code
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        append_line(&mut buf, &pad_left("Mesa:", code));
    }
    append_line(
        &mut buf,
        &pad_left("Tipo:", kind_label(&t.account.kind)),
    );

    if let Some(b) = t.branch_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Sucursal:", b.trim()));
    }
    if let Some(p) = t
        .point_of_sale_name
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_line(&mut buf, &pad_left("Punto venta:", p.trim()));
    }
    append_line(
        &mut buf,
        &pad_left("Emitido:", &format_datetime(&t.issued_at)),
    );

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "DETALLE");
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in t.lines.iter().enumerate() {
        let name = line.name.trim();
        let qty = format_qty(line.quantity);
        let qty_unit = format!("{qty}x {}", money(line.unit_price));
        append_product_line_block(&mut buf, name, &qty_unit, &money(line.line_total));
        append_line_notes(&mut buf, line);
        if idx + 1 < t.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("TOTAL:", &money(t.totals.total)));
    escpos_bold(&mut buf, false);

    let tip_suggested = t
        .totals
        .tip_suggested_amount
        .filter(|n| *n > 0.01);
    if let Some(tip) = tip_suggested {
        let pct = t.totals.tip_suggest_percent.filter(|p| *p > 0.0);
        let tip_label = match pct {
            Some(p) => format!("Propina sugerida ({:.0}%):", p),
            None => "Propina sugerida:".to_string(),
        };
        append_line(&mut buf, &pad_left(&tip_label, &money(tip)));
        let with_tip = t
            .totals
            .total_with_tip
            .filter(|n| *n > 0.01)
            .unwrap_or(t.totals.total + tip);
        append_line(
            &mut buf,
            &pad_left("Total c/ propina (info):", &money(with_tip)),
        );
    }

    append_divider(&mut buf);

    let note = t.footer_note.trim();
    if !note.is_empty() {
        escpos_align(&mut buf, 1);
        for line in wrap_lines(note, layout_width()) {
            append_line(&mut buf, &line);
        }
        escpos_align(&mut buf, 0);
    }
    append_dining_account_bottom_feed(&mut buf);

    Ok(buf)
}

pub fn write_pos_dining_account_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_dining_account_ticket_from_value(value)?;
    let bytes = build_pos_dining_account_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("dining_account_ticket_{id}.escpos"));
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
                "razonSocial": "Demo SpA",
                "nombreFantasia": "Demo Café",
                "rut": "76.123.456-7"
            },
            "account": {
                "displayLabel": "Mesa 12",
                "tableCode": "12",
                "kind": "TABLE",
                "status": "BILLING"
            },
            "branchName": "Centro",
            "pointOfSaleName": "Caja 1",
            "issuedAt": "2026-07-22T12:00:00.000Z",
            "lines": [{
                "name": "Café",
                "quantity": 2,
                "unitPrice": 1500,
                "lineTotal": 3000,
                "notes": "sin azúcar"
            }],
            "totals": {
                "total": 3000,
                "tipSuggestedAmount": 300,
                "tipSuggestPercent": 10,
                "totalWithTip": 3300
            },
            "footerNote": "Documento informativo — no válido como boleta"
        });
        let t = parse_pos_dining_account_ticket_from_value(&value).expect("parse");
        let bytes = build_pos_dining_account_ticket_escpos(&t).expect("build");
        assert!(!bytes.is_empty());
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("CUENTA"));
        assert!(text.contains("TOTAL"));
        assert!(text.contains("Propina sugerida"));
        assert!(text.contains("Total c/ propina"));
        // Feed extra al pie (`ESC d n`)
        assert!(
            bytes.windows(3).any(|w| w == [0x1B, b'd', DINING_ACCOUNT_BOTTOM_FEED_UNITS]),
            "expected ESC d feed at end of dining account ticket"
        );
    }
}
