//! Guía recepción lavandería → JSON (`pos-laundry-reception-ticket`).

use crate::pos_sale_ticket_pdf::TicketCompany;
use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosLaundryReceptionTicketServiceLine {
    pub name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosLaundryReceptionTicketGarment {
    pub label: String,
    pub quantity: f64,
    pub care_instructions: Option<String>,
    pub services: Vec<PosLaundryReceptionTicketServiceLine>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosLaundryReceptionTicketTotals {
    pub services_total: f64,
    pub deposit_paid: Option<f64>,
    pub balance_due: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosLaundryReceptionTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub code: String,
    pub issued_at: String,
    pub company: TicketCompany,
    pub branch_name: Option<String>,
    pub point_of_sale_name: Option<String>,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub promised_at: Option<String>,
    pub payment_mode_label: String,
    pub garments: Vec<PosLaundryReceptionTicketGarment>,
    pub totals: PosLaundryReceptionTicketTotals,
    pub footer_note: String,
    pub operator_name: Option<String>,
}

pub fn parse_pos_laundry_reception_ticket_from_value(
    value: &serde_json::Value,
) -> Result<PosLaundryReceptionTicket> {
    serde_json::from_value(value.clone()).context("parse pos-laundry-reception-ticket")
}

pub fn write_pos_laundry_reception_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_laundry_reception_ticket_escpos::write_pos_laundry_reception_ticket_escpos_from_value(
        dir, value,
    )
}
