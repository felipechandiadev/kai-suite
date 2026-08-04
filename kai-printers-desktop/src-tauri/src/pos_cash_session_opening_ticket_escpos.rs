//! Apertura de caja 80 mm en ESC/POS.

use crate::pos_cash_session_opening_ticket::{
    parse_pos_cash_session_opening_ticket_from_value, PosCashSessionOpeningTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_ticket_logo, escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_init, format_datetime, money,
    pad_left, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

pub fn build_pos_cash_session_opening_ticket_escpos(
    t: &PosCashSessionOpeningTicket,
) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_ONLY);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "APERTURA DE CAJA");
    escpos_bold(&mut buf, false);
    append_line(&mut buf, "Inicio de sesion");

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
    let opened = t.opened_at.trim();
    if !opened.is_empty() {
        append_line(
            &mut buf,
            &pad_left("Apertura:", &format_datetime(opened)),
        );
    }
    if let Some(hub) = t.cash_hub_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Centro efectivo:", hub.trim()));
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(
        &mut buf,
        &pad_left("Monto apertura:", &money(t.opening_amount)),
    );
    escpos_bold(&mut buf, false);

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Sesion de caja abierta");
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_cash_session_opening_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_cash_session_opening_ticket_from_value(value)?;
    let bytes = build_pos_cash_session_opening_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cash_session_opening_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}
