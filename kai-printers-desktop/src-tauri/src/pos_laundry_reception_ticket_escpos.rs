//! Guía recepción lavandería ESC/POS (58/80 mm vía layout_width). Sin desglose IVA.

use crate::pos_laundry_reception_ticket::{
    parse_pos_laundry_reception_ticket_from_value, PosLaundryReceptionTicket,
};
use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_company_store_header, append_divider, append_line,
    append_operator_footer, append_product_line_block, append_section_gap, append_ticket_logo,
    escpos_align, escpos_apply_ticket_typography, escpos_bold, escpos_double_height_off,
    escpos_double_height_on, escpos_init, format_datetime, money, pad_left, wrap_lines,
    layout_width, CompanyHeaderStyle,
};
use anyhow::Result;
use std::path::PathBuf;

fn format_qty(qty: f64) -> String {
    if (qty.fract()).abs() < 0.001 {
        format!("{}", qty.round() as i64)
    } else {
        format!("{:.2}", qty)
    }
}

pub fn build_pos_laundry_reception_ticket_escpos(
    t: &PosLaundryReceptionTicket,
) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    append_ticket_logo(&mut buf, t.company.logo_base64.as_deref());
    append_company_store_header(&mut buf, &t.company, CompanyHeaderStyle::TITLE_AND_RUT);

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    append_line(&mut buf, "GUIA DE RECEPCION");
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);
    append_line(&mut buf, "Documento informativo — no valido como boleta");

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
        &pad_left("Cliente:", t.customer_name.trim()),
    );
    if let Some(phone) = t
        .customer_phone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        append_line(&mut buf, &pad_left("Tel:", phone));
    }
    append_line(
        &mut buf,
        &pad_left("Recibido:", &format_datetime(&t.issued_at)),
    );
    if let Some(promised) = t.promised_at.as_deref().filter(|s| !s.trim().is_empty()) {
        append_line(
            &mut buf,
            &pad_left("Promesa:", &format_datetime(promised)),
        );
    }
    if !t.payment_mode_label.trim().is_empty() {
        append_line(
            &mut buf,
            &pad_left("Cobro:", t.payment_mode_label.trim()),
        );
    }

    append_divider(&mut buf);
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, "PRENDAS");
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);

    for (g_idx, g) in t.garments.iter().enumerate() {
        let qty = format_qty(g.quantity);
        let header = format!("{}  x{}", g.label.trim(), qty);
        escpos_bold(&mut buf, true);
        for line in wrap_lines(&header, layout_width()) {
            append_line(&mut buf, &line);
        }
        escpos_bold(&mut buf, false);
        if let Some(care) = g
            .care_instructions
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            for line in wrap_lines(&format!("  Instr: {care}"), layout_width()) {
                append_line(&mut buf, &line);
            }
        }
        for svc in &g.services {
            let qty_unit = format!(
                "{}x {}",
                format_qty(svc.quantity),
                money(svc.unit_price)
            );
            append_product_line_block(
                &mut buf,
                &format!("  {}", svc.name.trim()),
                &qty_unit,
                &money(svc.line_total),
            );
        }
        if g_idx + 1 < t.garments.len() {
            append_section_gap(&mut buf);
        }
    }

    append_divider(&mut buf);
    escpos_bold(&mut buf, true);
    append_line(
        &mut buf,
        &pad_left("TOTAL SERVICIOS:", &money(t.totals.services_total)),
    );
    escpos_bold(&mut buf, false);
    if let Some(dep) = t.totals.deposit_paid.filter(|v| *v > 0.0) {
        append_line(&mut buf, &pad_left("Abono:", &money(dep)));
    }
    if let Some(bal) = t.totals.balance_due.filter(|v| *v > 0.0) {
        escpos_bold(&mut buf, true);
        append_line(&mut buf, &pad_left("SALDO:", &money(bal)));
        escpos_bold(&mut buf, false);
    }
    append_divider(&mut buf);

    let code = t.code.trim();
    if !code.is_empty() {
        append_barcode_centered(&mut buf, code);
        escpos_align(&mut buf, 1);
        append_line(
            &mut buf,
            &format!("{} · {}", code, format_datetime(&t.issued_at)),
        );
        escpos_align(&mut buf, 0);
    }

    let note = t.footer_note.trim();
    if !note.is_empty() {
        escpos_align(&mut buf, 1);
        for line in wrap_lines(note, layout_width()) {
            append_line(&mut buf, &line);
        }
        escpos_align(&mut buf, 0);
    }

    append_operator_footer(&mut buf, t.operator_name.as_deref());
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_laundry_reception_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let t = parse_pos_laundry_reception_ticket_from_value(value)?;
    let bytes = build_pos_laundry_reception_ticket_escpos(&t)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("laundry_reception_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn builds_non_empty_escpos_without_tax_words() {
        let value = json!({
            "version": 1,
            "code": "LV000001",
            "issuedAt": "2026-07-23T16:00:00.000Z",
            "company": {
                "razonSocial": "Demo SpA",
                "nombreFantasia": "Lavanderia Demo"
            },
            "customerName": "Maria Perez",
            "paymentModeLabel": "Abono + saldo",
            "garments": [{
                "label": "Camisa · Blanco",
                "quantity": 5,
                "careInstructions": "Agua fria",
                "services": [{
                    "name": "Lavado simple",
                    "quantity": 5,
                    "unitPrice": 2000,
                    "lineTotal": 10000
                }]
            }],
            "totals": { "servicesTotal": 10000, "depositPaid": 4000, "balanceDue": 6000 },
            "footerNote": "Comprobante de recepcion — presente este codigo al retirar",
            "operatorName": "Juan"
        });
        let t = parse_pos_laundry_reception_ticket_from_value(&value).expect("parse");
        let bytes = build_pos_laundry_reception_ticket_escpos(&t).expect("build");
        assert!(!bytes.is_empty());
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("GUIA DE RECEPCION"));
        assert!(text.contains("TOTAL SERVICIOS"));
        assert!(!text.to_uppercase().contains("IVA"));
    }
}
