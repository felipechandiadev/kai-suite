//! Pago a proveedor (salida de efectivo) 80 mm en ESC/POS.

use crate::pos_sale_ticket_escpos::{
    append_divider, append_label_value_wrapped, append_line, append_ticket_logo, escpos_align,
    escpos_apply_ticket_typography, escpos_bold, escpos_double_height_off, escpos_double_height_on,
    escpos_init, format_datetime, money, pad_left, wrap_lines, layout_width,
};
use crate::pos_supplier_payment_ticket::{
    parse_pos_supplier_payment_ticket_from_value, PosSupplierPaymentTicket,
};
use anyhow::Result;
use std::path::PathBuf;

pub fn build_pos_supplier_payment_ticket_escpos(t: &PosSupplierPaymentTicket) -> Result<Vec<u8>> {
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

    append_divider(&mut buf);
    append_line(&mut buf, "PAGO A PROVEEDOR");
    escpos_bold(&mut buf, false);
    let method = t
        .payment_method_label
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("Efectivo");
    append_line(&mut buf, &format!("Salida de efectivo · {method}"));

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
    let supplier = t.supplier_name.trim();
    if !supplier.is_empty() {
        append_label_value_wrapped(&mut buf, "Proveedor:", supplier);
    }
    if let Some(sd) = t.supplier_document.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("RUT / Doc.:", sd.trim()));
    }
    if let Some(rec) = t
        .reception_document_number
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_line(&mut buf, &pad_left("Recepcion:", rec.trim()));
    }
    if let Some(sref) = t
        .supplier_document_ref
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        append_label_value_wrapped(&mut buf, "Doc. proveedor:", sref.trim());
    }
    if let Some(reason) = t.reason.as_deref().filter(|s| !s.trim().is_empty()) {
        append_label_value_wrapped(&mut buf, "Detalle:", reason.trim());
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("Salida:", &money(t.amount)));
    escpos_bold(&mut buf, false);

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    append_line(&mut buf, "Movimiento de caja registrado");
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_supplier_payment_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_supplier_payment_ticket_from_value(value)?;
    let bytes = build_pos_supplier_payment_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("supplier_payment_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_supplier_payment_ticket() {
        let json = serde_json::json!({
            "version": 1,
            "documentNumber": "PAG-26-00002",
            "issuedAt": "2026-07-14T23:31:00.000Z",
            "amount": 3570,
            "supplierName": "Proveedor Demo",
            "cashSessionId": "11111111-1111-4111-8111-111111111111",
            "paymentMethodLabel": "Efectivo",
            "reason": "Pago documento recepcion",
            "company": { "razonSocial": "Demo SpA" },
            "branchName": "Sucursal",
            "pointOfSaleName": "Caja 1",
            "operatorName": "Administrador"
        });
        let t = parse_pos_supplier_payment_ticket_from_value(&json).unwrap();
        let bytes = build_pos_supplier_payment_ticket_escpos(&t).unwrap();
        assert!(bytes.len() > 40);
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("PAGO") || bytes.windows(4).any(|w| w == b"PAGO"));
    }
}
