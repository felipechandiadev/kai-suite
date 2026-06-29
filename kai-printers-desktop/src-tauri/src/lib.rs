mod agent_log;
mod print_diag;
mod db;
mod events;
mod jobs;
mod ticket_test_pdf;
mod ticket_test_escpos;
mod escpos_qa;
mod cut_test_pdf;
mod pos_sale_ticket_pdf;
mod escpos_raster;
mod pos_sale_ticket_escpos;
mod pos_quotation_ticket;
mod pos_quotation_ticket_escpos;
mod pos_quotation_ticket_pdf;
mod pos_customer_credit_note_ticket;
mod pos_customer_credit_note_ticket_escpos;
mod pos_customer_credit_note_ticket_pdf;
mod pos_cash_closing_ticket;
mod pos_cash_closing_ticket_escpos;
mod pos_cash_closing_ticket_pdf;
mod pos_cash_count_sheet_ticket;
mod pos_cash_count_sheet_ticket_escpos;
mod pos_cash_session_opening_ticket;
mod pos_cash_session_opening_ticket_escpos;
mod pos_bank_account_ticket;
mod pos_bank_account_ticket_escpos;
mod pos_payment_in_ticket;
mod pos_payment_in_ticket_escpos;
mod pos_presale_ticket;
mod pos_presale_ticket_escpos;
mod variant_barcode_label;
mod variant_barcode_label_escpos;
mod ticket_barcode;
mod platform;
mod port_release;
mod protocol;
mod print_formats;
mod escpos_width;
mod security;
mod state;
mod tls;
mod ticket_logos;
mod reachability;
mod ws;
mod wss;

use std::sync::atomic::Ordering;
use std::sync::Arc;

use serde::Deserialize;
use serde_json::json;
use state::{AppState, ListenerControl};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
#[cfg(target_os = "macos")]
use tauri::menu::{AboutMetadata, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::webview::WebviewWindowBuilder;
use tauri::Emitter;
use tauri::Manager;
use tauri::WebviewUrl;
use tokio::sync::watch;
use tracing_subscriber::prelude::*;

fn install_rustls_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

/// Icono de bandeja del sistema.
/// macOS: silueta blanca (`tray-icon-mac.png`); Windows/Linux: favicon (`tray-icon.png`).
fn load_tray_icon() -> Option<Image<'static>> {
    #[cfg(target_os = "macos")]
    const TRAY_PNG: &[u8] = include_bytes!("../icons/tray-icon-mac.png");
    #[cfg(not(target_os = "macos"))]
    const TRAY_PNG: &[u8] = include_bytes!("../icons/tray-icon.png");
    match Image::from_bytes(TRAY_PNG) {
        Ok(img) => Some(img),
        Err(e) => {
            tracing::warn!("tray-icon.png embebido inválido: {e}");
            None
        }
    }
}

fn init_tracing(agent_log: Arc<agent_log::AgentLog>) -> anyhow::Result<()> {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(agent_log::AgentLogLayer::new(agent_log))
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stderr)
                .with_target(false),
        )
        .init();
    Ok(())
}

fn spawn_printer_health_tick(state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let mut last = String::new();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(15)).await;
            let Ok(ev) = events::emit_printer_health_json(&state.db, &[], &state.reachability) else {
                continue;
            };
            let s = ev.to_string();
            if s != last {
                last = s.clone();
                let _ = state.broadcast.send(s);
            }
        }
    });
}

