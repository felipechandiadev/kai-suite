//! Apertura de caja POS → JSON (`pos-cash-session-opening-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCashSessionOpeningTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub cash_session_id: String,
    pub opened_at: String,
    pub opening_amount: f64,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
    pub cash_hub_name: Option<String>,
}

pub fn parse_pos_cash_session_opening_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosCashSessionOpeningTicket> {
    serde_json::from_value(value.clone()).context("parse pos-cash-session-opening-ticket")
}

pub fn write_pos_cash_session_opening_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_session_opening_ticket_escpos::write_pos_cash_session_opening_ticket_escpos_from_value(
        dir, value,
    )
}
