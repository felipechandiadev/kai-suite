//! Comprobante de cobro 80 mm en ESC/POS.

use crate::pos_payment_in_ticket::{
    parse_pos_payment_in_ticket_from_value, PaymentInAllocation, PaymentInLine, PosPaymentInTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_ticket_logo, append_folio_barcode_footer, escpos_apply_ticket_typography,
    escpos_bold, escpos_init,
    footer_folio_datetime_line, money, pad_left, wrap_lines, layout_width, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

fn append_wrapped_section(buf: &mut Vec<u8>, title: &str, body: &str) {
    let body = body.trim();
    if body.is_empty() {
        return;
    }
    append_divider(buf);
    escpos_bold(buf, true);
    append_line(buf, title);
    escpos_bold(buf, false);
    for line in wrap_lines(body, layout_width()) {
        append_line(buf, &line);
    }
}

fn append_payment_rows(buf: &mut Vec<u8>, payments: &[PaymentInLine]) {
    append_divider(buf);
    escpos_bold(buf, true);
    append_line(buf, "Medios de pago");
    escpos_bold(buf, false);
    let mut any = false;
    for p in payments {
        if p.amount <= 0.01 {
            continue;
        }
        any = true;
        append_line(buf, &pad_left(p.label.trim(), &money(p.amount)));
        if let Some(r) = p.reference.as_deref().filter(|s| !s.trim().is_empty()) {
            for line in wrap_lines(r.trim(), layout_width()) {
                append_line(buf, &format!("  {line}"));
            }
        }
    }
    if !any {
        append_line(buf, "Sin montos");
    }
}

fn append_allocation_rows(buf: &mut Vec<u8>, allocations: &[PaymentInAllocation]) {
    if allocations.is_empty() {
        return;
    }
    append_divider(buf);
    escpos_bold(buf, true);
    append_line(buf, "Aplicado a ventas");
    escpos_bold(buf, false);
    for a in allocations {
        if a.amount <= 0.01 {
            continue;
        }
        let doc = a.document_number.trim();
        append_line(buf, &pad_left(doc, &money(a.amount)));
    }
}

pub fn build_pos_payment_in_ticket_escpos(t: &PosPaymentInTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_AND_RUT, t.branch_name.as_deref());

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "COMPROBANTE DE PAGO");
    escpos_bold(&mut buf, false);

    let folio = t.document_number.trim();

    let branch_for_origin = t
        .branch_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let origin = [branch_for_origin, t.point_of_sale_name.as_deref()]
        .into_iter()
        .filter_map(|s| s.map(str::trim).filter(|s| !s.is_empty()))
        .collect::<Vec<_>>()
        .join(" · ");
    if !origin.is_empty() {
        append_label_value_wrapped(&mut buf, "Origen:", &origin);
    }

    let has_customer = t.customer_name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
        || t
            .customer_document
            .as_deref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
    if has_customer {
        append_divider(&mut buf);
        append_line(&mut buf, "Cliente");
        if let Some(name) = t.customer_name.as_deref().filter(|s| !s.trim().is_empty()) {
            append_label_value_wrapped(&mut buf, "Nombre:", name.trim());
        }
        if let Some(doc) = t.customer_document.as_deref().filter(|s| !s.trim().is_empty()) {
            append_line(&mut buf, &pad_left("Documento:", doc.trim()));
        }
    }

    append_payment_rows(&mut buf, &t.payments);
    append_allocation_rows(&mut buf, &t.allocations);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, &pad_left("Total cobrado:", &money(t.total_collected)));
    escpos_bold(&mut buf, false);
    append_line(&mut buf, &pad_left("Registrado:", &money(t.amount_paid)));

    if let Some(ext) = t.external_reference.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Referencia:", ext.trim()));
    }
    if let Some(notes) = t.notes.as_deref() {
        append_wrapped_section(&mut buf, "Notas", notes);
    }

    let footer_line = footer_folio_datetime_line(folio, &t.issued_at);
    append_folio_barcode_footer(
        &mut buf,
        folio,
        &footer_line,
        None,
        t.operator_name.as_deref(),
    );
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_payment_in_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_payment_in_ticket_from_value(value)?;
    let bytes = build_pos_payment_in_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("payment_in_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payment_in_escpos_has_heading() {
        let v = serde_json::json!({
            "documentNumber": "COB-001",
            "issuedAt": "2026-01-01T12:00:00Z",
            "company": { "razonSocial": "Tienda" },
            "totalCollected": 5000,
            "amountPaid": 5000,
            "payments": [{ "label": "Efectivo", "amount": 5000 }],
            "allocations": [{ "documentNumber": "VTA-1", "amount": 5000 }]
        });
        let t = parse_pos_payment_in_ticket_from_value(&v).unwrap();
        let bytes = build_pos_payment_in_ticket_escpos(&t).unwrap();
        assert!(bytes.windows(11).any(|w| w == b"COMPROBANTE"));
        assert!(bytes.windows(4).any(|w| w == b"PAGO"));
    }
}
