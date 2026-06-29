//! Nota de crédito POS → JSON (`pos-customer-credit-note-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditNoteLine {
    pub product_name: String,
    #[serde(default)]
    pub attributes: Vec<String>,
    pub quantity: f64,
    pub unit_price_with_tax: f64,
    pub line_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditNoteTotals {
    pub subtotal_net: f64,
    pub taxes: f64,
    #[serde(default)]
    pub discounts: f64,
    pub total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundPayment {
    pub label: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCustomerCreditNoteTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub credit_note_folio: String,
    pub sale_return_folio: String,
    pub original_sale_folio: String,
    pub issued_at_iso: String,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub customer_name: Option<String>,
    pub customer_document: Option<String>,
    #[serde(default)]
    pub lines: Vec<CreditNoteLine>,
    pub totals: CreditNoteTotals,
    #[serde(default)]
    pub refund_mode: Option<String>,
    #[serde(default)]
    pub refund_payments: Vec<RefundPayment>,
}

pub fn parse_pos_customer_credit_note_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosCustomerCreditNoteTicket> {
    serde_json::from_value(value.clone()).context("parse pos-customer-credit-note-ticket")
}

pub fn write_pos_customer_credit_note_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_customer_credit_note_ticket_escpos::write_pos_customer_credit_note_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_customer_credit_note_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_customer_credit_note_ticket_pdf::write_pos_customer_credit_note_ticket_pdf_from_value(
        dir, value,
    )
}
