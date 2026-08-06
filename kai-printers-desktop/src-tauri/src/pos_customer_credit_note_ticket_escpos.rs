//! Nota de crédito 80 mm en ESC/POS (alineado a `customer-credit-note-receipt-print.ts`).

use crate::pos_customer_credit_note_ticket::{
    parse_pos_customer_credit_note_ticket_from_value, CreditNoteLine, PosCustomerCreditNoteTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_product_line_block, append_section_gap, append_ticket_logo, append_folio_barcode_footer,
    escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_dense_body, escpos_init, footer_folio_datetime_line,
    money, pad_label_value, pad_left, wrap_lines, layout_width, CompanyHeaderStyle,
};
use crate::ticket_header_prefs;
use anyhow::Result;
use std::path::PathBuf;

fn line_display_name(line: &CreditNoteLine) -> String {
    let base = line.product_name.trim();
    let attrs = line
        .attributes
        .iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" · ");
    if attrs.is_empty() {
        base.to_string()
    } else if base.is_empty() {
        attrs
    } else {
        format!("{base} · {attrs}")
    }
}

fn append_totals(buf: &mut Vec<u8>, t: &crate::pos_customer_credit_note_ticket::CreditNoteTotals) {
    append_line(buf, &pad_left("Subtotal neto:", &money(t.subtotal_net)));
    append_line(buf, &pad_left("Impuestos:", &money(t.taxes)));
    append_line(buf, &pad_left("Descuentos:", &money(t.discounts)));
    escpos_bold(buf, true);
    append_line(buf, &pad_left("Monto NC:", &money(t.total)));
    escpos_bold(buf, false);
    append_divider(buf);
}

pub fn build_pos_customer_credit_note_ticket_escpos(
    nc: &PosCustomerCreditNoteTicket,
) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, nc.company.logo_base64.as_deref());
    append_company_store_header(
        &mut buf,
        &nc.company,
        CompanyHeaderStyle {
            secondary_razon: false,
            rut: true,
            activity: false,
            rut_with_colon: false,
        },
        nc.branch_name.as_deref(),
    );

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "NOTA DE CREDITO");
    escpos_bold(&mut buf, false);

    let folio = nc.credit_note_folio.trim();
    if ticket_header_prefs::should_emit_branch_line(nc.branch_name.as_deref()) {
        if let Some(b) = nc.branch_name.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            append_line(&mut buf, &pad_left("Sucursal:", b));
        }
    }
    if let Some(p) = nc.point_of_sale_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Punto venta:", p.trim()));
    }

    append_divider(&mut buf);
    append_line(&mut buf, "Referencias");
    append_line(
        &mut buf,
        &pad_label_value("Venta origen:", nc.original_sale_folio.trim()),
    );
    append_line(
        &mut buf,
        &pad_label_value("Devolucion:", nc.sale_return_folio.trim()),
    );

    let has_customer = nc
        .customer_name
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
        || nc
            .customer_document
            .as_deref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
    if has_customer {
        append_divider(&mut buf);
        append_line(&mut buf, "Cliente");
        if let Some(name) = nc.customer_name.as_deref().filter(|s| !s.trim().is_empty()) {
            append_label_value_wrapped(&mut buf, "Nombre:", name.trim());
        }
        if let Some(doc) = nc.customer_document.as_deref().filter(|s| !s.trim().is_empty()) {
            append_line(&mut buf, &pad_label_value("Documento:", doc.trim()));
        }
    }

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "DETALLE DEVOLUCION");
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in nc.lines.iter().enumerate() {
        let name = line_display_name(line);
        let qty = if (line.quantity.fract()).abs() < 0.001 {
            format!("{}", line.quantity.round() as i64)
        } else {
            format!("{:.2}", line.quantity)
        };
        let qty_unit = format!("{qty}x {}", money(line.unit_price_with_tax));
        append_product_line_block(&mut buf, &name, &qty_unit, &money(line.line_total));
        if idx + 1 < nc.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    append_divider(&mut buf);
    append_totals(&mut buf, &nc.totals);

    let immediate = nc
        .refund_mode
        .as_deref()
        .map(|m| m.eq_ignore_ascii_case("immediate"))
        .unwrap_or(false);
    if immediate && !nc.refund_payments.is_empty() {
        append_divider(&mut buf);
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "Reembolso en caja");
        escpos_bold(&mut buf, false);
        for p in &nc.refund_payments {
            append_line(&mut buf, &pad_left(p.label.trim(), &money(p.amount)));
        }
        for line in wrap_lines(
            "Dinero entregado al cliente desde esta sesion de caja.",
            layout_width(),
        ) {
            append_line(&mut buf, &line);
        }
    }

    let footer_line = footer_folio_datetime_line(folio, &nc.issued_at_iso);
    append_folio_barcode_footer(
        &mut buf,
        folio,
        &footer_line,
        None,
        nc.operator_name.as_deref(),
    );
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_customer_credit_note_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let nc = parse_pos_customer_credit_note_ticket_from_value(value)?;
    let bytes = build_pos_customer_credit_note_ticket_escpos(&nc)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("credit_note_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escpos_starts_with_init() {
        let v = serde_json::json!({
            "creditNoteFolio": "NC-1",
            "saleReturnFolio": "DEV-1",
            "originalSaleFolio": "VTA-1",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "discounts": 0, "total": 1000 }
        });
        let nc = parse_pos_customer_credit_note_ticket_from_value(&v).unwrap();
        let bytes = build_pos_customer_credit_note_ticket_escpos(&nc).unwrap();
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
    }
}
