//! Modelos JSON y helpers compartidos del ticket de venta POS (`pos-sale-ticket`).
//! El render va por ESC/POS (`pos_sale_ticket_escpos`).

use anyhow::{Context, Result};
use serde::Deserialize;
use serde::de::Deserializer;
use serde_json::Value;

/// Acepta `null` o array ausente → `Vec` vacío (payload POS envía `null` en colecciones vacías).
fn deserialize_null_as_default_vec<'de, D, T>(deserializer: D) -> Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opt = Option::<Vec<T>>::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCompany {
    #[serde(default)]
    pub razon_social: String,
    pub nombre_fantasia: Option<String>,
    pub rut: Option<String>,
    pub business_activity: Option<String>,
    /// PNG/JPEG en base64 (sin prefijo `data:` o con él); logo en ticket ESC/POS.
    pub logo_base64: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCustomer {
    pub name: Option<String>,
    pub document: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TicketQuotation {
    pub(crate) document_number: Option<String>,
    pub(crate) valid_until: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketLine {
    pub product_name: String,
    #[serde(default)]
    pub attributes: Vec<String>,
    pub quantity: f64,
    pub unit_symbol: Option<String>,
    pub unit_price_with_tax: f64,
    pub line_gross: f64,
    #[serde(default)]
    pub discount_amount: Option<f64>,
    pub discount_label: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketPromotion {
    pub code: String,
    pub name: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketPayment {
    pub label: String,
    pub amount: f64,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketBackorder {
    #[allow(dead_code)]
    pub percent: f64,
    pub deposit_amount: f64,
    pub order_total: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketTotals {
    pub subtotal_net: f64,
    pub taxes: f64,
    #[serde(default)]
    pub line_discounts: f64,
    #[serde(default)]
    pub order_discount: f64,
    pub total: f64,
    #[serde(default)]
    pub change: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCollectionRow {
    pub folio: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketQuotaCollectionRow {
    pub folio: String,
    pub due_date: Option<String>,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketCreditInstallmentRow {
    pub installment_number: i32,
    pub due_date: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosSaleTicket {
    #[serde(default)]
    #[allow(dead_code)]
    pub version: i32,
    pub folio: String,
    pub issued_at_iso: String,
    #[serde(default)]
    pub document_kind: String,
    pub backorder: Option<TicketBackorder>,
    #[serde(default)]
    pub fiscal_folio: Option<String>,
    #[serde(default)]
    pub fiscal_boleta_warning: Option<String>,
    #[serde(default)]
    pub ticket_role: Option<String>,
    #[serde(default)]
    pub collection_pending: bool,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub ar_collection: Vec<TicketCollectionRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub quota_collection: Vec<TicketQuotaCollectionRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub credit_installment_plan: Vec<TicketCreditInstallmentRow>,
    #[serde(default, deserialize_with = "deserialize_null_as_default_vec")]
    pub nc_payout: Vec<TicketCollectionRow>,
    pub company: TicketCompany,
    pub customer: Option<TicketCustomer>,
    pub quotation: Option<TicketQuotation>,
    #[serde(default)]
    pub lines: Vec<TicketLine>,
    #[serde(default)]
    pub promotions: Vec<TicketPromotion>,
    pub totals: TicketTotals,
    #[serde(default)]
    pub payments: Vec<TicketPayment>,
    #[serde(default)]
    pub operator_name: Option<String>,
}

pub fn sale_ticket_section_heading(ticket: &PosSaleTicket) -> &'static str {
    if !ticket.nc_payout.is_empty() {
        return "DEVOLUCION SALDO NC";
    }
    if !ticket.quota_collection.is_empty() {
        return "PAGO DE CUOTAS";
    }
    if !ticket.ar_collection.is_empty() {
        return "COBRO PENDIENTE";
    }
    if ticket.document_kind == "backorder" {
        return "Detalle de Encargo";
    }
    "Detalle de Venta"
}

pub fn sale_ticket_thanks_message(ticket: &PosSaleTicket) -> &'static str {
    if !ticket.nc_payout.is_empty() {
        return "Comprobante de devolucion de saldo NC";
    }
    if !ticket.quota_collection.is_empty() {
        return "Comprobante de pago de cuotas";
    }
    if !ticket.ar_collection.is_empty() {
        return "Comprobante de cobro";
    }
    if ticket.document_kind == "backorder" {
        return "";
    }
    if ticket.collection_pending {
        return "Venta registrada - cobro pendiente";
    }
    "Gracias por su compra"
}

fn ticket_text(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
}

fn same_label(a: &str, b: &str) -> bool {
    a.trim().eq_ignore_ascii_case(b.trim())
}

pub(crate) fn format_product_line_name(line: &TicketLine) -> String {
    let base = line.product_name.trim();
    if base.is_empty() {
        return String::new();
    }
    let mut seen = std::collections::HashSet::new();
    let mut extras = Vec::new();
    for attr in &line.attributes {
        let a = ticket_text(attr);
        if a.is_empty() || same_label(&a, base) {
            continue;
        }
        let key = a.to_lowercase();
        if seen.insert(key) {
            extras.push(a);
        }
    }
    if extras.is_empty() {
        return base.to_string();
    }
    let mut parts = vec![base.to_string()];
    parts.extend(extras);
    parts.join(" · ")
}

pub fn parse_pos_sale_ticket_from_value(value: &Value) -> Result<PosSaleTicket> {
    serde_json::from_value(value.clone()).context("parse pos-sale-ticket")
}
