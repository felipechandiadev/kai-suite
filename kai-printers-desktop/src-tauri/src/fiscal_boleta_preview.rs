//! Boleta electrónica simulada (Set BE) → JSON (`fiscal-boleta-preview`).

use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreviewEmisor {
    pub rut: Option<String>,
    pub legal_name: Option<String>,
    pub business_activity: Option<String>,
    pub address: Option<String>,
    pub commune: Option<String>,
    pub city: Option<String>,
    pub resolution_number: Option<String>,
    pub resolution_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreviewCompany {
    #[serde(default)]
    pub razon_social: String,
    pub nombre_fantasia: Option<String>,
    pub rut: Option<String>,
    pub business_activity: Option<String>,
    #[serde(default)]
    pub logo_base64: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreviewReceptor {
    pub rut: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreviewLine {
    pub name: String,
    pub quantity: f64,
    pub unit_price_with_iva: f64,
    #[serde(default)]
    pub exempt: bool,
    pub unit_measure: Option<String>,
    pub line_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreviewTotals {
    pub mnt_neto: f64,
    pub mnt_exe: f64,
    pub iva: f64,
    pub mnt_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalBoletaPreview {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub caso: String,
    pub folio: i64,
    pub issued_at: String,
    pub tipo_dte: i32,
    #[serde(default)]
    pub is_simulated: bool,
    pub emisor: FiscalBoletaPreviewEmisor,
    #[serde(default)]
    pub company: Option<FiscalBoletaPreviewCompany>,
    pub receptor: FiscalBoletaPreviewReceptor,
    /// Si false, no imprimir bloque Receptor (venta sin cliente). Ausente → inferir por RUT genérico.
    #[serde(default)]
    pub show_receptor_on_ticket: Option<bool>,
    #[serde(default)]
    pub lines: Vec<FiscalBoletaPreviewLine>,
    pub totals: FiscalBoletaPreviewTotals,
    pub observation: Option<String>,
    pub timbre_pdf417_payload: Option<String>,
    #[serde(default)]
    pub operator_name: Option<String>,
}

pub fn parse_fiscal_boleta_preview_from_value(value: &serde_json::Value) -> Result<FiscalBoletaPreview> {
    serde_json::from_value(value.clone()).context("parse fiscal-boleta-preview")
}

pub fn write_fiscal_boleta_preview_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::fiscal_boleta_preview_escpos::write_fiscal_boleta_preview_escpos_from_value(dir, value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_fiscal_boleta_preview_json() {
        let v = serde_json::json!({
            "version": 1,
            "caso": "CASO-1",
            "folio": 42,
            "issuedAt": "2026-06-28",
            "tipoDte": 39,
            "isSimulated": true,
            "emisor": { "rut": "1-9", "legalName": "Test" },
            "receptor": { "rut": "66666666-6", "name": "Cliente" },
            "lines": [{ "name": "Item", "quantity": 1, "unitPriceWithIva": 1000, "lineTotal": 1000 }],
            "totals": { "mntNeto": 840, "mntExe": 0, "iva": 160, "mntTotal": 1000 },
            "timbrePdf417Payload": "<TED version=\"1.0\"><DD><RE>1-9</RE><TD>39</TD><F>42</F></DD></TED>"
        });
        let t = parse_fiscal_boleta_preview_from_value(&v).unwrap();
        assert_eq!(t.caso, "CASO-1");
        assert_eq!(t.folio, 42);
    }
}
