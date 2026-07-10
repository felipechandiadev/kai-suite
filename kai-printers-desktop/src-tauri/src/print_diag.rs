//! Mensajes de diagnóstico de impresión (ESC/POS / RAW) visibles en el registro de la UI.

use crate::agent_log::AgentLog;
use std::sync::{Arc, OnceLock};
use std::time::Instant;
use tokio::sync::broadcast;

static LOG: OnceLock<Arc<AgentLog>> = OnceLock::new();

pub fn init(log: Arc<AgentLog>) {
    let _ = LOG.set(log);
}

fn log(level: &str, message: impl Into<String>) {
    if let Some(l) = LOG.get() {
        l.push(level, message, Some("impresión"));
    }
}

pub fn info(message: impl Into<String>) {
    log("info", message);
}

pub fn info_elapsed(label: &str, started: Instant, detail: impl Into<String>) {
    log(
        "info",
        format!(
            "{label} {}ms {}",
            started.elapsed().as_millis(),
            detail.into()
        ),
    );
}

/// Etapa medida con ms explícitos + evento WS opcional `print_timing`.
pub fn info_stage(
    notify: Option<&broadcast::Sender<String>>,
    job_id: Option<&str>,
    stage: &str,
    ms: u128,
    detail: impl Into<String>,
) {
    let detail_s = detail.into();
    log(
        "info",
        format!("{stage} {ms}ms {detail_s}"),
    );
    if let Some(tx) = notify {
        let mut payload = serde_json::json!({
            "stage": stage,
            "ms": ms,
            "detail": detail_s,
        });
        if let Some(id) = job_id.filter(|s| !s.is_empty()) {
            payload["jobId"] = serde_json::json!(id);
        }
        #[cfg(target_os = "windows")]
        let payload = {
            if let Some(obj) = payload.as_object_mut() {
                obj.insert("os".into(), serde_json::json!("windows"));
            }
            payload
        };
        #[cfg(target_os = "macos")]
        let payload = {
            if let Some(obj) = payload.as_object_mut() {
                obj.insert("os".into(), serde_json::json!("macos"));
            }
            payload
        };
        let ev = serde_json::json!({
            "version": crate::protocol::PROTOCOL_VERSION,
            "event": "print_timing",
            "payload": payload,
        });
        let _ = tx.send(ev.to_string());
    }
}

pub fn info_elapsed_stage(
    notify: Option<&broadcast::Sender<String>>,
    job_id: Option<&str>,
    stage: &str,
    started: Instant,
    detail: impl Into<String>,
) {
    info_stage(
        notify,
        job_id,
        stage,
        started.elapsed().as_millis(),
        detail,
    );
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub fn warn(message: impl Into<String>) {
    log("warn", message);
}

pub fn error(message: impl Into<String>) {
    log("error", message);
}