/// Notifica a la ventana Tauri cuando cambia algo relevante del dashboard (WS, trabajos, salud, etc.).
fn spawn_dashboard_ui_events(app: tauri::AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let mut rx = state.broadcast.subscribe();
        loop {
            match rx.recv().await {
                Ok(_) => {
                    let _ = app.emit("dashboard-update", ());
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });
}

#[tauri::command]
fn get_listen_port(state: tauri::State<'_, Arc<AppState>>) -> u16 {
    state.db.listen_port()
}

#[tauri::command]
fn get_wss_listen_port(state: tauri::State<'_, Arc<AppState>>) -> u16 {
    state.db.wss_listen_port()
}

#[tauri::command]
fn get_metrics(state: tauri::State<'_, Arc<AppState>>) -> serde_json::Value {
    json!({
        "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed),
    })
}

/// Detiene listeners WS/WSS (si existen) antes de volver a enlazar puertos.
async fn stop_print_network_tasks(state: &Arc<AppState>) {
    state.signal_disconnect_all_ws_clients();
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
    let ws = state.ws_listener.lock().take();
    let wss = state.wss_listener.lock().take();
    if let Some(c) = ws {
        let _ = c.shutdown.send(true);
        let _ = tokio::time::timeout(std::time::Duration::from_secs(3), c.join).await;
    }
    if let Some(c) = wss {
        let _ = c.shutdown.send(true);
        let _ = tokio::time::timeout(std::time::Duration::from_secs(3), c.join).await;
    }
}

fn spawn_ws_listener(state: &Arc<AppState>) -> Result<(), String> {
    if let Some(old) = state.ws_listener.lock().take() {
        let _ = old.shutdown.send(true);
        old.join.abort();
    }
    let (tx, rx) = watch::channel(false);
    let st = state.clone();
    let join = tauri::async_runtime::spawn(async move {
        let _ = ws::run_ws_loop(st, rx).await;
    });
    *state.ws_listener.lock() = Some(ListenerControl {
        shutdown: tx,
        join,
    });
    Ok(())
}

fn spawn_wss_listener_if_enabled(state: &Arc<AppState>) -> Result<(), String> {
    if let Some(old) = state.wss_listener.lock().take() {
        let _ = old.shutdown.send(true);
        old.join.abort();
    }
    let wss_on = state
        .db
        .get_setting("wss_enabled")
        .ok()
        .flatten()
        .as_deref()
        != Some("false");
    if !wss_on {
        return Ok(());
    }
    let cfg = match tls::load_or_create_server_config(&state.data_dir) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("tls init: {e:#}");
            return Err(format!("tls init: {e:#}"));
        }
    };
    let (tx, rx) = watch::channel(false);
    let st = state.clone();
    let join = tauri::async_runtime::spawn(async move {
        let _ = wss::run_wss_loop(st, cfg, rx).await;
    });
    *state.wss_listener.lock() = Some(ListenerControl {
        shutdown: tx,
        join,
    });
    Ok(())
}

#[tauri::command]
async fn stop_print_network(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    stop_print_network_tasks(&state).await;
    notify_print_network_toggle(&state, "print_network_stopped");
    Ok(())
}

#[tauri::command]
async fn start_print_network(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    port_release::terminate_stale_agent_if_ports_busy(state.db.as_ref());
    stop_print_network_tasks(&state).await;
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    spawn_ws_listener(&state)?;
    spawn_wss_listener_if_enabled(&state)?;
    tokio::time::sleep(std::time::Duration::from_millis(120)).await;
    notify_print_network_toggle(&state, "print_network_started");
    Ok(())
}

fn notify_printer_health_and_config(state: &Arc<AppState>) {
    if let Ok(ph) = events::emit_printer_health_json(&state.db, &[], &state.reachability) {
        let _ = state.broadcast.send(ph.to_string());
    }
    let cfg = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "config_changed",
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(cfg.to_string());
}

fn notify_jobs_changed(state: &Arc<AppState>) {
    let ping = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "jobs_changed",
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(ping.to_string());
}

