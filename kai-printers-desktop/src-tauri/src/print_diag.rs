//! Mensajes de diagnóstico de impresión (ESC/POS / RAW) visibles en el registro de la UI.

use crate::agent_log::AgentLog;
use std::sync::{Arc, OnceLock};
use std::time::Instant;

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

pub fn warn(message: impl Into<String>) {
    log("warn", message);
}

pub fn error(message: impl Into<String>) {
    log("error", message);
}
