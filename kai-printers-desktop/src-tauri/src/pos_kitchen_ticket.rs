//! Comanda de cocina → JSON (`pos-kitchen-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosKitchenTicketLine {
    pub name: String,
    pub quantity: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosKitchenTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub company: TicketCompany,
    pub production_unit_name: String,
    pub fire_number: i64,
    pub account_label: String,
    pub table_code: Option<String>,
    pub branch_name: Option<String>,
    pub issued_at: String,
    pub lines: Vec<PosKitchenTicketLine>,
    pub footer_note: String,
    #[serde(default)]
    pub is_replica: Option<bool>,
}

pub fn parse_pos_kitchen_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosKitchenTicket> {
    serde_json::from_value(value.clone()).context("parse pos-kitchen-ticket")
}

pub fn write_pos_kitchen_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_kitchen_ticket_escpos::write_pos_kitchen_ticket_escpos_from_value(dir, value)
}