fn notify_print_network_toggle(state: &Arc<AppState>, event: &'static str) {
    let ping = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": event,
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(ping.to_string());
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceSettingsPatch {
    listen_port: Option<u16>,
    wss_listen_port: Option<u16>,
    wss_enabled: Option<bool>,
    agent_display_name: Option<String>,
}

#[tauri::command]
fn get_dashboard(state: tauri::State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let printers = platform::list_system_printers().map_err(|e| e.to_string())?;
    let mappings = state.db.get_mappings().map_err(|e| e.to_string())?;
    let mapping_lines = state.db.list_mapping_lines().map_err(|e| e.to_string())?;
    crate::reachability::refresh_all_lines(&state.db, &printers, &state.reachability, true)
        .map_err(|e| e.to_string())?;
    let ph = events::printer_health_event_json(&state.db, &printers, &[], &state.reachability);
    let jobs = state.db.list_jobs_queue(40).map_err(|e| e.to_string())?;
    let wss_on = state
        .db
        .get_setting("wss_enabled")
        .map_err(|e| e.to_string())?
        .as_deref()
        != Some("false");
    let agent_display_name = state.db.agent_display_name();
    let sessions = state.connected_sessions_json();
    Ok(json!({
        "printers": printers,
        "mappings": mappings.iter().map(|(a,b)| json!({"purpose": a, "printerName": b})).collect::<Vec<_>>(),
        "mappingLines": mapping_lines,
        "aliasesByPurpose": state.db.aliases_by_purpose_json().map_err(|e| e.to_string())?,
        "printerHealth": ph["payload"].clone(),
        "jobs": jobs,
        "metrics": { "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed) },
        "serviceStatus": events::service_status_payload(state.connected(), sessions),
        "listenHost": state.db.listen_host(),
        "listenPort": state.db.listen_port(),
        "wssListenPort": state.db.wss_listen_port(),
        "wssEnabled": wss_on,
        "wsListening": state.ws_listener_running(),
        "wssListening": state.wss_listener_running(),
        "agentDisplayName": agent_display_name,
        "globalTicketLogoPath": state.db.global_ticket_logo_path().map_err(|e| e.to_string())?,
        "globalTicketLogoDisplayName": state
            .db
            .global_ticket_logo_path()
            .ok()
            .flatten()
            .map(|p| {
                let t = p.replace('\\', "/");
                t.rsplit('/').next().unwrap_or(&t).to_string()
            }),
        "agentLogs": state.agent_log.list(),
        "hostPlatform": platform::host_platform(),
        "sumatra": platform::sumatra_status(),
    }))
}

#[tauri::command(rename_all = "snake_case")]
fn refresh_sumatra_status() -> Result<platform::SumatraStatus, String> {
    platform::invalidate_sumatra_cache();
    Ok(platform::sumatra_status())
}

#[tauri::command]
fn get_agent_logs(state: tauri::State<'_, Arc<AppState>>) -> Vec<agent_log::AgentLogEntry> {
    state.agent_log.list()
}

#[tauri::command]
fn clear_agent_logs(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state.agent_log.clear();
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn get_wss_certificate_path(state: tauri::State<'_, Arc<AppState>>) -> Result<String, String> {
    Ok(tls::wss_cert_path(&state.data_dir)
        .to_string_lossy()
        .into_owned())
}

#[tauri::command(rename_all = "snake_case")]
fn open_app_data_dir(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    let dir = state.data_dir.to_string_lossy().to_string();
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = dir;
        Err("open_app_data_dir: plataforma no soportada".into())
    }
}

/// Instala el certificado autofirmado WSS para que el navegador confíe WSS desde HTTPS (POS en la nube).
#[tauri::command(rename_all = "snake_case")]
fn install_wss_trust_certificate(state: tauri::State<'_, Arc<AppState>>) -> Result<String, String> {
    let cert = tls::wss_cert_path(&state.data_dir);
    if !cert.is_file() {
        return Err(
            "No existe el certificado WSS. Encendé el servicio (WSS) en KaiPrinters al menos una vez.".into(),
        );
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "variable HOME no definida".to_string())?;
        let keychain = std::path::PathBuf::from(home).join("Library/Keychains/login.keychain-db");
        let status = std::process::Command::new("security")
            .args([
                "add-trusted-cert",
                "-d",
                "-r",
                "trustRoot",
                "-k",
            ])
            .arg(&keychain)
            .arg(&cert)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!(
                "security add-trusted-cert falló (código {:?}). \
                 Importá manualmente agent-tls-cert.der desde Acceso a Llaveros → Sistema → confiar.",
                status.code()
            ));
        }
        state.agent_log.push(
            "info",
            "Certificado WSS confiado en Llaveros (macOS). Cerrá Safari/Chrome por completo y volvé a abrir el POS.",
            None,
        );
        return Ok(
            "Certificado instalado en el llavero del usuario. Cerrá el navegador del POS por completo y volvé a abrirlo.".into(),
        );
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let out = std::process::Command::new("certutil")
            .args(["-addstore", "-user", "Root"])
            .arg(cert.as_os_str())
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            let stderr = String::from_utf8_lossy(&out.stderr);
            let stdout = String::from_utf8_lossy(&out.stdout);
            return Err(format!(
                "certutil falló ({}): {stdout} {stderr}",
                out.status.code().unwrap_or(-1)
            ));
        }
        state.agent_log.push(
            "info",
            "Certificado WSS instalado en «Entidades de certificación raíz de confianza» (usuario). Cerrá Chrome/Edge por completo y volvé a abrir el POS.",
            None,
        );
        return Ok(
            "Certificado instalado. Cerrá el navegador del POS por completo y volvé a abrirlo.".into(),
        );
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("install_wss_trust_certificate no está disponible en esta plataforma.".into())
    }
}

