//! Preferencias locales del agente: qué datos de empresa van en el encabezado ESC/POS.

use crate::db::Db;
use std::cell::Cell;

pub const SHOW_COMPANY_RUT_KEY: &str = "ticket_show_company_rut";
pub const SHOW_RAZON_SOCIAL_KEY: &str = "ticket_show_razon_social";
pub const TITLE_MODE_KEY: &str = "ticket_header_title_mode";

/// Título grande del encabezado: fantasía de empresa o nombre de sucursal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TitleMode {
    Fantasy,
    Branch,
}

impl TitleMode {
    pub fn as_str(self) -> &'static str {
        match self {
            TitleMode::Fantasy => "fantasy",
            TitleMode::Branch => "branch",
        }
    }

    pub fn parse(raw: &str) -> Self {
        match raw.trim().to_ascii_lowercase().as_str() {
            "branch" => TitleMode::Branch,
            _ => TitleMode::Fantasy,
        }
    }
}

thread_local! {
    static SHOW_RUT: Cell<bool> = const { Cell::new(true) };
    static SHOW_RAZON: Cell<bool> = const { Cell::new(true) };
    static TITLE_MODE: Cell<TitleMode> = const { Cell::new(TitleMode::Fantasy) };
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

pub fn title_mode_from_db(db: &Db) -> TitleMode {
    db.get_setting(TITLE_MODE_KEY)
        .ok()
        .flatten()
        .as_deref()
        .map(TitleMode::parse)
        .unwrap_or(TitleMode::Fantasy)
}

/// Carga prefs desde SQLite para el job ESC/POS actual (thread-local).
pub fn install_for_job(db: &Db) {
    SHOW_RUT.set(show_company_rut_from_db(db));
    SHOW_RAZON.set(show_razon_social_from_db(db));
    TITLE_MODE.set(title_mode_from_db(db));
}

/// Override explícito (tests / páginas de prueba).
#[cfg(test)]
pub fn set_for_render(show_rut: bool, show_razon: bool) {
    SHOW_RUT.set(show_rut);
    SHOW_RAZON.set(show_razon);
}

#[cfg(test)]
pub fn set_title_mode_for_render(mode: TitleMode) {
    TITLE_MODE.set(mode);
}

pub fn show_company_rut() -> bool {
    SHOW_RUT.get()
}

pub fn show_razon_social() -> bool {
    SHOW_RAZON.get()
}

pub fn title_mode() -> TitleMode {
    TITLE_MODE.get()
}

/// Línea «Sucursal:» solo si hay nombre y el título no es ya la sucursal.
pub fn should_emit_branch_line(branch_name: Option<&str>) -> bool {
    let has = branch_name.map(str::trim).filter(|s| !s.is_empty()).is_some();
    has && title_mode() == TitleMode::Fantasy
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

    fn header_text(
        show_rut: bool,
        show_razon: bool,
        mode: TitleMode,
        branch: Option<&str>,
    ) -> String {
        set_for_render(show_rut, show_razon);
        set_title_mode_for_render(mode);
        let mut buf = escpos_init();
        append_company_store_header(
            &mut buf,
            &sample_company(),
            CompanyHeaderStyle::FULL,
            branch,
        );
        set_for_render(true, true);
        set_title_mode_for_render(TitleMode::Fantasy);
        String::from_utf8_lossy(&buf).into_owned()
    }

    #[test]
    fn header_includes_rut_and_razon_when_prefs_on() {
        let text = header_text(true, true, TitleMode::Fantasy, None);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(text.contains("Comercial Demo SpA"), "{text}");
        assert!(text.contains("RUT: 76.123.456-7"), "{text}");
    }

    #[test]
    fn header_omits_rut_when_pref_off() {
        let text = header_text(false, true, TitleMode::Fantasy, None);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(text.contains("Comercial Demo SpA"), "{text}");
        assert!(!text.contains("RUT:"), "{text}");
        assert!(!text.contains("76.123.456-7"), "{text}");
    }

    #[test]
    fn header_omits_secondary_razon_when_pref_off() {
        let text = header_text(true, false, TitleMode::Fantasy, None);
        assert!(text.contains("Kai Food"), "{text}");
        assert!(!text.contains("Comercial Demo SpA"), "{text}");
        assert!(text.contains("RUT: 76.123.456-7"), "{text}");
    }

    #[test]
    fn header_uses_branch_as_title_when_mode_branch() {
        let text = header_text(true, false, TitleMode::Branch, Some("Sucursal Centro"));
        assert!(text.contains("Sucursal Centro"), "{text}");
        assert!(!text.contains("Kai Food"), "{text}");
    }

    #[test]
    fn header_branch_mode_falls_back_to_fantasy_when_branch_empty() {
        let text = header_text(true, false, TitleMode::Branch, Some("  "));
        assert!(text.contains("Kai Food"), "{text}");
    }

    #[test]
    fn should_emit_branch_line_only_in_fantasy_mode() {
        set_title_mode_for_render(TitleMode::Fantasy);
        assert!(should_emit_branch_line(Some("Centro")));
        set_title_mode_for_render(TitleMode::Branch);
        assert!(!should_emit_branch_line(Some("Centro")));
        set_title_mode_for_render(TitleMode::Fantasy);
        assert!(!should_emit_branch_line(None));
        set_title_mode_for_render(TitleMode::Fantasy);
    }
}
