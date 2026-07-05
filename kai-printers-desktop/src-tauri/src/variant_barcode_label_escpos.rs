//! Etiqueta térmica mínima: nombre producto, SKU y código de barras (variant-barcode-label).

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
}
