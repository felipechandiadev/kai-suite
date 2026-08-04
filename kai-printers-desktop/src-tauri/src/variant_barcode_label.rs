//! Comprobante térmico con código de barras de variante → JSON (`variant-barcode-label`).

use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantBarcodeLabelAttribute {
    #[serde(default)]
    pub label: Option<String>,
    pub value: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantBarcodeLabel {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub product_name: String,
    pub sku: String,
    pub barcode: String,
    /// `minimal` (default) | `detailed`
    #[serde(default)]
    pub layout: Option<String>,
    #[serde(default)]
    pub attributes: Option<Vec<VariantBarcodeLabelAttribute>>,
    #[serde(default)]
    pub price_label: Option<String>,
    #[serde(default)]
    pub operator_name: Option<String>,
}

impl VariantBarcodeLabel {
    pub fn is_detailed(&self) -> bool {
        self.layout
            .as_deref()
            .map(|s| s.eq_ignore_ascii_case("detailed"))
            .unwrap_or(false)
    }
}

pub fn parse_variant_barcode_label_from_value(value: &serde_json::Value) -> Result<VariantBarcodeLabel> {
    serde_json::from_value(value.clone()).context("parse variant-barcode-label")
}

pub fn write_variant_barcode_label_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::variant_barcode_label_escpos::write_variant_barcode_label_escpos_from_value(dir, value)
}
