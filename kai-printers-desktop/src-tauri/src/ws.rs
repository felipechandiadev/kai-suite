//! WebSocket server (plain ws). Por defecto escucha en `0.0.0.0` (LAN + localhost). Ver README.

use crate::events;
use crate::jobs;
use crate::protocol::{self, Envelope, OutResponse};
use crate::state::{AppState, Session};
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use http::Response;
use serde_json::json;
use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;
use tokio_tungstenite::tungstenite::handshake::server::Request;
use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use tokio_tungstenite::tungstenite::protocol::CloseFrame;
use tokio_tungstenite::tungstenite::Message;

/// Debe coincidir con `PRINT_WS_CLOSE_REASON_SERVICE_STOPPED` en `packages/print-service-client/src/core.ts`.
pub const WS_CLOSE_REASON_SERVICE_STOPPED: &str = "flowstore:service_stopped";

fn service_stopped_close() -> Message {
    Message::Close(Some(CloseFrame {
        code: CloseCode::Normal,
        reason: WS_CLOSE_REASON_SERVICE_STOPPED.into(),
    }))
}

fn json_line(v: &impl serde::Serialize) -> Message {
    Message::Text(
        serde_json::to_string(v).unwrap_or_else(|_| r#"{"ok":false}"#.into()),
    )
}

fn is_vector_pos_ticket_type(print_type: &str) -> bool {
    matches!(
        print_type,
        "pos-sale-ticket"
            | "pos-quotation-ticket"
            | "pos-payment-in-ticket"
            | "pos-customer-credit-note-ticket"
            | "pos-cash-closing-ticket"
            | "pos-cash-count-sheet-ticket"
            | "pos-cash-session-opening-ticket"
            | "pos-cash-hub-movement-ticket"
            | "pos-supplier-payment-ticket"
            | "pos-bank-account-ticket"
            | "pos-dining-account-ticket"
            | "pos-kitchen-ticket"
            | "pos-laundry-reception-ticket"
            | "pos-presale-ticket"
            | "fiscal-boleta-preview"
            | "variant-barcode-label"
    )
}

fn vector_ticket_folio(print_type: &str, ticket: &serde_json::Value) -> String {
    match print_type {
        "pos-quotation-ticket" | "pos-payment-in-ticket" => ticket
            .get("documentNumber")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-customer-credit-note-ticket" => ticket
            .get("creditNoteFolio")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-cash-closing-ticket"
        | "pos-cash-count-sheet-ticket" => ticket
            .get("documentNumber")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-cash-session-opening-ticket" => {
            let sid = ticket
                .get("cashSessionId")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if sid.chars().count() > 8 {
                sid.chars().take(8).collect()
            } else {
                sid.to_string()
            }
        }
        "pos-cash-hub-movement-ticket" => ticket
            .get("documentNumber")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-supplier-payment-ticket" => ticket
            .get("documentNumber")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-presale-ticket" => ticket
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "fiscal-boleta-preview" => ticket
            .get("folio")
            .map(|v| {
                if let Some(n) = v.as_i64() {
                    n.to_string()
                } else if let Some(n) = v.as_f64() {
                    (n as i64).to_string()
                } else {
                    v.as_str().unwrap_or("").to_string()
                }
            })
            .unwrap_or_default(),
        "variant-barcode-label" => ticket
            .get("barcode")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        "pos-bank-account-ticket" => ticket
            .get("accountKey")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().to_string())
            .or_else(|| {
                ticket
                    .get("accountNumber")
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
            })
            .unwrap_or_default(),
        "pos-dining-account-ticket" => ticket
            .get("account")
            .and_then(|a| a.get("displayLabel"))
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .or_else(|| {
                ticket
                    .get("account")
                    .and_then(|a| a.get("tableCode"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
            })
            .unwrap_or_default(),
        "pos-kitchen-ticket" => ticket
            .get("fireNumber")
            .and_then(|v| v.as_i64())
            .map(|n| format!("pedido-{n}"))
            .or_else(|| {
                ticket
                    .get("accountLabel")
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
            })
            .unwrap_or_default(),
        "pos-laundry-reception-ticket" => ticket
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        _ => ticket
            .get("folio")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
    }
}

/// Nombre en cola acorde al payload ESC/POS (`.escpos`).
fn ticket_queue_filename(requested: &str, folio: &str, _escpos: bool) -> String {
    if requested.ends_with(".pdf") {
        let stem = requested.strip_suffix(".pdf").unwrap_or(requested);
        return format!("{stem}.escpos");
    }
    let base = folio.trim();
    if !base.is_empty() {
        return format!("{base}.escpos");
    }
    if requested.contains('.') {
        requested.to_string()
    } else {
        format!("{requested}.escpos")
    }
}

pub async fn run_ws_loop(state: Arc<AppState>, mut shutdown_rx: watch::Receiver<bool>) -> Result<()> {
    let port = state.db.listen_port();
    let host = state.db.listen_host();
    let loopback_only = host == "127.0.0.1" || host.eq_ignore_ascii_case("localhost");

    // Muchos navegadores resuelven `localhost` → `::1`; con host loopback, duplicar listener en [::1].
    let mut v6_task = None;
    if loopback_only {
    if let Ok(addr6) = format!("[::1]:{port}").parse::<SocketAddr>() {
        match TcpListener::bind(addr6).await {
            Ok(listener6) => {
                tracing::info!(%addr6, "WebSocket listening (IPv6 loopback)");
                let st = state.clone();
                let mut rx_v6 = shutdown_rx.clone();
                v6_task = Some(tokio::spawn(async move {
                    loop {
                        tokio::select! {
                            _ = rx_v6.changed() => {
                                if *rx_v6.borrow() {
                                    break;
                                }
                            }
                            r = listener6.accept() => {
                                match r {
                                    Ok((stream, _)) => {
                                        let st2 = st.clone();
                                        tokio::spawn(async move {
                                            if let Err(e) = handle_tcp(stream, st2).await {
                                                tracing::warn!("ws connection ended: {e:#}");
                                            }
                                        });
                                    }
                                    Err(e) => tracing::warn!("ws ipv6 accept: {e:#}"),
                                }
                            }
                        }
                    }
                }));
            }
            Err(e) => tracing::debug!(%addr6, err = %e, "ws: skip IPv6 loopback bind"),
        }
    }
    }

    let addr: SocketAddr = format!("{host}:{port}").parse().map_err(|e| {
        anyhow::anyhow!("listen_host inválido ({host}): {e}")
    })?;
    let listener = TcpListener::bind(addr).await.map_err(|e| {
        eprintln!(
            "[Kai Printers] ERROR: no se pudo abrir WebSocket en {addr} — {e}. \
             ¿Otro proceso usa el puerto {port}? En `lsof` la columna COMMAND suele verse cortada (p. ej. «print-ser» = nombre del binario, p. ej. `print-service`). \
             Para ver el nombre completo: `lsof +c0 -nP -iTCP:{port} -sTCP:LISTEN`. Podés cerrar esa instancia o cambiar el puerto WS en la app."
        );
        e
    })?;
    tracing::info!(%addr, "WebSocket listening");
    if loopback_only {
        eprintln!(
            "[Kai Printers] WebSocket (WS) activo: ws://127.0.0.1:{port}/  (y [::1]:{port} si está habilitado)"
        );
    } else {
        eprintln!(
            "[Kai Printers] WebSocket (WS) activo en {host}:{port} — desde otro equipo use ws://<IP-LAN-del-Mac>:{port}/ \
             y en el POS el mismo host (no 127.0.0.1). Orígenes: permitir «todos» o http://<IP>:3022 en Kai Printers."
        );
    }
    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    break;
                }
            }
            r = listener.accept() => {
                match r {
                    Ok((stream, _)) => {
                        let st = state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_tcp(stream, st).await {
                                tracing::warn!("ws connection ended: {e:#}");
                            }
                        });
                    }
                    Err(e) => tracing::warn!("ws accept: {e:#}"),
                }
            }
        }
    }
    if let Some(t) = v6_task {
        t.abort();
        let _ = t.await;
    }
    Ok(())
}

