//! Cuenta bancaria empresa (transferencia POS) → JSON (`pos-bank-account-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosBankAccountTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    #[allow(dead_code)]
    pub account_key: String,
    pub bank_name: String,
    pub account_type: String,
    pub account_number: String,
    pub account_holder_name: Option<String>,
    pub notes: Option<String>,
    #[serde(default)]
    pub is_primary: bool,
    pub company: TicketCompany,
    #[allow(dead_code)]
    pub branch_name: Option<String>,
    #[allow(dead_code)]
    pub point_of_sale_name: Option<String>,
    pub payment_method_label: Option<String>,
    #[allow(dead_code)]
    pub issued_at: String,
}

pub fn parse_pos_bank_account_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosBankAccountTicket> {
    serde_json::from_value(value.clone()).context("parse pos-bank-account-ticket")
}

pub fn write_pos_bank_account_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_bank_account_ticket_escpos::write_pos_bank_account_ticket_escpos_from_value(
        dir, value,
    )
}
