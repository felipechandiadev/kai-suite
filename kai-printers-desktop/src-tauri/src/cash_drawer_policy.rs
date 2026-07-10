//! Política de apertura de gaveta (ESC/POS) por tipo agente (`type` del protocolo print).

/// Tipos agente que pueden abrir gaveta (80 mm + switch en mapeo Tickets).
pub fn agent_print_type_eligible_for_drawer(agent_type: &str) -> bool {
    matches!(
        agent_type,
        "pos-sale-ticket"
            | "fiscal-boleta-preview"
            | "pos-cash-session-opening-ticket"
            | "pos-cash-count-sheet-ticket"
            | "pos-cash-hub-movement-ticket"
            | "pos-payment-in-ticket"
            | "test_print"
            | "test_escpos_qa"
            | "test_escpos_qa_nocut"
    )
}

/// Decide si el job debe enviar pulso de gaveta tras el ticket.
pub fn open_cash_drawer_for_agent_type(
    agent_type: &str,
    roll_width_mm: u8,
    drawer_enabled: bool,
) -> bool {
    if roll_width_mm != 80 {
        return false;
    }
    if agent_type == "test_drawer" {
        return true;
    }
    if !drawer_enabled {
        return false;
    }
    agent_print_type_eligible_for_drawer(agent_type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sale_ticket_opens_when_enabled_80mm() {
        assert!(open_cash_drawer_for_agent_type(
            "pos-sale-ticket",
            80,
            true
        ));
    }

    #[test]
    fn business_document_type_does_not_open() {
        assert!(!open_cash_drawer_for_agent_type("SALE", 80, true));
    }

    #[test]
    fn fiscal_boleta_opens_when_enabled() {
        assert!(open_cash_drawer_for_agent_type(
            "fiscal-boleta-preview",
            80,
            true
        ));
    }

    #[test]
    fn cash_session_opening_opens_when_enabled() {
        assert!(open_cash_drawer_for_agent_type(
            "pos-cash-session-opening-ticket",
            80,
            true
        ));
    }

    #[test]
    fn count_sheet_opens_when_enabled() {
        assert!(open_cash_drawer_for_agent_type(
            "pos-cash-count-sheet-ticket",
            80,
            true
        ));
    }

    #[test]
    fn never_on_58mm() {
        assert!(!open_cash_drawer_for_agent_type("pos-sale-ticket", 58, true));
    }

    #[test]
    fn respects_switch_off() {
        assert!(!open_cash_drawer_for_agent_type("pos-sale-ticket", 80, false));
    }

    #[test]
    fn test_drawer_always_on_80mm() {
        assert!(open_cash_drawer_for_agent_type("test_drawer", 80, false));
    }

    #[test]
    fn quotation_does_not_open() {
        assert!(!open_cash_drawer_for_agent_type(
            "pos-quotation-ticket",
            80,
            true
        ));
    }
}