async fn handle_tcp(stream: TcpStream, state: Arc<AppState>) -> Result<()> {
    handle_connection(stream, state).await
}

pub async fn handle_connection<S>(stream: S, state: Arc<AppState>) -> Result<()>
where
    S: AsyncRead + AsyncWrite + Unpin + Send,
{
    let callback = |_req: &Request, resp: Response<()>| Ok(resp);
    let mut ws = tokio_tungstenite::accept_hdr_async(stream, callback).await?;
    let conn_id = state.next_conn_id();
    let mut rx = state.broadcast.subscribe();
    let mut disco = state.ws_disconnect_all.subscribe();
    let mut hello_ok = false;
    loop {
        tokio::select! {
            sig = disco.recv() => {
                match sig {
                    Ok(()) => {
                        tracing::info!(%conn_id, "ws: cierre solicitado (servicio detenido)");
                        let _ = ws.send(service_stopped_close()).await;
                        break;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                        tracing::info!(%conn_id, "ws: disco lagged → cierre");
                        let _ = ws.send(service_stopped_close()).await;
                        break;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
            inc = ws.next() => {
                let Some(frame) = inc else { break; };
                let frame = frame?;
                match frame {
                    Message::Text(t) => {
                        let env: Envelope = match serde_json::from_str(&t) {
                            Ok(e) => e,
                            Err(_) => {
                                ws.send(json_line(&OutResponse::err(None, "invalid_json"))).await.ok();
                                continue;
                            }
                        };
                        if let Err(e) = protocol::check_version(env.version.as_ref()) {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), e))).await.ok();
                            continue;
                        }
                        let Some(action) = env.action.clone() else {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), "missing_action"))).await.ok();
                            continue;
                        };
                        if action == "hello" {
                            let client_id = env.client_id.clone().unwrap_or_else(|| "unknown".into());
                            let required: Vec<String> = env
                                .extra
                                .get("requiredPurposes")
                                .and_then(|v| v.as_array())
                                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                                .unwrap_or_default();
                            let app_label = env
                                .extra
                                .get("appLabel")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                                .or_else(|| {
                                    env.extra
                                        .get("applicationName")
                                        .and_then(|v| v.as_str())
                                        .map(String::from)
                                })
                                .unwrap_or_else(|| "Cliente".to_string());
                            let user_display_name = env
                                .extra
                                .get("userDisplayName")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                                .or_else(|| {
                                    env.extra
                                        .get("userName")
                                        .and_then(|v| v.as_str())
                                        .map(String::from)
                                })
                                .unwrap_or_else(|| "—".to_string());
                            let company_name = env
                                .extra
                                .get("companyName")
                                .and_then(|v| v.as_str())
                                .map(str::trim)
                                .filter(|s| !s.is_empty())
                                .map(String::from);
                            let point_of_sale_name = env
                                .extra
                                .get("pointOfSaleName")
                                .and_then(|v| v.as_str())
                                .map(str::trim)
                                .filter(|s| !s.is_empty())
                                .map(String::from);
                            state.register(
                                conn_id.clone(),
                                Session {
                                    client_id: client_id.clone(),
                                    required_purposes: required.clone(),
                                    app_label,
                                    user_display_name,
                                    company_name,
                                    point_of_sale_name,
                                },
                            );
                            hello_ok = true;
                            let hello_health_started = std::time::Instant::now();
                            let ph = events::emit_printer_health_json(&state.db, &required, &state.reachability)?;
                            crate::print_diag::info_elapsed_stage(
                                Some(&state.broadcast),
                                None,
                                "hello_health",
                                hello_health_started,
                                format!("{} líneas", required.len()),
                            );
                            let state_bg = state.clone();
                            let required_bg = required.clone();
                            tokio::spawn(async move {
                                if let Ok(ph) = events::emit_printer_health_json_with_force(
                                    &state_bg.db,
                                    &required_bg,
                                    &state_bg.reachability,
                                    true,
                                ) {
                                    let _ = state_bg.broadcast.send(ph.to_string());
                                }
                            });
                            let paper_profile_by_alias = state
                                .db
                                .paper_profile_by_alias_json()
                                .unwrap_or_else(|_| json!({}));
                            let ticket_escpos = true;
                            ws.send(json_line(&OutResponse::ok(env.request_id.clone(), json!({
                                "serviceStatus": events::service_status_payload(state.connected(), state.connected_sessions_json()),
                                "printerHealth": ph["payload"].clone(),
                                "paperProfileByAlias": paper_profile_by_alias,
                                "agentCapabilities": [
                                    "pdf-base64",
                                    "pos-sale-ticket",
                                    "pos-quotation-ticket",
                                    "pos-payment-in-ticket",
                                    "pos-customer-credit-note-ticket",
                                    "pos-cash-closing-ticket",
                                    "pos-cash-count-sheet-ticket",
                                    "pos-cash-session-opening-ticket",
                                    "pos-cash-hub-movement-ticket",
                                    "pos-supplier-payment-ticket",
                                    "pos-bank-account-ticket",
                                    "pos-dining-account-ticket",
                                    "pos-kitchen-ticket",
                                    "pos-laundry-reception-ticket",
                                    "pos-presale-ticket",
                                    "fiscal-boleta-preview",
                                    "variant-barcode-label",
                                ],
                                "ticketEscposEnabled": ticket_escpos,
                                "ticketLogoManagedByAgent": true,
                            })))).await.ok();
                            let _ = state.broadcast.send(ph.to_string());
                            let snap = json!({
                                "version": protocol::PROTOCOL_VERSION,
                                "event": "service_status",
                                "payload": events::service_status_payload(state.connected(), state.connected_sessions_json()),
                            });
                            let _ = state.broadcast.send(snap.to_string());
                            continue;
                        }
                        if !hello_ok {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), "send_hello_first"))).await.ok();
                            continue;
                        }
                        let out = dispatch(&state, &env, &action).await;
                        ws.send(json_line(&out)).await.ok();
                        if matches!(
                            action.as_str(),
                            "set_printer_mapping" | "set_mapping_lines" | "set_config"
                        ) {
                            if let Ok(ph) = events::emit_printer_health_json(&state.db, &[], &state.reachability) {
                                let _ = state.broadcast.send(ph.to_string());
                            }
                            let cfg = json!({
                                "version": protocol::PROTOCOL_VERSION,
                                "event": "config_changed",
                                "payload": { "source": "api" }
                            });
                            let _ = state.broadcast.send(cfg.to_string());
                        }
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
            ev = rx.recv() => {
                match ev {
                    Ok(msg) => {
                        if ws.send(Message::Text(msg)).await.is_err() { break; }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                }
            }
        }
    }
    state.unregister(&conn_id);
    let snap = serde_json::json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "service_status",
        "payload": events::service_status_payload(state.connected(), state.connected_sessions_json()),
    });
    let _ = state.broadcast.send(snap.to_string());
    Ok(())
}

