//! Arqueo de caja POS → JSON (`pos-cash-closing-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CountedBuckets {
    #[serde(default)]
    pub cash: f64,
    #[serde(default)]
    pub debit_card: f64,
    #[serde(default)]
    pub credit_card: f64,
    #[serde(default)]
    pub transfer: f64,
    #[serde(default)]
    pub check: f64,
    #[serde(default)]
    pub other: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCashClosingTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub cash_session_id: String,
    pub session_opened_at: Option<String>,
    pub closed_at: String,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
    pub used_blind_count: bool,
    pub counted: CountedBuckets,
    pub counted_grand: f64,
    pub system_cash_expected: Option<f64>,
    pub difference: Option<f64>,
    pub sales_total: Option<f64>,
    pub notes: Option<String>,
    pub message: Option<String>,
}

pub fn parse_pos_cash_closing_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosCashClosingTicket> {
    serde_json::from_value(value.clone()).context("parse pos-cash-closing-ticket")
}

pub fn write_pos_cash_closing_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_closing_ticket_escpos::write_pos_cash_closing_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_cash_closing_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_closing_ticket_pdf::write_pos_cash_closing_ticket_pdf_from_value(dir, value)
}
