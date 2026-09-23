mod backup;
mod commands;
mod license;
mod paths;
mod print;
mod sidecar;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .init();

    tauri::Builder::default()
        .setup(|app| {
            let _ = crate::print::get_config();

            // Start Core Lite sidecar
            let port: u16 = std::env::var("KAI_CORE_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(4100);
            if let Err(e) = crate::sidecar::start_core_lite(port, crate::paths::app_data_dir()) {
                tracing::error!("sidecar start: {e}");
            }

            let show = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
            let pos = MenuItem::with_id(app, "pos", "POS", true, None::<&str>)?;
            let admin = MenuItem::with_id(app, "admin", "Admin", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pos, &admin, &quit])?;

            let _tray = TrayIconBuilder::new()
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
                .build(app)?;

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
            commands::print_test,
            commands::print_preview,
            commands::print_sale_preview,
            commands::print_sale_ticket,
            commands::print_cash_opening,
            commands::print_cash_closing,
            commands::backup_export,
            commands::backup_restore,
            commands::sidecar_start,
            commands::sidecar_stop,
            commands::sidecar_status,
            commands::sidecar_health,
        ])
        .build(tauri::generate_context!())
        .expect("error while building KaiStore Lite")
        .run(|_app_handle, event| {
            if matches!(event, RunEvent::ExitRequested { .. }) {
                let _ = crate::sidecar::stop_core_lite();
            }
        });
}
