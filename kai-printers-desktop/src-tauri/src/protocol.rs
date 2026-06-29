//! JSON protocol v2.0 — actions (client→server) and events (server→client).

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const PROTOCOL_VERSION: &str = "2.1";

#[derive(Debug, Deserialize)]
pub struct Envelope {
    pub version: Option<String>,
    #[serde(default)]
    pub request_id: Option<String>,
    pub action: Option<String>,
    /// Client→server event name (reserved; parsing uses `action` today).
    #[allow(dead_code)]
    pub event: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, Value>,
}

#[derive(Debug, Serialize)]
pub struct OutResponse {
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl OutResponse {
    pub fn ok(request_id: Option<String>, data: Value) -> Self {
        Self {
            version: PROTOCOL_VERSION.to_string(),
            request_id,
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(request_id: Option<String>, msg: impl Into<String>) -> Self {
        Self {
            version: PROTOCOL_VERSION.to_string(),
            request_id,
            ok: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

pub fn check_version(v: Option<&String>) -> Result<(), String> {
    match v.map(|s| s.as_str()) {
        None | Some("2.0") | Some("2.1") | Some("2") => Ok(()),
        Some(other) if other.starts_with("2.") => Ok(()),
        Some(other) => Err(format!("unsupported_version: {}", other)),
    }
}
