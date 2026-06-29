//! Print format types aligned with packages/print-service-client (IF-09).

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PrintFormat {
    Ticket58mm,
    Ticket80mm,
    DocumentLetter,
    DocumentA4,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaperProfile {
    Mm58,
    Mm80,
    Letter,
    A4,
}

impl PaperProfile {
    pub fn from_storage(raw: &str) -> Self {
        match raw.trim().to_lowercase().as_str() {
            "58mm" => Self::Mm58,
            "letter" => Self::Letter,
            "a4" => Self::A4,
            _ => Self::Mm80,
        }
    }

    pub fn storage_value(self) -> &'static str {
        match self {
            Self::Mm58 => "58mm",
            Self::Mm80 => "80mm",
            Self::Letter => "letter",
            Self::A4 => "a4",
        }
    }

    pub fn default_for_purpose(purpose: &str) -> Self {
        if purpose == "documents" {
            Self::A4
        } else {
            Self::Mm80
        }
    }
}

impl PrintFormat {
    pub fn parse(raw: Option<&str>) -> Option<Self> {
        let v = raw?.trim().to_lowercase();
        match v.as_str() {
            "ticket" => Some(Self::Ticket80mm),
            "document" => Some(Self::DocumentA4),
            "ticket_58mm" => Some(Self::Ticket58mm),
            "ticket_80mm" => Some(Self::Ticket80mm),
            "document_letter" => Some(Self::DocumentLetter),
            "document_a4" => Some(Self::DocumentA4),
            _ => None,
        }
    }

    pub fn resolve(raw: Option<&str>, purpose: &str) -> Self {
        Self::parse(raw).unwrap_or_else(|| {
            if purpose == "documents" {
                Self::DocumentA4
            } else {
                Self::Ticket80mm
            }
        })
    }

    pub fn wire_value(self) -> &'static str {
        match self {
            Self::Ticket58mm => "ticket_58mm",
            Self::Ticket80mm => "ticket_80mm",
            Self::DocumentLetter => "document_letter",
            Self::DocumentA4 => "document_a4",
        }
    }

    pub fn purpose(self) -> &'static str {
        match self {
            Self::Ticket58mm | Self::Ticket80mm => "tickets",
            Self::DocumentLetter | Self::DocumentA4 => "documents",
        }
    }

    pub fn is_ticket(self) -> bool {
        matches!(self, Self::Ticket58mm | Self::Ticket80mm)
    }

    pub fn is_document(self) -> bool {
        matches!(self, Self::DocumentLetter | Self::DocumentA4)
    }

    pub fn paper_profile(self) -> PaperProfile {
        match self {
            Self::Ticket58mm => PaperProfile::Mm58,
            Self::Ticket80mm => PaperProfile::Mm80,
            Self::DocumentLetter => PaperProfile::Letter,
            Self::DocumentA4 => PaperProfile::A4,
        }
    }

    pub fn chars_per_line(self) -> usize {
        match self {
            Self::Ticket58mm => 32,
            Self::Ticket80mm => 48,
            _ => 48,
        }
    }

    pub fn matches_profile(self, profile: PaperProfile) -> bool {
        self.paper_profile() == profile
    }
}

pub fn is_vector_pos_ticket_type(print_type: &str) -> bool {
    matches!(
        print_type,
        "pos-sale-ticket"
            | "pos-quotation-ticket"
            | "pos-payment-in-ticket"
            | "pos-customer-credit-note-ticket"
            | "pos-cash-closing-ticket"
            | "pos-cash-count-sheet-ticket"
            | "pos-cash-session-opening-ticket"
            |         "pos-bank-account-ticket"
            | "pos-presale-ticket"
            | "variant-barcode-label"
    )
}
