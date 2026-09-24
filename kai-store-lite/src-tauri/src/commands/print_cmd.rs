use crate::print::{
    get_config, list_mappings, list_system_printers, print_cash_closing as do_print_cash_closing,
    print_cash_opening as do_print_cash_opening, print_preview as do_print_preview, print_sale,
    print_sale_preview as do_print_sale_preview, print_test_page, save_config, CompanyHeader,
    PrintConfig, PrintPreviewDto, PrinterMapping, SaleTicketArgs, SystemPrinterInfo,
};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintHostInfo {
    pub os: String,
    pub is_crostini: bool,
    pub printers_available: usize,
}

fn detect_crostini() -> bool {
    if Path::new("/.crostini").exists() {
        return true;
    }
    if Path::new("/mnt/chromeos").exists() {
        return true;
    }
    std::env::var_os("CROSTINI").is_some()
        || std::env::var_os("SOMMELIER_XDG_RUNTIME_DIR").is_some()
}

#[tauri::command]
pub fn print_host_info() -> Result<PrintHostInfo, String> {
    let printers_available = list_system_printers().map(|p| p.len()).unwrap_or(0);
    Ok(PrintHostInfo {
        os: std::env::consts::OS.to_string(),
        is_crostini: cfg!(target_os = "linux") && detect_crostini(),
        printers_available,
    })
}

#[tauri::command]
pub fn print_list_mappings() -> Result<Vec<PrinterMapping>, String> {
    list_mappings()
}

#[tauri::command]
pub fn print_get_config() -> Result<PrintConfig, String> {
    get_config()
}

#[tauri::command]
pub fn print_save_config(config: PrintConfig) -> Result<PrintConfig, String> {
    save_config(config)
}

#[tauri::command]
pub fn print_list_system_printers() -> Result<Vec<SystemPrinterInfo>, String> {
    list_system_printers()
}

#[tauri::command]
pub fn print_test() -> Result<(), String> {
    print_test_page()
}

#[tauri::command]
pub fn print_preview(
    kind: String,
    company: Option<CompanyHeader>,
    config: Option<PrintConfig>,
) -> Result<PrintPreviewDto, String> {
    do_print_preview(&kind, company, config)
}

#[tauri::command]
pub fn print_sale_preview(
    sale_id: String,
    total: f64,
    method: String,
    lines: Value,
    company: Option<CompanyHeader>,
) -> Result<PrintPreviewDto, String> {
    do_print_sale_preview(SaleTicketArgs {
        sale_id,
        total,
        method,
        lines,
        company,
    })
}

#[tauri::command]
pub fn print_sale_ticket(
    sale_id: String,
    total: f64,
    method: String,
    lines: Value,
    company: Option<CompanyHeader>,
) -> Result<(), String> {
    print_sale(SaleTicketArgs {
        sale_id,
        total,
        method,
        lines,
        company,
    })
}

#[tauri::command]
pub fn print_cash_opening(
    amount: f64,
    company: Option<CompanyHeader>,
) -> Result<(), String> {
    do_print_cash_opening(amount, company)
}

#[tauri::command]
pub fn print_cash_closing(
    counted: f64,
    opening_float: f64,
    company: Option<CompanyHeader>,
) -> Result<(), String> {
    do_print_cash_closing(counted, opening_float, company)
}