#[tauri::command]
async fn open_agent_logs_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("logs") {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    let url = WebviewUrl::App("/?view=logs".into());
    WebviewWindowBuilder::new(&app, "logs", url)
        .title("KaiPrinters — Registro y errores")
        .inner_size(480.0, 520.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn set_printer_mapping(
    state: tauri::State<'_, Arc<AppState>>,
    purpose: String,
    printer_name: String,
) -> Result<(), String> {
    if purpose.is_empty() {
        return Err("purpose_required".into());
    }
    if printer_name.trim().is_empty() {
        state
            .db
            .clear_mapping(&purpose)
            .map_err(|e| e.to_string())?;
    } else {
        state
            .db
            .set_mapping(&purpose, printer_name.trim())
            .map_err(|e| e.to_string())?;
    }
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command]
fn set_service_settings(
    state: tauri::State<'_, Arc<AppState>>,
    patch: ServiceSettingsPatch,
) -> Result<(), String> {
    if let Some(v) = patch.listen_port {
        state
            .db
            .set_setting("listen_port", &v.to_string())
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.wss_listen_port {
        state
            .db
            .set_setting("wss_listen_port", &v.to_string())
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.wss_enabled {
        state
            .db
            .set_setting("wss_enabled", if v { "true" } else { "false" })
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.agent_display_name {
        let t = v.trim();
        if t.is_empty() {
            return Err("agent_display_name_required".into());
        }
        state
            .db
            .set_setting("agent_display_name", t)
            .map_err(|e| e.to_string())?;
    }
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn probe_ticket_network_printer(
    state: tauri::State<'_, Arc<AppState>>,
    ticket_network_host: String,
) -> Result<String, String> {
    let host = ticket_network_host.trim().to_string();
    if host.is_empty() {
        return Err("Indicá la dirección IP de la impresora.".into());
    }
    let entry = crate::reachability::evaluate_network_host(&host);
    let rows = state.db.list_mapping_lines().map_err(|e| e.to_string())?;
    for row in &rows {
        if row
            .get("ticketNetworkHost")
            .and_then(|v| v.as_str())
            .map(str::trim)
            != Some(host.as_str())
        {
            continue;
        }
        if let Some(id) = row.get("id").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()) {
            state.reachability.set(id, entry.clone());
        }
    }
    if entry.status != crate::reachability::LINE_STATUS_ONLINE {
        notify_printer_health_and_config(&state);
        return Err(
            entry
                .reason
                .unwrap_or_else(|| "No se pudo conectar por TCP (puerto 9100).".into()),
        );
    }
    notify_printer_health_and_config(&state);
    Ok("Conexión TCP correcta.".into())
}

#[tauri::command(rename_all = "camelCase")]
fn queue_test_cut_print(
    state: tauri::State<'_, Arc<AppState>>,
    system_printer_name: Option<String>,
    ticket_network_host: Option<String>,
) -> Result<String, String> {
    let net = ticket_network_host
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from);
    let target_sp = if net.is_some() {
        None
    } else {
        system_printer_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .or_else(|| {
                state.db.list_mapping_lines().ok().and_then(|lines| {
                    let pick = |purpose: &str| {
                        lines.iter().find(|l| {
                            l.get("purpose").and_then(|v| v.as_str()) == Some(purpose)
                                && l.get("systemPrinterName")
                                    .and_then(|v| v.as_str())
                                    .map(str::trim)
                                    .filter(|s| !s.is_empty())
                                    .is_some()
                        })
                    };
                    pick("tickets")
                        .or_else(|| pick("labels"))
                        .or_else(|| {
                            lines.iter().find(|l| {
                                l.get("systemPrinterName")
                                    .and_then(|v| v.as_str())
                                    .map(str::trim)
                                    .filter(|s| !s.is_empty())
                                    .is_some()
                            })
                        })
                        .and_then(|l| {
                            l.get("systemPrinterName")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                        })
                })
            })
    };
    if target_sp.is_none() && net.is_none() {
        return Err(
            "Configurá una impresora del sistema o una IP en red antes de probar el corte."
                .to_string(),
        );
    }

    let path = jobs::write_cut_test_path(&state.temp_dir, true).map_err(|e| e.to_string())?;
    let filename = "cut_test.escpos";
    let format_label = "ESC/POS RAW";
    let dest = net
        .as_deref()
        .map(|h| format!("red {h}"))
        .or_else(|| target_sp.as_ref().map(|p| format!("«{p}»")))
        .unwrap_or_default();
    state.agent_log.push_info(format!(
        "Prueba de corte encolada ({format_label}) → {dest}"
    ));
    let id = uuid::Uuid::new_v4().to_string();
    state
        .db
        .insert_job(
            &id,
            Some("tickets"),
            filename,
            path.to_string_lossy().as_ref(),
            1,
            Some("local_ui"),
            0,
            Some("test_cut"),
            None,
            None,
            target_sp.as_deref(),
            net.as_deref(),
            None,
            None,
        )
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(id)
}

#[tauri::command(rename_all = "camelCase")]
fn queue_test_drawer_print(
    state: tauri::State<'_, Arc<AppState>>,
    system_printer_name: Option<String>,
    ticket_network_host: Option<String>,
) -> Result<String, String> {
    let net = ticket_network_host
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from);
    let target_sp = if net.is_some() {
        None
    } else {
        system_printer_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
    };
    if target_sp.is_none() && net.is_none() {
        return Err(
            "Configurá una impresora del sistema o una IP en red antes de probar la gaveta."
                .to_string(),
        );
    }

    let path = jobs::write_drawer_test_path(&state.temp_dir).map_err(|e| e.to_string())?;
    let dest = net
        .as_deref()
        .map(|h| format!("red {h}"))
        .or_else(|| target_sp.as_ref().map(|p| format!("«{p}»")))
        .unwrap_or_default();
    state.agent_log.push_info(format!(
        "Prueba de gaveta encolada (ESC/POS) → {dest}"
    ));
    let id = uuid::Uuid::new_v4().to_string();
    state
        .db
        .insert_job(
            &id,
            Some("tickets"),
            "drawer_test.escpos",
            path.to_string_lossy().as_ref(),
            1,
            Some("local_ui"),
            0,
            Some("test_drawer"),
            None,
            None,
            target_sp.as_deref(),
            net.as_deref(),
            None,
            None,
        )
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(id)
}

#[tauri::command(rename_all = "camelCase")]
fn queue_escpos_qa_print(
    state: tauri::State<'_, Arc<AppState>>,
    system_printer_name: Option<String>,
    ticket_network_host: Option<String>,
    purpose: Option<String>,
    include_logo: Option<bool>,
    include_cut: Option<bool>,
) -> Result<String, String> {
    let purpose = purpose
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("tickets");
    let include_logo = include_logo.unwrap_or(false);
    let logo_base64 = if include_logo {
        ticket_logos::global_logo_base64_or_none(&state.data_dir, &state.db)
    } else {
        None
    };
    if purpose != "tickets" {
        return Err(
            "La prueba ESC/POS QA solo aplica a líneas con propósito «Tickets».".to_string(),
        );
    }
    let net = ticket_network_host
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from);
    let target_sp = if net.is_some() {
        None
    } else {
        system_printer_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
    };
    if target_sp.is_none() && net.is_none() {
        return Err(
            "Seleccioná una impresora del sistema o ingresá la IP en red en la línea.".to_string(),
        );
    }
    let printer_label = net
        .as_deref()
        .map(|h| format!("red:{h}"))
        .or_else(|| target_sp.clone())
        .unwrap_or_default();
    let include_cut = include_cut.unwrap_or(true);
    let agent_label = state.db.agent_display_name();
    let (path, bytes) = jobs::write_escpos_qa_path(
        &state.temp_dir,
        &agent_label,
        &printer_label,
        include_cut,
        include_logo,
        logo_base64.as_deref(),
    )
    .map_err(|e| e.to_string())?;
    let logo_note = if !include_logo {
        "sin logo"
    } else if logo_base64.is_some() {
        "logo global"
    } else {
        "logo Kai"
    };
    state.agent_log.push_info(format!(
        "QA ESC/POS encolada: {bytes} bytes → {printer_label} ({logo_note}, corte={include_cut})"
    ));
    let document_type = if include_cut {
        "test_escpos_qa"
    } else {
        "test_escpos_qa_nocut"
    };
    let id = uuid::Uuid::new_v4().to_string();
    state
        .db
        .insert_job(
            &id,
            Some(purpose),
            "escpos_qa.escpos",
            path.to_string_lossy().as_ref(),
            1,
            Some("local_ui"),
            0,
            Some(document_type),
            None,
            None,
            target_sp.as_deref(),
            net.as_deref(),
            None,
            None,
        )
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(id)
}

#[tauri::command(rename_all = "camelCase")]
fn queue_test_print(
    state: tauri::State<'_, Arc<AppState>>,
    purpose: Option<String>,
    system_printer_name: Option<String>,
) -> Result<String, String> {
    let purpose = purpose
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("documents");
    let target_sp = system_printer_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let agent_label = state.db.agent_display_name();
    let use_escpos = purpose == "tickets";
    let path =
        jobs::write_test_print_path(&state.temp_dir, purpose, &agent_label, use_escpos)
            .map_err(|e| e.to_string())?;
    let filename = if use_escpos {
        "test_print.escpos"
    } else {
        "test_print.pdf"
    };
    let format_label = if use_escpos {
        "ESC/POS RAW"
    } else if purpose == "tickets" {
        "PDF ticket"
    } else {
        "PDF documento"
    };
    let printer_note = target_sp
        .map(|p| format!("«{p}»"))
        .unwrap_or_else(|| "(primera cola del propósito)".to_string());
    state.agent_log.push_info(format!(
        "Prueba de impresión encolada ({format_label}, {purpose}) → {printer_note}"
    ));
    let id = uuid::Uuid::new_v4().to_string();
    state
        .db
        .insert_job(
            &id,
            Some(purpose),
            filename,
            path.to_string_lossy().as_ref(),
            1,
            Some("local_ui"),
            0,
            Some("test_print"),
            None,
            None,
            target_sp,
            None,
            None,
            None,
        )
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(id)
}

#[tauri::command(rename_all = "snake_case")]
fn cancel_print_job(state: tauri::State<'_, Arc<AppState>>, job_id: String) -> Result<bool, String> {
    let ok = state
        .db
        .dismiss_queue_job(&job_id)
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(ok)
}

#[tauri::command(rename_all = "snake_case")]
fn cancel_all_print_jobs(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state
        .db
        .dismiss_all_queue_jobs()
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalTicketLogoPickResult {
    ticket_logo_path: String,
    display_name: String,
}

#[tauri::command(rename_all = "camelCase")]
async fn pick_and_store_global_ticket_logo(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<GlobalTicketLogoPickResult, String> {
    let picked = tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("Imagen PNG/JPEG", &["png", "jpg", "jpeg"])
            .pick_file()
    })
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "cancelled".to_string())?;

    let display_name = picked
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("logo")
        .to_string();

    let data_dir = state.data_dir.clone();
    let rel = tauri::async_runtime::spawn_blocking(move || {
        ticket_logos::import_global_logo(&data_dir, &picked)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    state
        .db
        .set_global_ticket_logo_path(&rel)
        .map_err(|e| e.to_string())?;

    Ok(GlobalTicketLogoPickResult {
        ticket_logo_path: rel,
        display_name,
    })
}

#[tauri::command(rename_all = "camelCase")]
fn clear_global_ticket_logo(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    ticket_logos::clear_global_logo_files(&state.data_dir);
    state
        .db
        .clear_global_ticket_logo_path()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_mapping_lines(
    state: tauri::State<'_, Arc<AppState>>,
    lines: Vec<serde_json::Value>,
) -> Result<(), String> {
    state
        .db
        .replace_all_mapping_lines(&lines)
        .map_err(|e| e.to_string())?;
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command]
fn upsert_mapping_line(
    state: tauri::State<'_, Arc<AppState>>,
    line: serde_json::Value,
) -> Result<(), String> {
    state
        .db
        .upsert_mapping_line(&line)
        .map_err(|e| e.to_string())?;
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
fn delete_mapping_line(
    state: tauri::State<'_, Arc<AppState>>,
    line_id: String,
) -> Result<bool, String> {
    let id = line_id.trim();
    if id.is_empty() {
        return Err("line_id_required".into());
    }
    let removed = state
        .db
        .delete_mapping_line(id)
        .map_err(|e| e.to_string())?;
    if removed {
        notify_printer_health_and_config(&state);
    }
    Ok(removed)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_rustls_crypto_provider();
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                tracing::info!("cierre de ventana principal: ocultar (el servicio sigue en segundo plano)");
                let _ = window.hide();
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("app_data_dir: {e}"))?;
            let agent_log = agent_log::AgentLog::new();
            print_diag::init(agent_log.clone());
            init_tracing(agent_log.clone()).map_err(|e| format!("tracing: {e}"))?;

            let db = Arc::new(db::Db::open(&data_dir).map_err(|e| format!("db: {e}"))?);
            security::ensure_defaults(&db).map_err(|e| format!("defaults: {e}"))?;

            let temp_dir = data_dir.join("temp_print");
            #[cfg(target_os = "windows")]
            {
                use tauri::path::BaseDirectory;
                let mut bundled = app
                    .path()
                    .resolve("bin/SumatraPDF.exe", BaseDirectory::Resource)
                    .ok()
                    .filter(|p| p.is_file());
                if bundled.is_none() {
                    if let Ok(exe) = std::env::current_exe() {
                        if let Some(dir) = exe.parent() {
                            let sibling = dir.join("SumatraPDF.exe");
                            if sibling.is_file() {
                                bundled = Some(sibling);
                            }
                        }
                    }
                }
                platform::set_bundled_sumatra_path(bundled);
            }
            let state = AppState::new(db.clone(), temp_dir, data_dir.clone(), agent_log.clone());
            let st_worker = state.clone();
            let st_health = state.clone();

            port_release::terminate_stale_agent_if_ports_busy(db.as_ref());

            spawn_ws_listener(&state).map_err(|e| format!("ws: {e}"))?;
            if let Err(e) = spawn_wss_listener_if_enabled(&state) {
                tracing::warn!("wss no iniciado: {e}");
            }

            jobs::spawn_worker(st_worker);
            spawn_printer_health_tick(st_health);
            spawn_dashboard_ui_events(handle.clone(), state.clone());

            let app_emit = handle.clone();
            agent_log.set_notify(Arc::new(move || {
                let _ = app_emit.emit("agent-log-update", ());
            }));

            app.manage(state);

            let open = MenuItem::with_id(&handle, "open", "Abrir ventana", true, None::<&str>)
                .map_err(|e| format!("menu open: {e}"))?;
            let quit = MenuItem::with_id(&handle, "quit", "Salir", true, None::<&str>)
                .map_err(|e| format!("menu quit: {e}"))?;
            let menu = Menu::with_items(&handle, &[&open, &quit]).map_err(|e| format!("menu: {e}"))?;

            let mut tray = TrayIconBuilder::with_id("print_tray")
                .menu(&menu)
                .tooltip("KaiPrinters")
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    if event.id == "open" {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    } else if event.id == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state,
                        ..
                    } = event
                    {
                        use tauri::tray::MouseButtonState;
                        if button_state == MouseButtonState::Up {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                });

            if let Some(icon) = load_tray_icon() {
                tray = tray.icon(icon);
                #[cfg(target_os = "macos")]
                {
                    // Icono a color (yin-yang); no usar template o macOS lo aplana a un solo tono.
                    tray = tray.icon_as_template(false);
                }
            }

            tray.build(&handle).map_err(|e| format!("tray: {e}"))?;

            #[cfg(target_os = "macos")]
            {
                let version = env!("CARGO_PKG_VERSION");
                let about = PredefinedMenuItem::about(
                    &handle,
                    None,
                    Some(AboutMetadata {
                        name: Some("KaiPrinters".into()),
                        version: Some(version.into()),
                        authors: Some(vec!["Felipe Chandía Castillo".into()]),
                        ..Default::default()
                    }),
                )
                .map_err(|e| format!("about menu: {e}"))?;
                let hide = PredefinedMenuItem::hide(&handle, None).map_err(|e| format!("hide: {e}"))?;
                let hide_others = PredefinedMenuItem::hide_others(&handle, None)
                    .map_err(|e| format!("hide_others: {e}"))?;
                let quit =
                    PredefinedMenuItem::quit(&handle, None).map_err(|e| format!("quit menu: {e}"))?;
                let sep1 =
                    PredefinedMenuItem::separator(&handle).map_err(|e| format!("sep: {e}"))?;
                let sep2 =
                    PredefinedMenuItem::separator(&handle).map_err(|e| format!("sep: {e}"))?;
                let app_menu = Submenu::with_items(
                    &handle,
                    "KaiPrinters",
                    true,
                    &[&about, &sep1, &hide, &hide_others, &sep2, &quit],
                )
                .map_err(|e| format!("app menu: {e}"))?;
                let menu = Menu::with_items(&handle, &[&app_menu]).map_err(|e| format!("menu: {e}"))?;
                app.set_menu(menu).map_err(|e| format!("set_menu: {e}"))?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_listen_port,
            get_wss_listen_port,
            get_metrics,
            get_dashboard,
            set_printer_mapping,
            pick_and_store_global_ticket_logo,
            clear_global_ticket_logo,
            set_mapping_lines,
            upsert_mapping_line,
            delete_mapping_line,
            set_service_settings,
            queue_test_print,
            queue_escpos_qa_print,
            queue_test_cut_print,
            queue_test_drawer_print,
            probe_ticket_network_printer,
            cancel_print_job,
            cancel_all_print_jobs,
            get_agent_logs,
            clear_agent_logs,
            get_wss_certificate_path,
            open_app_data_dir,
            install_wss_trust_certificate,
            refresh_sumatra_status,
            open_agent_logs_window,
            stop_print_network,
            start_print_network,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
