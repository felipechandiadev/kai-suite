//! Movimiento de efectivo POS ↔ centro de acopio → JSON (`pos-cash-hub-movement-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosCashHubMovementTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub direction: String,
    pub document_number: String,
    pub issued_at: String,
    pub amount: f64,
    pub cash_hub_name: String,
    pub cash_session_id: String,
    pub reason: Option<String>,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub operator_name: Option<String>,
}

pub fn parse_pos_cash_hub_movement_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosCashHubMovementTicket> {
    serde_json::from_value(value.clone()).context("parse pos-cash-hub-movement-ticket")
}

pub fn write_pos_cash_hub_movement_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_hub_movement_ticket_escpos::write_pos_cash_hub_movement_ticket_escpos_from_value(
        dir, value,
    )
}
