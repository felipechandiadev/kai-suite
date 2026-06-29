//! Cobro PAYMENT_IN → JSON (`pos-payment-in-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentInLine {
    pub label: String,
    pub amount: f64,
    pub reference: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentInAllocation {
    pub document_number: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosPaymentInTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub document_number: String,
    pub issued_at: String,
    pub company: TicketCompany,
    pub customer_name: Option<String>,
    pub customer_document: Option<String>,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
    pub total_collected: f64,
    pub amount_paid: f64,
    #[serde(default)]
    pub payments: Vec<PaymentInLine>,
    #[serde(default)]
    pub allocations: Vec<PaymentInAllocation>,
    pub notes: Option<String>,
    pub external_reference: Option<String>,
}

pub fn parse_pos_payment_in_ticket_from_value(value: &serde_json::Value) -> Result<PosPaymentInTicket> {
    serde_json::from_value(value.clone()).context("parse pos-payment-in-ticket")
}

pub fn write_pos_payment_in_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_payment_in_ticket_escpos::write_pos_payment_in_ticket_escpos_from_value(dir, value)
}
