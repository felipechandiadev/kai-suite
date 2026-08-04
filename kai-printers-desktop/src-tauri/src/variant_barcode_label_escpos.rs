//! Etiqueta térmica: minimal (nombre/SKU/barcode) o detailed (+ attrs + precio).

use crate::pos_sale_ticket_escpos::{
    append_barcode_centered, append_divider, append_line, append_operator_footer, escpos_align,
    escpos_apply_ticket_typography, escpos_bold, escpos_double_height_off, escpos_double_height_on,
    escpos_init, pad_left, wrap_lines, layout_width,
};
use crate::variant_barcode_label::{parse_variant_barcode_label_from_value, VariantBarcodeLabel};
use anyhow::Result;
use std::path::PathBuf;

const BOTTOM_FEED_LINES: usize = 4;

fn append_bottom_feed(buf: &mut Vec<u8>) {
    for _ in 0..BOTTOM_FEED_LINES {
        append_line(buf, "");
    }
}

fn attr_line(label: Option<&str>, value: &str) -> String {
    let value = value.trim();
    match label.map(str::trim).filter(|s| !s.is_empty()) {
        Some(l) => format!("{l}: {value}"),
        None => value.to_string(),
    }
}

pub fn build_variant_barcode_label_escpos(label: &VariantBarcodeLabel) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    let product_name = label.product_name.trim();
    if !product_name.is_empty() {
        escpos_align(&mut buf, 1);
        escpos_bold(&mut buf, true);
        escpos_double_height_on(&mut buf);
        for line in wrap_lines(product_name, layout_width() / 2) {
            append_line(&mut buf, &line);
        }
        escpos_double_height_off(&mut buf);
        escpos_bold(&mut buf, false);
        escpos_align(&mut buf, 0);
    }

    if label.is_detailed() {
        if let Some(attrs) = label.attributes.as_ref() {
            for a in attrs {
                let value = a.value.trim();
                if value.is_empty() {
                    continue;
                }
                let text = attr_line(a.label.as_deref(), value);
                for line in wrap_lines(&text, layout_width()) {
                    append_line(&mut buf, &line);
                }
            }
        }
        if let Some(price) = label.price_label.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            escpos_bold(&mut buf, true);
            for line in wrap_lines(price, layout_width()) {
                append_line(&mut buf, &line);
            }
            escpos_bold(&mut buf, false);
        }
    }

    let sku = label.sku.trim();
    if !sku.is_empty() {
        append_line(&mut buf, &pad_left("SKU:", sku));
    }

    let barcode = label.barcode.trim();
    if barcode.is_empty() {
        anyhow::bail!("barcode_required");
    }

    append_divider(&mut buf);
    append_barcode_centered(&mut buf, barcode);
    escpos_align(&mut buf, 1);
    for line in wrap_lines(barcode, layout_width()) {
        append_line(&mut buf, &line);
    }
    escpos_align(&mut buf, 0);
    append_divider(&mut buf);

    append_operator_footer(&mut buf, label.operator_name.as_deref());
    append_bottom_feed(&mut buf);
    Ok(buf)
}

pub fn write_variant_barcode_label_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let label = parse_variant_barcode_label_from_value(value)?;
    let bytes = build_variant_barcode_label_escpos(&label)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("variant_barcode_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn variant_barcode_escpos_contains_sku_and_barcode() {
        let v = serde_json::json!({
            "version": 1,
            "productName": "Aceite 500ml",
            "sku": "ACE-500",
            "barcode": "7801234567890"
        });
        let label = parse_variant_barcode_label_from_value(&v).unwrap();
        let bytes = build_variant_barcode_label_escpos(&label).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
        assert!(text.contains("Aceite"));
        assert!(text.contains("ACE-500"));
        assert!(text.contains("7801234567890"));
        assert!(bytes.len() > 80, "debe incluir bloque de barcode ESC/POS");
    }

    #[test]
    fn variant_barcode_escpos_detailed_includes_attrs_and_price() {
        let v = serde_json::json!({
            "version": 1,
            "productName": "Polera",
            "sku": "POL-M-AZ",
            "barcode": "7809999888777",
            "layout": "detailed",
            "attributes": [
                { "label": "Talla", "value": "M" },
                { "value": "Azul" }
            ],
            "priceLabel": "$12.990"
        });
        let label = parse_variant_barcode_label_from_value(&v).unwrap();
        assert!(label.is_detailed());
        let bytes = build_variant_barcode_label_escpos(&label).unwrap();
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("Polera"));
        assert!(text.contains("Talla: M"));
        assert!(text.contains("Azul"));
        assert!(text.contains("$12.990"));
        assert!(text.contains("POL-M-AZ"));
        assert!(text.contains("7809999888777"));
    }
}
