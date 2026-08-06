//! Arqueo de caja 80 mm en ESC/POS (alineado a `cash-closing-receipt-print.ts`).

use crate::pos_cash_closing_ticket::{
    parse_pos_cash_closing_ticket_from_value, CountedBuckets, PosCashClosingTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_ticket_logo, escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_init, format_datetime, money,
    pad_left, wrap_lines, layout_width, CompanyHeaderStyle,
};
use crate::ticket_header_prefs;
use anyhow::Result;
use std::path::PathBuf;

const COUNTED_ROWS: [(&str, fn(&CountedBuckets) -> f64); 6] = [
    ("Efectivo", |c| c.cash),
    ("Tarjeta debito", |c| c.debit_card),
    ("Tarjeta credito", |c| c.credit_card),
    ("Transferencia", |c| c.transfer),
    ("Cheque", |c| c.check),
    ("Otros", |c| c.other),
];

pub fn build_pos_cash_closing_ticket_escpos(t: &PosCashClosingTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_ONLY, t.branch_name.as_deref());

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "ARQUEO DE CAJA");
    escpos_bold(&mut buf, false);
    append_line(&mut buf, "Cierre de sesion");

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
    if let Some(opened) = t.session_opened_at.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(
            &mut buf,
            &pad_left("Apertura:", &format_datetime(opened)),
        );
    }
    append_line(
        &mut buf,
        &pad_left("Cierre:", &format_datetime(&t.closed_at)),
    );

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "Conteo declarado");
    escpos_bold(&mut buf, false);

    let mut any_counted = false;
    for (label, getter) in COUNTED_ROWS {
        let amt = getter(&t.counted);
        if amt <= 0.01 {
            continue;
        }
        any_counted = true;
        append_line(&mut buf, &pad_left(label, &money(amt)));
    }
    if !any_counted {
        append_line(&mut buf, "Sin montos");
    }
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("TOTAL:", &money(t.counted_grand)));
    escpos_bold(&mut buf, false);

    if t.used_blind_count {
        append_divider(&mut buf);
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "Cuadre");
        escpos_bold(&mut buf, false);
        append_line(
            &mut buf,
            &pad_left("Total declarado:", &money(t.counted_grand)),
        );
        append_line(
            &mut buf,
            &pad_left(
                "Efectivo teorico:",
                &money(t.system_cash_expected.unwrap_or(0.0)),
            ),
        );
        append_line(
            &mut buf,
            &pad_left("Efectivo contado:", &money(t.counted.cash)),
        );
        if let Some(diff) = t.difference {
            append_line(&mut buf, &pad_left("Diferencia:", &money(diff)));
        }
        if let Some(sales) = t.sales_total {
            append_line(&mut buf, &pad_left("Ventas sesion:", &money(sales)));
        }
    }

    if let Some(notes) = t.notes.as_deref().filter(|s| !s.trim().is_empty()) {
        append_divider(&mut buf);
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "Notas");
        escpos_bold(&mut buf, false);
        for line in wrap_lines(notes.trim(), layout_width()) {
            append_line(&mut buf, &line);
        }
    }

    append_divider(&mut buf);
    let sid = t.cash_session_id.trim();
    if !sid.is_empty() {
        let short: String = if sid.chars().count() > 8 {
            sid.chars().take(8).collect()
        } else {
            sid.to_string()
        };
        append_line(&mut buf, &pad_left("Sesion:", &short));
    }
    let msg = t
        .message
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("Sesion cerrada");
    escpos_align(&mut buf, 1);
    for line in wrap_lines(msg, layout_width()) {
        append_line(&mut buf, &line);
    }
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_cash_closing_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_cash_closing_ticket_from_value(value)?;
    let bytes = build_pos_cash_closing_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cash_closing_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}
