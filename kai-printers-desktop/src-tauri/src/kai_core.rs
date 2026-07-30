//! Emparejamiento opcional con Kai Core (catálogo/presencia). Print sigue en LAN.

use crate::db::Db;
use crate::state::AppState;
use serde_json::json;
use std::net::UdpSocket;
use std::sync::Arc;

const SETTING_BASE_URL: &str = "kai_core_base_url";
const SETTING_TOKEN: &str = "kai_core_agent_token";
const SETTING_AGENT_ID: &str = "kai_core_agent_id";

pub fn primary_lan_ipv4() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let ip = socket.local_addr().ok()?.ip();
    if ip.is_loopback() || ip.is_unspecified() {
        return None;
    }
    Some(ip.to_string())
}

pub fn kai_core_status_json(db: &Db) -> serde_json::Value {
    let base = db
        .get_setting(SETTING_BASE_URL)
        .ok()
        .flatten()
        .unwrap_or_default();
    let token = db
        .get_setting(SETTING_TOKEN)
        .ok()
        .flatten()
        .unwrap_or_default();
    let agent_id = db
        .get_setting(SETTING_AGENT_ID)
        .ok()
        .flatten()
        .unwrap_or_default();
    json!({
        "baseUrl": base,
        "agentId": agent_id,
        "paired": !token.trim().is_empty(),
        "lanHost": primary_lan_ipv4(),
        "wsPort": db.listen_port(),
        "wssPort": db.wss_listen_port(),
        "useTls": db.get_setting("wss_enabled").ok().flatten().as_deref() != Some("false"),
        "displayName": db.agent_display_name(),
        "token": if token.trim().is_empty() { serde_json::Value::Null } else { json!(token) },
    })
}

pub fn set_base_url(db: &Db, url: &str) -> Result<(), String> {
    let t = url.trim().trim_end_matches('/');
    db.set_setting(SETTING_BASE_URL, t)
        .map_err(|e| e.to_string())
}

pub fn set_paired(db: &Db, agent_id: &str, token: &str) -> Result<(), String> {
    let id = agent_id.trim();
    let tok = token.trim().to_lowercase();
    if id.is_empty() || tok.len() < 32 {
        return Err("credenciales de emparejamiento inválidas".into());
    }
    db.set_setting(SETTING_AGENT_ID, id)
        .map_err(|e| e.to_string())?;
    db.set_setting(SETTING_TOKEN, &tok)
        .map_err(|e| e.to_string())
}

pub fn clear_paired(db: &Db) -> Result<(), String> {
    let _ = db.set_setting(SETTING_TOKEN, "");
    let _ = db.set_setting(SETTING_AGENT_ID, "");
    Ok(())
}

/// Body + headers for the webview to POST heartbeat (evita dependencia HTTP en Rust).
pub fn heartbeat_request_parts(state: &Arc<AppState>) -> Result<serde_json::Value, String> {
    let db = &state.db;
    let base = db
        .get_setting(SETTING_BASE_URL)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let token = db
        .get_setting(SETTING_TOKEN)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    if base.trim().is_empty() || token.trim().is_empty() {
        return Err("kai_core_not_paired".into());
    }
    let lan = primary_lan_ipv4().unwrap_or_else(|| "127.0.0.1".into());
    let wss_on = db
        .get_setting("wss_enabled")
        .map_err(|e| e.to_string())?
        .as_deref()
        != Some("false");
    Ok(json!({
        "url": format!("{}/api/print-agents/heartbeat", base.trim().trim_end_matches('/')),
        "token": token,
        "body": {
            "displayName": db.agent_display_name(),
            "lanHost": lan,
            "wsPort": db.listen_port(),
            "wssPort": db.wss_listen_port(),
            "useTls": wss_on,
            "platform": "desktop",
        }
    }))
}

pub fn pair_request_parts(db: &Db, pairing_token: &str) -> Result<serde_json::Value, String> {
    let base = db
        .get_setting(SETTING_BASE_URL)
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    if base.trim().is_empty() {
        return Err("Configurá la URL de Kai Core".into());
    }
    let tok = pairing_token.trim().to_lowercase();
    if tok.len() < 32 {
        return Err("Token de emparejamiento inválido".into());
    }
    Ok(json!({
        "url": format!("{}/api/print-agents/pair", base.trim().trim_end_matches('/')),
        "body": { "pairingToken": tok }
    }))
}
