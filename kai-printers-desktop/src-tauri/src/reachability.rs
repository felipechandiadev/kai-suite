//! Reachability de líneas de mapeo (TCP para red, lpstat para impresora del SO).

use crate::db::Db;
use crate::platform::{self, PrinterInfo};
use parking_lot::Mutex;
use serde_json::Value;
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const LINE_STATUS_ONLINE: &str = "online";
pub const LINE_STATUS_OFFLINE: &str = "offline";
pub const LINE_STATUS_UNKNOWN: &str = "unknown";

const SOFT_TTL: Duration = Duration::from_secs(45);
const NETWORK_PROBE_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Clone, Debug)]
pub struct LineReachEntry {
    pub status: String,
    pub reason: Option<String>,
    pub checked_at_ms: u64,
}

impl LineReachEntry {
    fn unknown() -> Self {
        Self {
            status: LINE_STATUS_UNKNOWN.into(),
            reason: None,
            checked_at_ms: now_ms(),
        }
    }
}

pub struct ReachabilityCache {
    lines: Mutex<HashMap<String, LineReachEntry>>,
}

impl ReachabilityCache {
    pub fn new() -> Self {
        Self {
            lines: Mutex::new(HashMap::new()),
        }
    }

    pub fn get(&self, line_id: &str) -> Option<LineReachEntry> {
        self.lines.lock().get(line_id).cloned()
    }

    pub fn set(&self, line_id: &str, entry: LineReachEntry) {
        if line_id.is_empty() {
            return;
        }
        self.lines.lock().insert(line_id.to_string(), entry);
    }

    pub fn mark_offline(&self, line_id: &str, reason: impl Into<String>) {
        self.set(
            line_id,
            LineReachEntry {
                status: LINE_STATUS_OFFLINE.into(),
                reason: Some(reason.into()),
                checked_at_ms: now_ms(),
            },
        );
    }

    pub fn snapshot(&self) -> HashMap<String, LineReachEntry> {
        self.lines.lock().clone()
    }

    fn is_fresh(&self, line_id: &str, force: bool) -> bool {
        if force {
            return false;
        }
        entry_is_fresh(self.get(line_id).as_ref())
    }

    /// Entrada reciente y online (evita reprobe TCP/lpstat al imprimir).
    pub fn is_fresh_online(&self, line_id: &str) -> bool {
        let Some(entry) = self.get(line_id) else {
            return false;
        };
        is_online(&entry) && entry_is_fresh(Some(&entry))
    }
}

fn entry_is_fresh(entry: Option<&LineReachEntry>) -> bool {
    let Some(e) = entry else {
        return false;
    };
    now_ms().saturating_sub(e.checked_at_ms) < SOFT_TTL.as_millis() as u64
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn system_printer_online(system: &[PrinterInfo], name: &str) -> Option<bool> {
    system.iter().find(|p| p.name == name).map(|p| p.online)
}

/// Evalúa una fila de mapeo (`list_mapping_lines` JSON).
pub fn evaluate_mapping_line(row: &Value, system: &[PrinterInfo]) -> LineReachEntry {
    let purpose = row
        .get("purpose")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let ticket_type = row
        .get("ticketPrinterType")
        .and_then(|v| v.as_str())
        .unwrap_or("system");
    let network_host = row
        .get("ticketNetworkHost")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let system_printer_name = row
        .get("systemPrinterName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    if purpose == "tickets" && ticket_type.eq_ignore_ascii_case("network") {
        if network_host.is_empty() {
            return LineReachEntry::unknown();
        }
        return evaluate_network_host(&network_host);
    }

    if system_printer_name.is_empty() {
        return LineReachEntry::unknown();
    }

    evaluate_system_printer(&system_printer_name, system)
}

pub fn evaluate_network_host(host: &str) -> LineReachEntry {
    let host = host.trim();
    if host.is_empty() {
        return LineReachEntry::unknown();
    }
    match platform::probe_network_printer_with_timeout(host, NETWORK_PROBE_TIMEOUT) {
        Ok(()) => LineReachEntry {
            status: LINE_STATUS_ONLINE.into(),
            reason: None,
            checked_at_ms: now_ms(),
        },
        Err(e) => LineReachEntry {
            status: LINE_STATUS_OFFLINE.into(),
            reason: Some(e.to_string()),
            checked_at_ms: now_ms(),
        },
    }
}

pub fn evaluate_system_printer(name: &str, system: &[PrinterInfo]) -> LineReachEntry {
    let name = name.trim();
    if name.is_empty() {
        return LineReachEntry::unknown();
    }
    let names: std::collections::HashSet<String> = system.iter().map(|p| p.name.clone()).collect();
    if !names.contains(name) {
        return LineReachEntry {
            status: LINE_STATUS_OFFLINE.into(),
            reason: Some("DEVICE_NOT_FOUND".into()),
            checked_at_ms: now_ms(),
        };
    }
    match system_printer_online(system, name) {
        None => LineReachEntry {
            status: LINE_STATUS_OFFLINE.into(),
            reason: Some("OFFLINE".into()),
            checked_at_ms: now_ms(),
        },
        Some(true) => LineReachEntry {
            status: LINE_STATUS_ONLINE.into(),
            reason: None,
            checked_at_ms: now_ms(),
        },
        Some(false) => LineReachEntry {
            status: LINE_STATUS_OFFLINE.into(),
            reason: Some("OFFLINE".into()),
            checked_at_ms: now_ms(),
        },
    }
}

/// Refresca todas las líneas; respeta TTL salvo `force`.
pub fn refresh_all_lines(
    db: &Db,
    system: &[PrinterInfo],
    cache: &ReachabilityCache,
    force: bool,
) -> anyhow::Result<()> {
    let rows = db.list_mapping_lines()?;
    for row in &rows {
        let id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if id.is_empty() {
            continue;
        }
        if cache.is_fresh(&id, force) {
            continue;
        }
        let entry = evaluate_mapping_line(row, system);
        cache.set(&id, entry);
    }
    Ok(())
}

/// Refresca solo la línea indicada (p. ej. probe manual de red).
pub fn refresh_line_id(
    db: &Db,
    system: &[PrinterInfo],
    cache: &ReachabilityCache,
    line_id: &str,
) -> anyhow::Result<Option<LineReachEntry>> {
    let rows = db.list_mapping_lines()?;
    let Some(row) = rows.iter().find(|r| {
        r.get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim() == line_id.trim())
            .unwrap_or(false)
    }) else {
        return Ok(None);
    };
    let entry = evaluate_mapping_line(row, system);
    cache.set(line_id, entry.clone());
    Ok(Some(entry))
}

