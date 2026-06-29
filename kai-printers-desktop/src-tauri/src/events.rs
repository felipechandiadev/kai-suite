//! Build `printer_health` / `service_status` payloads (guide §5.6 / §7).

use crate::db::Db;
use crate::platform::{self, PrinterInfo};
use crate::reachability::{self, LineReachEntry, ReachabilityCache, LINE_STATUS_OFFLINE};
use anyhow::Result;
use serde_json::{json, Value};

const PURPOSES: &[&str] = &["documents", "tickets", "labels"];

pub fn service_status_payload(connected_clients: usize, sessions: Vec<Value>) -> Value {
    json!({
        "status": "ready",
        "connectedClients": connected_clients,
        "sessions": sessions,
    })
}

fn line_entry_status(cache: &ReachabilityCache, line_id: &str, row: &Value, system: &[PrinterInfo]) -> LineReachEntry {
    if let Some(e) = cache.get(line_id) {
        return e;
    }
    reachability::evaluate_mapping_line(row, system)
}

fn purpose_has_online_line(
    cache: &ReachabilityCache,
    rows: &[Value],
    purpose: &str,
    system: &[PrinterInfo],
) -> bool {
    for row in rows {
        if row.get("purpose").and_then(|v| v.as_str()) != Some(purpose) {
            continue;
        }
        let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
        if id.is_empty() {
            continue;
        }
        if reachability::is_online(&line_entry_status(cache, id, row, system)) {
            return true;
        }
    }
    false
}

/// Failover: al menos una línea online (probe) => ok.
pub fn printer_health(
    db: &Db,
    system: &[PrinterInfo],
    required: &[String],
    cache: &ReachabilityCache,
) -> Value {
    let rows = db.list_mapping_lines().unwrap_or_default();
    let mut purposes_obj = serde_json::Map::new();
    let mut overall = "ok";

    for p in PURPOSES {
        let purpose = *p;
        let purpose_rows: Vec<&Value> = rows
            .iter()
            .filter(|r| r.get("purpose").and_then(|v| v.as_str()) == Some(purpose))
            .collect();

        let printer_names: Vec<String> = purpose_rows
            .iter()
            .filter_map(|r| {
                r.get("systemPrinterName")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(String::from)
            })
            .collect();

        let network_hosts: Vec<String> = purpose_rows
            .iter()
            .filter(|r| {
                r.get("ticketPrinterType")
                    .and_then(|v| v.as_str())
                    .map(|t| t.eq_ignore_ascii_case("network"))
                    .unwrap_or(false)
            })
            .filter_map(|r| {
                r.get("ticketNetworkHost")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(String::from)
            })
            .collect();

        let any_online = purpose_has_online_line(cache, &rows, purpose, system);
        let has_mapping = !printer_names.is_empty() || !network_hosts.is_empty();

        let (status, printer_name, reason, names_json) = if !has_mapping {
            if required.iter().any(|r| r == purpose) {
                overall = "degraded";
            }
            (
                "unmapped",
                Value::Null,
                Value::Null,
                Value::Array(vec![]),
            )
        } else if any_online {
            let primary = network_hosts
                .first()
                .cloned()
                .or_else(|| printer_names.first().cloned());
            let mut names_arr: Vec<Value> = printer_names.iter().map(|s| json!(s)).collect();
            for h in &network_hosts {
                names_arr.push(json!(format!("red:{h}")));
            }
            (
                "ok",
                json!(primary),
                Value::Null,
                Value::Array(names_arr),
            )
        } else {
            if required.iter().any(|r| r == purpose) {
                overall = "degraded";
            }
            let primary = network_hosts
                .first()
                .cloned()
                .or_else(|| printer_names.first().cloned());
            let offline_reason = purpose_rows
                .iter()
                .filter_map(|r| {
                    let id = r.get("id").and_then(|v| v.as_str())?;
                    let e = line_entry_status(cache, id, r, system);
                    e.reason.clone()
                })
                .next()
                .unwrap_or_else(|| "OFFLINE".into());
            let mut names_arr: Vec<Value> = printer_names.iter().map(|s| json!(s)).collect();
            for h in &network_hosts {
                names_arr.push(json!(format!("red:{h}")));
            }
            (
                "offline",
                json!(primary),
                json!(offline_reason),
                Value::Array(names_arr),
            )
        };

        let mut o = serde_json::Map::new();
        o.insert("status".into(), json!(status));
        if !printer_name.is_null() {
            o.insert("printerName".into(), printer_name);
        }
        if !reason.is_null() {
            o.insert("reason".into(), reason);
        }
        o.insert("printerNames".into(), names_json);
        purposes_obj.insert(purpose.to_string(), Value::Object(o));
    }

    let message = if overall != "ok" {
        "Al menos un propósito de impresión requiere atención."
    } else {
        "Impresoras operativas."
    };

    let lines = mapping_lines_health(&rows, system, cache);
    let paper_profile_by_alias = db
        .paper_profile_by_alias_json()
        .unwrap_or_else(|_| json!({}));

    json!({
        "overall": overall,
        "purposes": Value::Object(purposes_obj),
        "lines": lines,
        "paperProfileByAlias": paper_profile_by_alias,
        "message": message,
    })
}

/// Estado por línea de mapeo (resultado de reachability).
pub fn mapping_lines_health(
    rows: &[Value],
    system: &[PrinterInfo],
    cache: &ReachabilityCache,
) -> Vec<Value> {
    rows.iter()
        .map(|row| {
            let id = row
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let entry = if id.is_empty() {
                reachability::evaluate_mapping_line(row, system)
            } else {
                line_entry_status(cache, &id, row, system)
            };
            let status = reachability::line_status_string(&entry);
            let system_printer_name = row
                .get("systemPrinterName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let network_host = row
                .get("ticketNetworkHost")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let mut o = serde_json::json!({
                "id": row.get("id").cloned().unwrap_or(Value::Null),
                "displayLabel": row.get("displayLabel").cloned().unwrap_or(Value::Null),
                "purpose": row.get("purpose").cloned().unwrap_or(Value::Null),
                "systemPrinterName": if system_printer_name.is_empty() { Value::Null } else { json!(system_printer_name) },
                "ticketPrinterType": row.get("ticketPrinterType").cloned().unwrap_or(Value::Null),
                "ticketNetworkHost": if network_host.is_empty() { Value::Null } else { json!(network_host) },
                "paperProfile": row.get("paperProfile").cloned().unwrap_or(Value::Null),
                "status": status,
            });
            if status == LINE_STATUS_OFFLINE {
                if let Some(r) = entry.reason {
                    if let Some(obj) = o.as_object_mut() {
                        obj.insert("reason".into(), json!(r));
                    }
                }
            }
            o
        })
        .collect()
}

/// Evento `printer_health` reutilizando la lista de impresoras ya obtenida.
pub fn printer_health_event_json(
    db: &Db,
    system: &[PrinterInfo],
    required: &[String],
    cache: &ReachabilityCache,
) -> Value {
    json!({
        "version": crate::protocol::PROTOCOL_VERSION,
        "event": "printer_health",
        "payload": printer_health(db, system, required, cache),
    })
}

pub fn emit_printer_health_json(
    db: &Db,
    required: &[String],
    cache: &ReachabilityCache,
) -> Result<Value> {
    let sys = platform::list_system_printers().unwrap_or_default();
    reachability::refresh_all_lines(db, &sys, cache, true)?;
    Ok(printer_health_event_json(db, &sys, required, cache))
}
