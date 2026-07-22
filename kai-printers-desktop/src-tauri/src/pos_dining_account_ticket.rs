//! Pre-cuenta / cuenta dining → JSON (`pos-dining-account-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosDiningAccountTicketLine {
    pub name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub line_total: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosDiningAccountTicketAccount {
    pub display_label: String,
    pub table_code: Option<String>,
    pub kind: String,
    #[allow(dead_code)]
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosDiningAccountTicketTotals {
    pub total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosDiningAccountTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub company: TicketCompany,
    pub account: PosDiningAccountTicketAccount,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub issued_at: String,
    pub lines: Vec<PosDiningAccountTicketLine>,
    pub totals: PosDiningAccountTicketTotals,
    pub footer_note: String,
}

pub fn parse_pos_dining_account_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosDiningAccountTicket> {
    serde_json::from_value(value.clone()).context("parse pos-dining-account-ticket")
}

pub fn write_pos_dining_account_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_dining_account_ticket_escpos::write_pos_dining_account_ticket_escpos_from_value(
        dir, value,
    )
}
