//! Tauri commands for Core Lite sidecar lifecycle.

use serde::Serialize;

use crate::paths;
use crate::sidecar::{ensure_core_lite, is_running, probe_health, start_core_lite, stop_core_lite};

#[derive(Serialize)]
pub struct SidecarStartResponse {
    pub port: u16,
}

#[derive(Serialize)]
pub struct SidecarStatusResponse {
    pub running: bool,
    pub port: u16,
}

#[derive(Serialize)]
pub struct SidecarHealthResponse {
    pub ok: bool,
}

fn port() -> u16 {
    std::env::var("KAI_CORE_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(4100)
}

#[tauri::command]
pub fn sidecar_start() -> Result<SidecarStartResponse, String> {
    let port = port();
    start_core_lite(port, paths::app_data_dir())?;
    Ok(SidecarStartResponse { port })
}

#[tauri::command]
pub fn sidecar_stop() -> Result<(), String> {
    stop_core_lite()
}

#[tauri::command]
pub fn sidecar_status() -> Result<SidecarStatusResponse, String> {
    Ok(SidecarStatusResponse {
        running: is_running(),
        port: port(),
    })
}

/// Health + auto-recovery: si Core no responde, intenta re-spawn.
#[tauri::command]
pub async fn sidecar_health() -> Result<SidecarHealthResponse, String> {
    let port = port();
    if probe_health(port).await {
        return Ok(SidecarHealthResponse { ok: true });
    }

    let app_data = paths::app_data_dir();
    let ensure = tokio::task::spawn_blocking(move || ensure_core_lite(port, app_data))
        .await
        .map_err(|e| format!("ensure sidecar: {e}"))?;

    if let Err(e) = ensure {
        tracing::warn!(error = %e, "sidecar ensure failed");
        return Ok(SidecarHealthResponse { ok: false });
    }

    Ok(SidecarHealthResponse {
        ok: probe_health(port).await,
    })
}
