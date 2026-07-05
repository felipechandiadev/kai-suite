//! Ticket de preventa POS → JSON (`pos-presale-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresaleLine {
    pub product_name: String,
    pub variant_name: Option<String>,
    pub quantity: f64,
    pub total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosPresaleTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub code: String,
    pub qr_payload: String,
    pub issued_at: String,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    #[serde(default)]
    pub lines: Vec<PresaleLine>,
    pub total: f64,
    #[serde(default)]
    pub operator_name: Option<String>,
}

pub fn parse_pos_presale_ticket_from_value(value: &serde_json::Value) -> Result<PosPresaleTicket> {
    serde_json::from_value(value.clone()).context("parse pos-presale-ticket")
}

pub fn write_pos_presale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_presale_ticket_escpos::write_pos_presale_ticket_escpos_from_value(dir, value)
}
