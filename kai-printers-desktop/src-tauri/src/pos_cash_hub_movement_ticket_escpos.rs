//! Ingreso / egreso centro de efectivo 80 mm en ESC/POS.

use crate::pos_cash_hub_movement_ticket::{
    parse_pos_cash_hub_movement_ticket_from_value, PosCashHubMovementTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_ticket_logo, escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_init, format_datetime, money,
    pad_left, CompanyHeaderStyle,
};
use crate::ticket_header_prefs;
use anyhow::Result;
use std::path::PathBuf;

fn movement_title(direction: &str) -> (&'static str, &'static str) {
    if direction.eq_ignore_ascii_case("OUT") {
        ("EGRESO A CENTRO", "Traslado de efectivo a centro de acopio")
    } else {
        ("INGRESO DESDE CENTRO", "Ingreso de efectivo desde centro de acopio")
    }
}

pub fn build_pos_cash_hub_movement_ticket_escpos(t: &PosCashHubMovementTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_ONLY, t.branch_name.as_deref());

    let (title, subtitle) = movement_title(t.direction.as_str());
    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, title);
    escpos_bold(&mut buf, false);
    append_line(&mut buf, subtitle);

    let branch_for_origin = if ticket_header_prefs::should_emit_branch_line(t.branch_name.as_deref()) {
        t.branch_name.as_deref()
    } else {
        None
    };
    let origin = [branch_for_origin, t.point_of_sale_name.as_deref()]
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
    let doc = t.document_number.trim();
    if !doc.is_empty() {
        append_line(&mut buf, &pad_left("Comprobante:", doc));
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
    let issued = t.issued_at.trim();
    if !issued.is_empty() {
        append_line(&mut buf, &pad_left("Fecha:", &format_datetime(issued)));
    }
    let hub = t.cash_hub_name.trim();
    if !hub.is_empty() {
        append_line(&mut buf, &pad_left("Centro efectivo:", hub));
    }
    if let Some(reason) = t.reason.as_deref().filter(|s| !s.trim().is_empty()) {
        append_label_value_wrapped(&mut buf, "Motivo:", reason.trim());
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("Monto:", &money(t.amount)));
    escpos_bold(&mut buf, false);

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Movimiento registrado");
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_cash_hub_movement_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_cash_hub_movement_ticket_from_value(value)?;
    let bytes = build_pos_cash_hub_movement_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cash_hub_movement_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_ingreso_ticket() {
        let json = serde_json::json!({
            "version": 1,
            "direction": "IN",
            "documentNumber": "CEV-00042",
            "issuedAt": "2026-07-09T12:00:00.000Z",
            "amount": 50000,
            "cashHubName": "Caja fuerte",
            "cashSessionId": "11111111-1111-4111-8111-111111111111",
            "reason": "Reposicion",
            "company": { "razonSocial": "Demo SpA" },
            "branchName": "Sucursal",
            "pointOfSaleName": "Caja 1",
            "operatorName": "Juan"
        });
        let t = parse_pos_cash_hub_movement_ticket_from_value(&json).unwrap();
        let bytes = build_pos_cash_hub_movement_ticket_escpos(&t).unwrap();
        assert!(bytes.len() > 40);
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("INGRESO") || bytes.windows(7).any(|w| w == b"INGRESO"));
    }
}
