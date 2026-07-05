//! Cuenta bancaria empresa 80 mm en ESC/POS.

use crate::pos_bank_account_ticket::{
    parse_pos_bank_account_ticket_from_value, PosBankAccountTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_divider, append_label_value_wrapped, append_line, append_ticket_logo, escpos_align,
    escpos_apply_ticket_typography, escpos_bold, escpos_double_height_off, escpos_double_height_on,
    escpos_init, format_datetime, pad_left, wrap_lines, layout_width,
};
use anyhow::Result;
use std::path::PathBuf;

pub fn build_pos_bank_account_ticket_escpos(t: &PosBankAccountTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());

    let store = t
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(t.company.razon_social.as_str());

    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    for line in wrap_lines(store, layout_width() / 2) {
        append_line(&mut buf, &line);
    }
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "DATOS TRANSFERENCIA");
    escpos_bold(&mut buf, false);

    if let Some(label) = t
        .payment_method_label
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_line(&mut buf, label.trim());
    }

    append_divider(&mut buf);
    append_label_value_wrapped(&mut buf, "Banco:", t.bank_name.trim());
    append_label_value_wrapped(&mut buf, "Tipo cuenta:", t.account_type.trim());

    escpos_bold(&mut buf, true);
    append_label_value_wrapped(&mut buf, "N° cuenta:", t.account_number.trim());
    escpos_bold(&mut buf, false);

    if let Some(holder) = t
        .account_holder_name
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_label_value_wrapped(&mut buf, "Titular:", holder.trim());
    }

    if let Some(rut) = t.company.rut.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("RUT empresa:", rut.trim()));
    }

    if t.is_primary {
        append_line(&mut buf, "Cuenta principal");
    }

    if let Some(notes) = t.notes.as_deref().filter(|s| !s.trim().is_empty()) {
        append_divider(&mut buf);
        append_label_value_wrapped(&mut buf, "Notas:", notes.trim());
    }

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Realice la transferencia");
    append_line(&mut buf, "a esta cuenta");
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_bank_account_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_bank_account_ticket_from_value(value)?;
    let bytes = build_pos_bank_account_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("bank_account_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}
