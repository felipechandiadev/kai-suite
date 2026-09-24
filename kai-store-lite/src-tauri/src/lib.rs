mod backup;
mod commands;
pub mod lite;
mod license;
mod paths;
mod print;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .init();

    tracing::info!("KaiStore Lite backend: in-process sqlx (no Node sidecar)");

    tauri::Builder::default()
        .setup(|app| {
            let _ = crate::print::get_config();

            let db_path = crate::paths::business_db_path();
            let pool = match tauri::async_runtime::block_on(lite::open_pool(&db_path)) {
                Ok(pool) => {
                    tracing::info!(path = %db_path.display(), "lite sqlx pool ready");
                    pool
                }
                Err(e) => {
                    tracing::error!("lite sqlx pool: {e}");
                    return Err(e.into());
                }
            };
            if let Err(e) =
                tauri::async_runtime::block_on(lite::application::seed::run_seed(&pool))
            {
                tracing::warn!(error = %e, "lite seed on startup");
            }
            app.manage(pool);

            let show = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
            let pos = MenuItem::with_id(app, "pos", "POS", true, None::<&str>)?;
            let admin = MenuItem::with_id(app, "admin", "Admin", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pos, &admin, &quit])?;

            match TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("KaiStore Lite")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "pos" => {
                        let _ = app.emit("kai-lite://section", "pos");
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "admin" => {
                        let _ = app.emit("kai-lite://section", "admin");
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)
            {
                Ok(tray) => {
                    std::mem::forget(tray);
                }
                Err(e) => {
                    tracing::warn!(error = %e, "system tray unavailable; continuing without tray");
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_hide_main_window,
            commands::app_show_main_window,
            commands::app_quit,
            commands::license_status,
            commands::license_fingerprint,
            commands::license_start_trial,
            commands::license_activate_code,
            commands::license_activate,
            commands::print_list_mappings,
            commands::print_get_config,
            commands::print_save_config,
            commands::print_list_system_printers,
            commands::print_host_info,
            commands::print_test,
            commands::print_preview,
            commands::print_sale_preview,
            commands::print_sale_ticket,
            commands::print_cash_opening,
            commands::print_cash_closing,
            commands::backup_export,
            commands::backup_restore,
            lite::commands::lite_health,
            lite::commands::lite_auth_login,
            lite::commands::lite_auth_change_password,
            lite::commands::lite_seed_run,
            lite::commands::lite_pos_catalog,
            lite::commands::lite_admin_products_list,
            lite::commands::lite_admin_products_create,
            lite::commands::lite_admin_products_bulk,
            lite::commands::lite_admin_products_patch,
            lite::commands::lite_admin_variants_list,
            lite::commands::lite_admin_variants_create,
            lite::commands::lite_admin_variant_get,
            lite::commands::lite_admin_variant_patch,
            lite::commands::lite_admin_pack_get,
            lite::commands::lite_admin_pack_put,
            lite::commands::lite_admin_units_list,
            lite::commands::lite_admin_units_create,
            lite::commands::lite_admin_units_patch,
            lite::commands::lite_admin_storages_list,
            lite::commands::lite_admin_storages_create,
            lite::commands::lite_admin_storages_patch,
            lite::commands::lite_admin_categories_list,
            lite::commands::lite_admin_categories_create,
            lite::commands::lite_admin_categories_patch,
            lite::commands::lite_admin_categories_delete,
            lite::commands::lite_admin_attributes_list,
            lite::commands::lite_admin_attributes_create,
            lite::commands::lite_admin_attributes_patch,
            lite::commands::lite_admin_attributes_delete,
            lite::commands::lite_admin_stock_list,
            lite::commands::lite_admin_stock_adjust,
            lite::commands::lite_admin_stock_delta,
            lite::commands::lite_admin_stock_transfer,
            lite::commands::lite_admin_receptions_list,
            lite::commands::lite_admin_receptions_create,
            lite::commands::lite_pos_sale,
            lite::commands::lite_admin_sales_list,
            lite::commands::lite_admin_sales_get,
            lite::commands::lite_admin_sales_void,
            lite::commands::lite_admin_customers_list,
            lite::commands::lite_admin_suppliers_list,
            lite::commands::lite_ops_cash_list,
            lite::commands::lite_ops_cash_movements,
            lite::commands::lite_ops_cash_open,
            lite::commands::lite_ops_cash_close,
            lite::commands::lite_ops_cash_deposit,
            lite::commands::lite_ops_cash_withdrawal,
            lite::commands::lite_admin_dashboard,
            lite::commands::lite_admin_company_get,
            lite::commands::lite_admin_company_patch,
            lite::commands::lite_admin_pos_list,
            lite::commands::lite_admin_pos_current_get,
            lite::commands::lite_admin_pos_current_patch,
            lite::commands::lite_admin_users_list,
            lite::commands::lite_admin_users_create,
            lite::commands::lite_admin_users_delete,
            lite::commands::lite_sales_report_run,
        ])
        .build(tauri::generate_context!())
        .expect("error while building KaiStore Lite")
        .run(|_app_handle, event| {
            if matches!(event, RunEvent::ExitRequested { .. }) {
                tracing::info!("KaiStore Lite exiting");
            }
        });
}
