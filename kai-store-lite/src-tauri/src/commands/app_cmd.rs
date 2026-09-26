use tauri::Manager;

#[tauri::command]
pub fn app_hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn app_quit(app: tauri::AppHandle) {
    app.exit(0);
}

/// WKWebView ignores `window.print()`. This opens the system print dialog,
/// where macOS offers Save as PDF.
#[tauri::command]
pub fn report_export_pdf(window: tauri::WebviewWindow) -> Result<(), String> {
    let target = window.clone();
    window
        .run_on_main_thread(move || {
            if let Err(err) = target.print() {
                tracing::warn!(error = %err, "report pdf export failed");
            }
        })
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn app_show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