async fn dispatch(state: &Arc<AppState>, env: &Envelope, action: &str) -> OutResponse {
    let rid = env.request_id.clone();
    match action {
        "ping" => OutResponse::ok(rid, json!({ "status": "alive", "version": protocol::PROTOCOL_VERSION })),
        "health" => {
            let sys = crate::platform::list_system_printers().unwrap_or_default();
            OutResponse::ok(
                rid,
                json!({
                    "printers": sys,
                    "jobs": state.db.list_jobs_queue(50).unwrap_or_default(),
                    "metrics": {
                        "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed),
                    },
                }),
            )
        }
        "get_printers" => {
            let refresh = env
                .extra
                .get("refresh")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if refresh {
                crate::platform::invalidate_system_printers_cache();
            }
            let list_result = if refresh {
                crate::platform::list_system_printers()
            } else {
                crate::platform::list_system_printers_cached()
            };
            match list_result {
                Ok(p) => OutResponse::ok(rid, json!({ "printers": p })),
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "get_config" => {
            let lines = state.db.list_mapping_lines().unwrap_or_default();
            let legacy = state.db.get_mappings().unwrap_or_default();
            let aliases_by_purpose = state.db.aliases_by_purpose_json().unwrap_or_else(|_| json!({}));
            let paper_profile_by_alias = state
                .db
                .paper_profile_by_alias_json()
                .unwrap_or_else(|_| json!({}));
            OutResponse::ok(
                rid,
                json!({
                    "mappingLines": lines,
                    "mappings": legacy.into_iter().map(|(a,b)| json!({"purpose": a, "printerName": b})).collect::<Vec<_>>(),
                    "aliasesByPurpose": aliases_by_purpose,
                    "paperProfileByAlias": paper_profile_by_alias,
                }),
            )
        }
        "set_printer_mapping" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("");
            let printer = env.extra.get("printerName").and_then(|v| v.as_str()).unwrap_or("");
            if purpose.is_empty() || printer.is_empty() {
                return OutResponse::err(rid, "purpose_and_printerName_required");
            }
            match state.db.set_mapping(purpose, printer) {
                Ok(()) => {
                    crate::platform::invalidate_system_printers_cache();
                    OutResponse::ok(rid, json!({ "ok": true }))
                }
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "set_mapping_lines" => {
            let lines = env
                .extra
                .get("lines")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let arr: Vec<serde_json::Value> = lines.iter().cloned().collect();
            match state.db.replace_all_mapping_lines(&arr) {
                Ok(()) => {
                    crate::platform::invalidate_system_printers_cache();
                    OutResponse::ok(rid, json!({ "ok": true }))
                }
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "set_config" => {
            if let Some(v) = env.extra.get("listenHost").and_then(|x| x.as_str()) {
                let h = v.trim();
                if !h.is_empty() {
                    let _ = state.db.set_setting("listen_host", h);
                }
            }
            if let Some(v) = env.extra.get("listenPort").and_then(|x| x.as_u64()) {
                let _ = state.db.set_setting("listen_port", &v.to_string());
            }
            if let Some(v) = env.extra.get("wssListenPort").and_then(|x| x.as_u64()) {
                let _ = state.db.set_setting("wss_listen_port", &v.to_string());
            }
            if let Some(v) = env.extra.get("wssEnabled").and_then(|x| x.as_bool()) {
                let _ = state
                    .db
                    .set_setting("wss_enabled", if v { "true" } else { "false" });
            }
            if let Some(v) = env.extra.get("allowedOriginsJson").and_then(|x| x.as_str()) {
                let _ = state.db.set_allowed_origins_json(v);
            }
            if let Some(v) = env.extra.get("sharedToken").and_then(|x| x.as_str()) {
                let _ = state.db.set_setting("shared_token", v);
            }
            OutResponse::ok(rid, json!({ "ok": true }))
        }
        "get_jobs" => match state.db.list_jobs_queue(50) {
            Ok(j) => OutResponse::ok(rid, json!({ "jobs": j })),
            Err(e) => OutResponse::err(rid, format!("{e:#}")),
        },
        "cancel_job" => {
            let id = env.extra.get("jobId").and_then(|v| v.as_str()).unwrap_or("");
            match state.db.dismiss_queue_job(id) {
                Ok(true) => {
                    let ping = json!({
                        "version": crate::protocol::PROTOCOL_VERSION,
                        "event": "jobs_changed",
                        "payload": { "source": "ws_protocol" }
                    });
                    let _ = state.broadcast.send(ping.to_string());
                    OutResponse::ok(rid, json!({ "cancelled": true }))
                }
                Ok(false) => OutResponse::err(rid, "job_not_in_queue_or_missing"),
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "print" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("documents");
            let format_raw = env.extra.get("format").and_then(|v| v.as_str());
            let print_format = crate::print_formats::PrintFormat::resolve(format_raw, purpose);
            if print_format.purpose() != purpose {
                return OutResponse::err(rid, "format_purpose_mismatch".to_string());
            }
            let printer_display_label_early = env
                .extra
                .get("printerDisplayLabel")
                .or_else(|| env.extra.get("printerAlias"))
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let paper_raw = state
                .db
                .paper_profile_for_mapping_line(purpose, printer_display_label_early)
                .unwrap_or_else(|_| crate::print_formats::PaperProfile::default_for_purpose(purpose).storage_value().to_string());
            let paper_profile = crate::print_formats::PaperProfile::from_storage(&paper_raw);
            let requested_format = print_format;
            let print_format = crate::print_formats::PrintFormat::resolve_for_mapping(
                print_format,
                paper_profile,
                purpose,
            );
            if print_format != requested_format {
                tracing::debug!(
                    purpose,
                    label = ?printer_display_label_early,
                    requested = requested_format.wire_value(),
                    resolved = print_format.wire_value(),
                    "print format adjusted to mapping line paper profile"
                );
            }
            crate::escpos_width::set_escpos_width_chars(print_format.chars_per_line());
            let filename = env
                .extra
                .get("filename")
                .and_then(|v| v.as_str())
                .unwrap_or("document.pdf");
            let copies = env.extra.get("copies").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
            let priority = env.extra.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let print_type = env
                .extra
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("pdf-base64");
            let printer_display_label_early = env
                .extra
                .get("printerDisplayLabel")
                .or_else(|| env.extra.get("printerAlias"))
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let mut queue_filename = filename.to_string();
            let (payload_ref, payload_kind, payload_ticket_json): (
                String,
                Option<&str>,
                Option<String>,
            ) = if is_vector_pos_ticket_type(print_type) {
                let ticket = match env.extra.get("ticket") {
                    Some(v) => v,
                    None => return OutResponse::err(rid, "ticket_required"),
                };
                let folio = vector_ticket_folio(print_type, ticket);
                queue_filename = ticket_queue_filename(filename, &folio, true);
                let resolved_printer = state
                    .db
                    .resolve_print_target_for_enqueue(purpose, printer_display_label_early)
                    .ok()
                    .flatten()
                    .and_then(|t| t.display_string());
                tracing::info!(folio = %folio, %print_type, printer = ?resolved_printer, "print: vector ticket → cola JSON (build en worker)");
                state.agent_log.push_info(format!(
                    "Encolando {print_type} ticket JSON (folio {folio}) → impresora {:?}, alias {:?}",
                    resolved_printer, printer_display_label_early
                ));
                let logo_merge_started = std::time::Instant::now();
                let mut ticket_value = ticket.clone();
                if crate::purpose_util::is_sale_ticket_purpose(purpose) {
                    crate::ticket_logos::merge_mapping_logo_into_ticket(
                        &state.data_dir,
                        &state.db,
                        purpose,
                        printer_display_label_early,
                        &mut ticket_value,
                    );
                }
                crate::print_diag::info_elapsed_stage(
                    Some(&state.broadcast),
                    None,
                    "logo_merge",
                    logo_merge_started,
                    print_type,
                );
                let ticket_json = match serde_json::to_string(&ticket_value) {
                    Ok(s) => s,
                    Err(e) => return OutResponse::err(rid, format!("ticket_json_serialize:{e}")),
                };
                ("-".to_string(), Some("ticket_json"), Some(ticket_json))
            } else {
                if crate::purpose_util::is_ticket_like_purpose(purpose) {
                    let msg = format!(
                        "Rechazado PDF en tickets/comandas (alias {:?}). \
                         Use ticket vectorial (pos-sale-ticket, etc.) o impresión del navegador.",
                        printer_display_label_early
                    );
                    tracing::warn!(purpose, label = ?printer_display_label_early, "{msg}");
                    state.agent_log.push_warn(msg);
                    return OutResponse::err(rid, "tickets_no_pdf_use_vector_or_browser".to_string());
                }
                let b64 = match env.extra.get("payload").and_then(|v| v.as_str()) {
                    Some(s) => s,
                    None => return OutResponse::err(rid, "payload_required"),
                };
                let path = match jobs::decode_pdf_base64_to_temp(&state.temp_dir, b64) {
                    Ok(p) => p,
                    Err(e) => return OutResponse::err(rid, format!("{e:#}")),
                };
                (
                    path.to_string_lossy().into_owned(),
                    Some("escpos_file"),
                    None,
                )
            };
            let document_type = env.extra.get("documentType").and_then(|v| v.as_str());
            let internal_folio = env.extra.get("internalFolio").and_then(|v| v.as_str());
            let source_app = env.extra.get("sourceApp").and_then(|v| v.as_str());
            let requested_by = env.extra.get("requestedBy").and_then(|v| v.as_str());
            let agent_print_type = if is_vector_pos_ticket_type(print_type) {
                Some(print_type)
            } else if print_type != "pdf-base64" {
                Some(print_type)
            } else {
                None
            };
            let printer_display_label = env
                .extra
                .get("printerDisplayLabel")
                .or_else(|| env.extra.get("printerAlias"))
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let (target_system_printer, target_network_host): (Option<String>, Option<String>) =
                if let Some(lbl) = printer_display_label {
                    match state
                        .db
                        .print_target_for_purpose_display_label(purpose, lbl)
                    {
                        Ok(Some(t)) if t.is_configured() => (t.system_printer, t.network_host),
                        Ok(Some(_)) => {
                            return OutResponse::err(
                                rid,
                                format!("printer_line_not_configured:{lbl}"),
                            );
                        }
                        Ok(None) => {
                            return OutResponse::err(
                                rid,
                                format!("unknown_printer_display_label:{lbl}"),
                            );
                        }
                        Err(e) => return OutResponse::err(rid, format!("{e:#}")),
                    }
                } else {
                    match state.db.default_print_target_for_purpose(purpose) {
                        Ok(Some(t)) if t.is_configured() => (t.system_printer, t.network_host),
                        Ok(_) => (None, None),
                        Err(e) => return OutResponse::err(rid, format!("{e:#}")),
                    }
                };
            let id = uuid::Uuid::new_v4().to_string();
            let db_enqueue_started = std::time::Instant::now();
            if let Err(e) = state.db.insert_job(
                &id,
                Some(purpose),
                &queue_filename,
                &payload_ref,
                copies,
                env.client_id.as_deref(),
                priority,
                document_type,
                internal_folio,
                source_app,
                requested_by,
                target_system_printer.as_deref(),
                target_network_host.as_deref(),
                Some(print_format.wire_value()),
                agent_print_type,
                payload_kind,
                payload_ticket_json.as_deref(),
            ) {
                return OutResponse::err(rid, format!("{e:#}"));
            }
            crate::print_diag::info_elapsed_stage(
                Some(&state.broadcast),
                Some(&id),
                "db_enqueue",
                db_enqueue_started,
                print_type,
            );
            state.signal_job_pending();
            let escpos_job = queue_filename.ends_with(".escpos");
            state.agent_log.push_info(format!(
                "POS encoló {print_type} ({}) propósito={purpose} alias={:?} cola={:?} red={:?}",
                if escpos_job { "ESC/POS" } else { "PDF" },
                printer_display_label,
                target_system_printer,
                target_network_host
            ));
            OutResponse::ok(rid, json!({ "jobId": id, "queued": true }))
        }
        "test_print" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("documents");
            let printer_display_label = env
                .extra
                .get("printerDisplayLabel")
                .or_else(|| env.extra.get("printerAlias"))
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let use_escpos = crate::purpose_util::is_ticket_like_purpose(purpose);
            let agent_label = state.db.agent_display_name();
            let path = match jobs::write_test_print_path(
                &state.temp_dir,
                purpose,
                &agent_label,
                use_escpos,
            ) {
                Ok(p) => p,
                Err(e) => return OutResponse::err(rid, format!("{e:#}")),
            };
            let filename = if use_escpos {
                "test_print.escpos"
            } else {
                "test_print.pdf"
            };
            let (target_system_printer, target_network_host) = match state
                .db
                .resolve_print_target_for_enqueue(purpose, printer_display_label)
            {
                Ok(Some(t)) if t.is_configured() => (t.system_printer, t.network_host),
                Ok(_) => (None, None),
                Err(e) => return OutResponse::err(rid, format!("{e:#}")),
            };
            let id = uuid::Uuid::new_v4().to_string();
            if let Err(e) = state.db.insert_job(
                &id,
                Some(purpose),
                filename,
                path.to_string_lossy().as_ref(),
                1,
                env.client_id.as_deref(),
                0,
                Some("test_print"),
                None,
                None,
                None,
                target_system_printer.as_deref(),
                target_network_host.as_deref(),
                None,
                Some("test_print"),
                None,
                None,
            ) {
                return OutResponse::err(rid, format!("{e:#}"));
            }
            state.signal_job_pending();
            OutResponse::ok(rid, json!({ "jobId": id, "queued": true, "kind": "test_print" }))
        }
        _ => OutResponse::err(rid, format!("unknown_action:{action}")),
    }
}
