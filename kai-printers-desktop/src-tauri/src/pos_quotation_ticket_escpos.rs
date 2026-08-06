//! Ticket de cotización 80 mm en ESC/POS (alineado a `quotation-receipt-print.ts`).

use crate::pos_quotation_ticket::{parse_pos_quotation_ticket_from_value, PosQuotationTicket, QuotationLine};
use crate::pos_sale_ticket_escpos::{
    append_company_store_header, append_divider, append_label_value_wrapped, append_line,
    append_product_line_block, append_section_gap, append_ticket_logo, append_folio_barcode_footer,
    escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_dense_body, escpos_init, footer_folio_datetime_line,
    format_clp, format_datetime, money, pad_label_value, pad_left, wrap_lines, layout_width,
    CompanyHeaderStyle,
};
use crate::ticket_header_prefs;
use anyhow::Result;
use std::path::PathBuf;

fn line_unit_price_with_tax(line: &QuotationLine) -> f64 {
    if line.quantity.abs() > 0.001 {
        line.total / line.quantity
    } else {
        line.unit_price
    }
}

fn line_display_name(line: &QuotationLine) -> String {
    let base = line.product_name.trim();
    let variant = line.variant_name.as_deref().unwrap_or("").trim();
    let mut name = if variant.is_empty() {
        base.to_string()
    } else if base.is_empty() {
        variant.to_string()
    } else {
        format!("{base} · {variant}")
    };
    if let Some(sku) = line.product_sku.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        if !name.is_empty() {
            name.push_str(&format!(" ({sku})"));
        } else {
            name = sku.to_string();
        }
    }
    name
}

fn append_quotation_totals(buf: &mut Vec<u8>, q: &PosQuotationTicket) {
    append_line(buf, &pad_left("Subtotal:", &money(q.subtotal)));
    append_line(buf, &pad_left("Impuestos:", &money(q.tax_amount)));
    if q.discount_amount > 0.01 {
        append_line(
            buf,
            &pad_left("Descuentos:", &format!("-${}", format_clp(q.discount_amount))),
        );
    }
    escpos_bold(buf, true);
    append_line(buf, &pad_left("TOTAL:", &money(q.total)));
    escpos_bold(buf, false);
    append_divider(buf);
}

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

pub fn build_pos_quotation_ticket_escpos(q: &PosQuotationTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, q.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &q.company, CompanyHeaderStyle::FULL, q.branch_name.as_deref());

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "COTIZACION");
    escpos_bold(&mut buf, false);

    let folio = q.document_number.trim();
    append_line(
        &mut buf,
        &format!("Valida hasta: {}", format_datetime(&q.valid_until)),
    );

    if ticket_header_prefs::should_emit_branch_line(q.branch_name.as_deref()) {
        if let Some(b) = q.branch_name.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            append_line(&mut buf, &pad_left("Sucursal:", b));
        }
    }
    if let Some(p) = q.point_of_sale_name.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(&mut buf, &pad_left("Punto venta:", p.trim()));
    }

    let has_customer = q.customer_name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
        || q
            .customer_document
            .as_deref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
    if has_customer {
        append_divider(&mut buf);
        append_line(&mut buf, "Cliente");
        if let Some(name) = q.customer_name.as_deref().filter(|s| !s.trim().is_empty()) {
            append_label_value_wrapped(&mut buf, "Nombre:", name.trim());
        }
        if let Some(doc) = q.customer_document.as_deref().filter(|s| !s.trim().is_empty()) {
            append_line(&mut buf, &pad_label_value("Documento:", doc.trim()));
        }
    }

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "DETALLE DE COTIZACION");
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);
    append_section_gap(&mut buf);

    for (idx, line) in q.lines.iter().enumerate() {
        let name = line_display_name(line);
        let qty = if (line.quantity.fract()).abs() < 0.001 {
            format!("{}", line.quantity.round() as i64)
        } else {
            format!("{:.2}", line.quantity)
        };
        let qty_unit = format!("{qty}x {}", money(line_unit_price_with_tax(line)));
        append_product_line_block(&mut buf, &name, &qty_unit, &money(line.total));
        if idx + 1 < q.lines.len() {
            append_section_gap(&mut buf);
        }
    }

    append_divider(&mut buf);
    append_quotation_totals(&mut buf, q);

    if let Some(notes) = q.notes.as_deref() {
        append_wrapped_section(&mut buf, "Notas", notes);
    }

    let footer_line = footer_folio_datetime_line(folio, &q.issued_at);
    append_folio_barcode_footer(
        &mut buf,
        folio,
        &footer_line,
        None,
        q.operator_name.as_deref(),
    );
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_quotation_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let q = parse_pos_quotation_ticket_from_value(value)?;
    let bytes = build_pos_quotation_ticket_escpos(&q)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("quotation_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotation_escpos_has_cotizacion_heading() {
        let v = serde_json::json!({
            "documentNumber": "COT-001",
            "issuedAt": "2026-01-01T12:00:00Z",
            "validUntil": "2026-02-01T12:00:00Z",
            "company": { "razonSocial": "Tienda" },
            "lines": [{
                "productName": "Item",
                "quantity": 1,
                "unitPrice": 1000,
                "total": 1190
            }],
            "subtotal": 1000,
            "taxAmount": 190,
            "total": 1190
        });
        let q = parse_pos_quotation_ticket_from_value(&v).unwrap();
        let bytes = build_pos_quotation_ticket_escpos(&q).unwrap();
        assert!(bytes.windows(10).any(|w| w == b"COTIZACION"));
    }
}
