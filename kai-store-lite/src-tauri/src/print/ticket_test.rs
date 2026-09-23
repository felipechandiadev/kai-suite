use crate::print::platform::{dispatch_escpos, resolve_target_printer};
use crate::print::ticket_sale::build_escpos_for_body;
use crate::print::db::get_config;

/// Página de prueba ESC/POS (misma vía RAW que tickets reales).
pub fn print_test_page() -> Result<(), String> {
    let cfg = get_config()?;
    let target = resolve_target_printer().unwrap_or_else(|_| {
        if cfg.system_printer_name.is_empty() {
            "predeterminada del sistema".into()
        } else {
            cfg.system_printer_name.clone()
        }
    });
    let body = format!(
        "KaiStore Lite — TEST\nImpresora: {}\nNombre: {}\nPapel: {}\nCorte: {}\nEncoding: {}\n",
        target,
        cfg.display_name,
        cfg.paper_profile,
        if cfg.auto_cut_enabled { "sí" } else { "no" },
        cfg.text_encoding,
    );
    let bytes = build_escpos_for_body(&body, false, &cfg)?;
    dispatch_escpos(&bytes, &body)
}
