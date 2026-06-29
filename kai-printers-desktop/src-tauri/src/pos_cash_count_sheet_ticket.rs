//! Planilla de conteo POS → JSON (`pos-cash-count-sheet-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountSheetPaymentLine {
    pub label: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCashCountSheetTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub cash_session_id: String,
    pub session_opened_at: Option<String>,
    pub printed_at: String,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
    #[serde(default)]
    pub payment_lines: Vec<CountSheetPaymentLine>,
}

pub fn parse_pos_cash_count_sheet_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosCashCountSheetTicket> {
    serde_json::from_value(value.clone()).context("parse pos-cash-count-sheet-ticket")
}

pub fn write_pos_cash_count_sheet_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_count_sheet_ticket_escpos::write_pos_cash_count_sheet_ticket_escpos_from_value(
        dir, value,
    )
}
