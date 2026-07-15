//! Pago a proveedor (efectivo desde caja POS) → JSON (`pos-supplier-payment-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosSupplierPaymentTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub document_number: String,
    pub issued_at: String,
    pub amount: f64,
    pub supplier_name: String,
    pub supplier_document: Option<String>,
    pub reception_document_number: Option<String>,
    pub supplier_document_ref: Option<String>,
    pub cash_session_id: String,
    pub payment_method_label: Option<String>,
    pub reason: Option<String>,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
}

pub fn parse_pos_supplier_payment_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosSupplierPaymentTicket> {
    serde_json::from_value(value.clone()).context("parse pos-supplier-payment-ticket")
}

pub fn write_pos_supplier_payment_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_supplier_payment_ticket_escpos::write_pos_supplier_payment_ticket_escpos_from_value(
        dir, value,
    )
}
