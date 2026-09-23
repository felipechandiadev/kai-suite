use crate::print::{
    get_config, list_mappings, list_system_printers, print_cash_closing as do_print_cash_closing,
    print_cash_opening as do_print_cash_opening, print_preview as do_print_preview, print_sale,
    print_sale_preview as do_print_sale_preview, print_test_page, save_config, CompanyHeader,
    PrintConfig, PrintPreviewDto, PrinterMapping, SaleTicketArgs, SystemPrinterInfo,
};
use serde_json::Value;

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