/// Refresca la línea que usaría un trabajo (por destino explícito o primera del propósito).
pub fn refresh_for_print_target(
    db: &Db,
    system: &[PrinterInfo],
    cache: &ReachabilityCache,
    purpose: &str,
    system_printer: Option<&str>,
    network_host: Option<&str>,
) -> anyhow::Result<Option<String>> {
    if let Some(host) = network_host.map(str::trim).filter(|s| !s.is_empty()) {
        let rows = db.list_mapping_lines()?;
        if let Some(row) = rows.iter().find(|r| {
            r.get("purpose").and_then(|v| v.as_str()) == Some(purpose)
                && r.get("ticketPrinterType")
                    .and_then(|v| v.as_str())
                    .map(|t| t.eq_ignore_ascii_case("network"))
                    .unwrap_or(false)
                && r.get("ticketNetworkHost")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    == Some(host)
        }) {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                if cache.is_fresh_online(id) {
                    return Ok(Some(id.to_string()));
                }
                let entry = evaluate_mapping_line(row, system);
                cache.set(id, entry);
                return Ok(Some(id.to_string()));
            }
        }
        let synthetic = format!("net:{host}");
        if cache.is_fresh_online(&synthetic) {
            return Ok(Some(synthetic));
        }
        let entry = evaluate_network_host(host);
        cache.set(&synthetic, entry);
        return Ok(Some(synthetic));
    }
    if let Some(pr) = system_printer.map(str::trim).filter(|s| !s.is_empty()) {
        let rows = db.list_mapping_lines()?;
        if let Some(row) = rows.iter().find(|r| {
            r.get("purpose").and_then(|v| v.as_str()) == Some(purpose)
                && r.get("systemPrinterName")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    == Some(pr)
        }) {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                if cache.is_fresh_online(id) {
                    return Ok(Some(id.to_string()));
                }
                let entry = evaluate_mapping_line(row, system);
                cache.set(id, entry);
                return Ok(Some(id.to_string()));
            }
        }
    }
    if let Some(t) = db.default_print_target_for_purpose(purpose)? {
        let rows = db.list_mapping_lines()?;
        if let Some(row) = rows.iter().find(|r| {
            r.get("id").and_then(|v| v.as_str()).is_some()
                && match (
                    t.network_host.as_deref(),
                    t.system_printer.as_deref(),
                ) {
                    (Some(h), _) => r.get("ticketNetworkHost")
                        .and_then(|v| v.as_str())
                        .map(str::trim)
                        == Some(h.trim()),
                    (_, Some(p)) => r.get("systemPrinterName")
                        .and_then(|v| v.as_str())
                        .map(str::trim)
                        == Some(p.trim()),
                    _ => false,
                }
        }) {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                if cache.is_fresh_online(id) {
                    return Ok(Some(id.to_string()));
                }
                let entry = evaluate_mapping_line(row, system);
                cache.set(id, entry);
                return Ok(Some(id.to_string()));
            }
        }
    }
    Ok(None)
}

pub fn status_for_line(cache: &ReachabilityCache, line_id: &str) -> Option<LineReachEntry> {
    cache.get(line_id)
}

pub fn line_status_string(entry: &LineReachEntry) -> &'static str {
    match entry.status.as_str() {
        LINE_STATUS_ONLINE => LINE_STATUS_ONLINE,
        LINE_STATUS_OFFLINE => LINE_STATUS_OFFLINE,
        _ => LINE_STATUS_UNKNOWN,
    }
}

pub fn is_online(entry: &LineReachEntry) -> bool {
    entry.status == LINE_STATUS_ONLINE
}
