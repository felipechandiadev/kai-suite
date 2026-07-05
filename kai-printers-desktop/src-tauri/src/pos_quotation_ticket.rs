//! Cotización POS → JSON (`pos-quotation-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotationLine {
    pub product_name: String,
    pub variant_name: Option<String>,
    pub product_sku: Option<String>,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosQuotationTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub document_number: String,
    pub issued_at: String,
    pub valid_until: String,
    pub company: TicketCompany,
    pub customer_name: Option<String>,
    pub customer_document: Option<String>,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    #[serde(default)]
    pub lines: Vec<QuotationLine>,
    pub subtotal: f64,
    pub tax_amount: f64,
    #[serde(default)]
    pub discount_amount: f64,
    pub total: f64,
    pub notes: Option<String>,
    pub terms: Option<String>,
    #[serde(default)]
    pub operator_name: Option<String>,
}

pub fn parse_pos_quotation_ticket_from_value(value: &serde_json::Value) -> Result<PosQuotationTicket> {
    serde_json::from_value(value.clone()).context("parse pos-quotation-ticket")
}

pub fn write_pos_quotation_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_quotation_ticket_escpos::write_pos_quotation_ticket_escpos_from_value(dir, value)
}

pub fn write_pos_quotation_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_quotation_ticket_pdf::write_pos_quotation_ticket_pdf_from_value(dir, value)
}
