//! Propósitos de mapeo de impresoras (tickets, comandas, documentos, etiquetas).

pub const VALID_PURPOSES: &[&str] = &["documents", "tickets", "labels", "comandas"];

/// ESC/POS térmico (tickets de venta y comandas de cocina).
pub fn is_ticket_like_purpose(purpose: &str) -> bool {
    purpose == "tickets" || purpose == "comandas"
}

/// Tickets de venta POS (logo global, cajón).
pub fn is_sale_ticket_purpose(purpose: &str) -> bool {
    purpose == "tickets"
}
