//! Preferencias locales del agente: qué datos de empresa van en el encabezado ESC/POS.

use crate::db::Db;
use std::cell::Cell;

pub const SHOW_COMPANY_RUT_KEY: &str = "ticket_show_company_rut";
pub const SHOW_RAZON_SOCIAL_KEY: &str = "ticket_show_razon_social";

thread_local! {
    static SHOW_RUT: Cell<bool> = const { Cell::new(true) };
    static SHOW_RAZON: Cell<bool> = const { Cell::new(true) };
}

fn setting_enabled(db: &Db, key: &str) -> bool {
    db.get_setting(key)
        .ok()
        .flatten()
        .as_deref()
        != Some("false")
}

pub fn show_company_rut_from_db(db: &Db) -> bool {
    setting_enabled(db, SHOW_COMPANY_RUT_KEY)
}

pub fn show_razon_social_from_db(db: &Db) -> bool {
    setting_enabled(db, SHOW_RAZON_SOCIAL_KEY)
}

/// Carga prefs desde SQLite para el job ESC/POS actual (thread-local).
pub fn install_for_job(db: &Db) {
    SHOW_RUT.set(show_company_rut_from_db(db));
    SHOW_RAZON.set(show_razon_social_from_db(db));
}

/// Override explícito (tests / páginas de prueba).
#[cfg(test)]
pub fn set_for_render(show_rut: bool, show_razon: bool) {
    SHOW_RUT.set(show_rut);
    SHOW_RAZON.set(show_razon);
}

pub fn show_company_rut() -> bool {
    SHOW_RUT.get()
}

pub fn show_razon_social() -> bool {
    SHOW_RAZON.get()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pos_sale_ticket_escpos::{
        append_company_store_header, escpos_init, CompanyHeaderStyle,
    };
    use crate::pos_sale_ticket_pdf::TicketCompany;

    fn sample_company() -> TicketCompany {
        TicketCompany {
            razon_social: "Comercial Demo SpA".into(),
            nombre_fantasia: Some("Kai Food".into()),
            rut: Some("76.123.456-7".into()),
            business_activity: Some("Restaurantes".into()),
            logo_base64: None,
        }
    }

    fn header_text(show_rut: bool, show_razon: bool) -> String {
        set_for_render(show_rut, show_razon);
        let mut buf = escpos_init();
        append_company_store_header(&mut buf, &sample_company(), CompanyHeaderStyle::FULL);
        set_for_render(true, true);
        String::from_utf8_lossy(&buf).into_owned()
    }

    #[test]
    fn header_includes_rut_and_razon_when_prefs_on() {
        let text = header_text(true, true);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(text.contains("Comercial Demo SpA"), "{text}");
        assert!(text.contains("RUT: 76.123.456-7"), "{text}");
    }

    #[test]
    fn header_omits_rut_when_pref_off() {
        let text = header_text(false, true);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(text.contains("Comercial Demo SpA"), "{text}");
        assert!(!text.contains("RUT:"), "{text}");
        assert!(!text.contains("76.123.456-7"), "{text}");
    }

    #[test]
    fn header_omits_secondary_razon_when_pref_off() {
        let text = header_text(true, false);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(!text.contains("Comercial Demo SpA"), "{text}");
        assert!(text.contains("RUT: 76.123.456-7"), "{text}");
    }
}
