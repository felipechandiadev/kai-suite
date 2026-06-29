//! Registro en memoria (WARN/ERROR) para la UI de diagnóstico.

use chrono::Utc;
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::fmt;
use std::sync::Arc;
use tracing::field::{Field, Visit};
use tracing::Level;
use tracing_subscriber::layer::Context;
use tracing_subscriber::Layer;

const MAX_ENTRIES: usize = 300;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentLogEntry {
    pub id: String,
    pub at: String,
    pub level: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}

pub struct AgentLog {
    entries: Mutex<VecDeque<AgentLogEntry>>,
    on_push: Mutex<Option<Arc<dyn Fn() + Send + Sync>>>,
}

impl AgentLog {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            entries: Mutex::new(VecDeque::new()),
            on_push: Mutex::new(None),
        })
    }

    pub fn set_notify(&self, f: Arc<dyn Fn() + Send + Sync>) {
        *self.on_push.lock() = Some(f);
    }

    pub fn push(&self, level: &str, message: impl Into<String>, target: Option<&str>) {
        let msg = message.into().trim().to_string();
        if msg.is_empty() {
            return;
        }
        let entry = AgentLogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            at: Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: msg,
            target: target.map(String::from),
        };
        let mut q = self.entries.lock();
        q.push_front(entry);
        while q.len() > MAX_ENTRIES {
            q.pop_back();
        }
        drop(q);
        if let Some(cb) = self.on_push.lock().as_ref() {
            cb();
        }
    }

    pub fn push_error(&self, message: impl Into<String>) {
        self.push("error", message, None);
    }

    pub fn push_warn(&self, message: impl Into<String>) {
        self.push("warn", message, None);
    }

    pub fn push_info(&self, message: impl Into<String>) {
        self.push("info", message, None);
    }

    pub fn list(&self) -> Vec<AgentLogEntry> {
        self.entries.lock().iter().cloned().collect()
    }

    pub fn clear(&self) {
        self.entries.lock().clear();
        if let Some(cb) = self.on_push.lock().as_ref() {
            cb();
        }
    }
}

struct FieldVisitor {
    parts: Vec<String>,
}

impl FieldVisitor {
    fn new() -> Self {
        Self { parts: Vec::new() }
    }

    fn into_message(self, fallback: &str) -> String {
        if self.parts.is_empty() {
            fallback.to_string()
        } else {
            self.parts.join(" ")
        }
    }
}

impl Visit for FieldVisitor {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        if field.name() == "message" {
            self.parts.push(format!("{value:?}").trim_matches('"').to_string());
        } else {
            self.parts
                .push(format!("{}={value:?}", field.name()));
        }
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.parts.push(value.to_string());
        } else {
            self.parts.push(format!("{}={value}", field.name()));
        }
    }
}

pub struct AgentLogLayer {
    log: Arc<AgentLog>,
}

impl AgentLogLayer {
    pub fn new(log: Arc<AgentLog>) -> Self {
        Self { log }
    }
}

impl<S> Layer<S> for AgentLogLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: Context<'_, S>,
    ) {
        let meta = event.metadata();
        let level = *meta.level();
        if !matches!(level, Level::ERROR | Level::WARN) {
            return;
        }
        let mut visitor = FieldVisitor::new();
        event.record(&mut visitor);
        let level_str = match level {
            Level::ERROR => "error",
            Level::WARN => "warn",
            _ => return,
        };
        let message = visitor.into_message(meta.name());
        self.log
            .push(level_str, message, Some(meta.target()));
    }
}
