//! Background worker: drain pending print_jobs (priority M4), retries.

use crate::db::{Db, PendingJob};
use crate::events;
use crate::reachability;
use crate::cut_test_pdf;
use crate::ticket_test_pdf;
use crate::ticket_test_escpos;
use crate::escpos_qa;
use crate::platform;
use crate::print_diag;
use crate::state::AppState;
use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};

const WORKER_IDLE_POLL_MS: u64 = 100;

pub fn spawn_worker(state: Arc<AppState>) {
    let db = state.db.clone();
    let notify = state.broadcast.clone();
    let job_notify = state.job_notify.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! {
                () = job_notify.notified() => {}
                () = tokio::time::sleep(Duration::from_millis(WORKER_IDLE_POLL_MS)) => {}
            }
            loop {
                let job = match db.next_pending_job() {
                    Ok(Some(j)) => j,
                    Ok(None) => break,
                    Err(e) => {
                        tracing::error!("next_pending_job: {e}");
                        break;
                    }
                };
                let job_id = job.id.clone();
                let job_purpose = job.purpose.clone();
                let is_test = is_local_test_job(&job);
                if let Err(e) = process_one_async(&state, job).await {
                tracing::error!(job_id = %job_id, "print job: {e:#}");
                let retries = db.retry_count(&job_id).unwrap_or(0);
                let allow_retry = !is_test && retries < 3;
                if allow_retry {
                    let _ = db.bump_retry(&job_id);
                    let _ = db.update_job_status(&job_id, "pending", None);
                } else {
                    let err_msg = format!("{e:#}");
                    state.agent_log.push_error(format!(
                        "Impresión fallida (trabajo {}, propósito {:?}): {}",
                        job_id,
                        job_purpose,
                        err_msg
                    ));
                    let _ = db.update_job_status(&job_id, "error", Some(&err_msg));
                    let fail = serde_json::json!({
                        "version": crate::protocol::PROTOCOL_VERSION,
                        "event": "print_job_failed",
                        "payload": {
                            "jobId": job_id,
                            "purpose": job_purpose,
                            "error": format!("{e:#}")
                        }
                    });
                    let _ = notify.send(fail.to_string());
                }
                } else {
                    state
                        .jobs_completed_total
                        .fetch_add(1, Ordering::Relaxed);
                }
            }
        }
    });
}

fn is_local_test_job(job: &PendingJob) -> bool {
    let agent = job.agent_print_type.as_deref();
    let doc = job.document_type.as_deref();
    matches!(
        agent,
        Some("test_escpos_qa")
            | Some("test_escpos_qa_nocut")
            | Some("test_cut")
            | Some("test_drawer")
            | Some("test_print")
    ) || matches!(
        doc,
        Some("test_escpos_qa")
            | Some("test_escpos_qa_nocut")
            | Some("test_cut")
            | Some("test_drawer")
            | Some("test_print")
    )
}

fn resolve_agent_print_type(job: &PendingJob) -> &str {
    job.agent_print_type
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .or(job.document_type.as_deref())
        .unwrap_or("")
}

fn cut_enabled_for_ticket_line(
    db: &Db,
    purpose: &str,
    system_printer: Option<&str>,
    network_host: Option<&str>,
) -> bool {
    if let Some(h) = network_host.map(str::trim).filter(|s| !s.is_empty()) {
        return db.auto_cut_enabled_for_ticket_network_host(h, purpose);
    }
    if let Some(p) = system_printer.map(str::trim).filter(|s| !s.is_empty()) {
        return db.auto_cut_enabled_for_printer(p, purpose);
    }
    false
}

fn drawer_enabled_for_ticket_line(
    db: &Db,
    purpose: &str,
    system_printer: Option<&str>,
    network_host: Option<&str>,
) -> bool {
    if let Some(h) = network_host.map(str::trim).filter(|s| !s.is_empty()) {
        return db.drawer_open_enabled_for_ticket_network_host(h, purpose);
    }
    if let Some(p) = system_printer.map(str::trim).filter(|s| !s.is_empty()) {
        return db.drawer_open_enabled_for_printer(p, purpose);
    }
    false
}

/// Cajón solo en rollo 80 mm y tipos agente permitidos (si está habilitado en mapeo).
fn open_cash_drawer_for_job(agent_type: &str, roll_width_mm: u8, drawer_enabled: bool) -> bool {
    crate::cash_drawer_policy::open_cash_drawer_for_agent_type(
        agent_type,
        roll_width_mm,
        drawer_enabled,
    )
}

fn ticket_thermal_options_for_job(
    db: &Db,
    purpose: &str,
    system_printer: Option<&str>,
    network_host: Option<&str>,
    agent_print_type: Option<&str>,
    business_document_type: Option<&str>,
    print_format: crate::print_formats::PrintFormat,
) -> platform::ThermalPrintOptions {
    if !print_format.is_ticket() {
        return platform::ThermalPrintOptions {
            thermal_80mm: false,
            roll_width_mm: 80,
            auto_cut: false,
            open_drawer: false,
        };
    }
    let roll_width_mm = match print_format {
        crate::print_formats::PrintFormat::Ticket58mm => 58,
        _ => 80,
    };
    let agent = agent_print_type
        .filter(|s| !s.is_empty())
        .or(business_document_type)
        .unwrap_or("");
    let cut_line = || cut_enabled_for_ticket_line(db, purpose, system_printer, network_host);
    let drawer_line = || drawer_enabled_for_ticket_line(db, purpose, system_printer, network_host);
    let drawer_kick = open_cash_drawer_for_job(agent, roll_width_mm, drawer_line());
    let (auto_cut, open_drawer) = match business_document_type.unwrap_or("") {
        "test_cut" => (true, false),
        "test_drawer" => (cut_line(), drawer_kick),
        "test_escpos_qa" => (true, drawer_kick),
        "test_escpos_qa_nocut" => (false, drawer_kick),
        _ => (cut_line(), drawer_kick),
    };
    platform::ThermalPrintOptions {
        thermal_80mm: true,
        roll_width_mm,
        auto_cut,
        open_drawer,
    }
}

/// Resuelve impresoras del SO para un propósito. Si `tickets` no tiene mapeo, usa `documents`
/// (misma impresora en cajas con un solo equipo) y deja constancia en el log.
/// Destino explícito en el job o primera línea de mapeo (incluye impresoras solo en red).
fn resolve_job_print_targets(
    db: &Db,
    job: &PendingJob,
    purpose: &str,
) -> Result<(Vec<String>, Option<String>)> {
    let explicit_net = job
        .target_network_host
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(String::from);
    let explicit_sys = job
        .target_system_printer
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(String::from);
    if explicit_net.is_some() || explicit_sys.is_some() {
        let printers = explicit_sys.into_iter().collect();
        return Ok((printers, explicit_net));
    }
    if let Some(t) = db.default_print_target_for_purpose(purpose)? {
        let printers = t
            .system_printer
            .map(|s| vec![s])
            .unwrap_or_default();
        return Ok((printers, t.network_host));
    }
    let printers = printers_for_purpose_with_fallback(db, purpose)?;
    Ok((printers, None))
}

fn printers_for_purpose_with_fallback(db: &Db, purpose: &str) -> Result<Vec<String>> {
    let mut printers = db.printers_for_purpose_ordered(purpose)?;
    if printers.is_empty() && purpose == "tickets" {
        let docs = db.printers_for_purpose_ordered("documents")?;
        if !docs.is_empty() {
            tracing::warn!(
                "no printer mapped for tickets; using documents mapping as fallback ({})",
                docs.join(", ")
            );
            printers = docs;
        }
    }
    if printers.is_empty() && purpose == "documents" {
        let tickets = db.printers_for_purpose_ordered("tickets")?;
        if !tickets.is_empty() {
            tracing::warn!(
                "no printer mapped for documents; using tickets mapping as fallback ({})",
                tickets.join(", ")
            );
            printers = tickets;
        }
    }
    Ok(printers)
}

fn emit_job_spooled(notify: &tokio::sync::broadcast::Sender<String>, job: &PendingJob) {
    let ev = serde_json::json!({
        "version": crate::protocol::PROTOCOL_VERSION,
        "event": "print_job_spooled",
        "payload": { "jobId": job.id, "purpose": job.purpose }
    });
    let _ = notify.send(ev.to_string());
}

fn emit_job_done(notify: &tokio::sync::broadcast::Sender<String>, job: &PendingJob) {
    let ev = serde_json::json!({
        "version": crate::protocol::PROTOCOL_VERSION,
        "event": "print_job_done",
        "payload": { "jobId": job.id, "purpose": job.purpose }
    });
    let _ = notify.send(ev.to_string());
}

fn is_ticket_json_job(job: &PendingJob) -> bool {
    job.payload_kind
        .as_deref()
        .map(|k| k == "ticket_json")
        .unwrap_or(false)
}

type WriteVectorEscPosFn = fn(&PathBuf, &serde_json::Value) -> Result<PathBuf>;

fn vector_escpos_writer(print_type: &str) -> WriteVectorEscPosFn {
    match print_type {
        "pos-quotation-ticket" => write_pos_quotation_ticket_escpos_from_value,
        "pos-payment-in-ticket" => write_pos_payment_in_ticket_escpos_from_value,
        "pos-customer-credit-note-ticket" => write_pos_customer_credit_note_ticket_escpos_from_value,
        "pos-cash-closing-ticket" => write_pos_cash_closing_ticket_escpos_from_value,
        "pos-cash-count-sheet-ticket" => write_pos_cash_count_sheet_ticket_escpos_from_value,
        "pos-cash-session-opening-ticket" => write_pos_cash_session_opening_ticket_escpos_from_value,
        "pos-cash-hub-movement-ticket" => write_pos_cash_hub_movement_ticket_escpos_from_value,
        "pos-bank-account-ticket" => write_pos_bank_account_ticket_escpos_from_value,
        "pos-presale-ticket" => write_pos_presale_ticket_escpos_from_value,
        "fiscal-boleta-preview" => write_fiscal_boleta_preview_escpos_from_value,
        "variant-barcode-label" => write_variant_barcode_label_escpos_from_value,
        _ => write_pos_sale_ticket_escpos_from_value,
    }
}

pub fn build_vector_ticket_escpos_bytes(
    print_type: &str,
    value: &serde_json::Value,
    temp_dir: &PathBuf,
) -> Result<Vec<u8>> {
    let build_started = Instant::now();
    let write = vector_escpos_writer(print_type);
    let path = write(temp_dir, value)?;
    let bytes = std::fs::read(&path).with_context(|| format!("read built escpos {}", path.display()))?;
    let _ = std::fs::remove_file(&path);
    print_diag::info_elapsed(
        "escpos_build",
        build_started,
        format!("{print_type} {}B", bytes.len()),
    );
    Ok(bytes)
}

async fn process_one_async(state: &Arc<AppState>, job: PendingJob) -> Result<()> {
    let job_started = Instant::now();
    let db = state.db.as_ref();
    let notify = &state.broadcast;
    let ticket_json = is_ticket_json_job(&job);

    if let Some(created) = job.created_at.as_deref() {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(created) {
            let ms = chrono::Utc::now()
                .signed_duration_since(dt.with_timezone(&chrono::Utc))
                .num_milliseconds()
                .max(0) as u128;
            print_diag::info_stage(
                Some(notify),
                Some(&job.id),
                "queue_wait",
                ms,
                "",
            );
        }
    }

    db.update_job_status(&job.id, "printing", None)?;
    let path = PathBuf::from(&job.payload_ref);
    if !ticket_json && !path.exists() {
        anyhow::bail!("payload file missing");
    }
    let purpose = job
        .purpose
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("missing purpose"))?;
    let (printers, network_host) = resolve_job_print_targets(db, &job, purpose)?;
    if printers.is_empty() && network_host.is_none() {
        anyhow::bail!(
            "no printer mapped for {purpose} (configure «Tickets» in KaiPrinters or map «Documentos»)"
        );
    }
    let paper_raw = db.paper_profile_for_ticket_line(
        purpose,
        printers.first().map(|s| s.as_str()),
        network_host.as_deref(),
    );
    let paper_profile = crate::print_formats::PaperProfile::from_storage(&paper_raw);
    let print_format = crate::print_formats::PrintFormat::resolve_for_mapping(
        crate::print_formats::PrintFormat::resolve(job.format.as_deref(), purpose),
        paper_profile,
        purpose,
    );
    crate::escpos_width::set_escpos_width_chars(print_format.chars_per_line());
    let enum_started = Instant::now();
    let system = platform::list_system_printers_cached().unwrap_or_default();
    print_diag::info_elapsed_stage(
        Some(notify),
        Some(&job.id),
        "printer_enum",
        enum_started,
        format!("{} impresoras", system.len()),
    );
    let reach_started = Instant::now();
    let line_id = reachability::refresh_for_print_target(
        db,
        &system,
        &state.reachability,
        purpose,
        printers.first().map(|s| s.as_str()),
        network_host.as_deref(),
    )?;
    print_diag::info_elapsed_stage(
        Some(notify),
        Some(&job.id),
        "reachability",
        reach_started,
        line_id.as_deref().unwrap_or("sin línea"),
    );
    if let Some(ref id) = line_id {
        if let Some(entry) = reachability::status_for_line(&state.reachability, id) {
            if !reachability::is_online(&entry) && !is_local_test_job(&job) {
                let reason = entry
                    .reason
                    .unwrap_or_else(|| "impresora no disponible".into());
                anyhow::bail!("{reason}");
            }
        }
    }

    let is_escpos_file = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("escpos"))
        .unwrap_or(false);
    let is_escpos = ticket_json || is_escpos_file;

    let escpos_bytes: Option<Vec<u8>> = if ticket_json {
        let json_str = job
            .payload_ticket_json
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .ok_or_else(|| anyhow::anyhow!("ticket_json_missing"))?;
        let value: serde_json::Value = serde_json::from_str(json_str).context("parse ticket_json")?;
        let print_type = job
            .agent_print_type
            .as_deref()
            .filter(|s| !s.is_empty())
            .unwrap_or("pos-sale-ticket");
        Some(build_vector_ticket_escpos_bytes(
            print_type,
            &value,
            &state.temp_dir,
        )?)
    } else {
        None
    };

    let payload_bytes = escpos_bytes
        .as_ref()
        .map(|b| b.len())
        .unwrap_or_else(|| std::fs::metadata(&path).map(|m| m.len() as usize).unwrap_or(0));

    emit_job_spooled(notify, &job);

    if let Some(host) = network_host {
        if !is_escpos {
            anyhow::bail!("impresora en red solo admite tickets ESC/POS");
        }
        let thermal = ticket_thermal_options_for_job(
            db,
            purpose,
            None,
            Some(&host),
            job.agent_print_type.as_deref(),
            job.document_type.as_deref(),
            print_format,
        );
        let data = match escpos_bytes {
            Some(bytes) => bytes,
            None => std::fs::read(&path).context("read escpos for network")?,
        };
        let copies = job.copies.max(1) as u32;
        print_diag::info(format!(
            "Trabajo {}: ESC/POS por red → {host} ({payload_bytes} bytes), corte={}, gaveta={}",
            job.id, thermal.auto_cut, thermal.open_drawer
        ));
        let spooler_started = Instant::now();
        let host_copy = host.clone();
        let data_copy = data.clone();
        let print_res = tokio::task::spawn_blocking(move || {
            platform::print_escpos_bytes_to_network(&host_copy, &data_copy, copies, thermal)
        })
        .await
        .context("spawn_blocking network print")?;
        match print_res {
            Ok(()) => {
                print_diag::info_elapsed_stage(
                    Some(notify),
                    Some(&job.id),
                    "spooler",
                    spooler_started,
                    host.as_str(),
                );
                print_diag::info_elapsed_stage(
                    Some(notify),
                    Some(&job.id),
                    "job_total",
                    job_started,
                    &job.id,
                );
                if path.exists() {
                    let _ = std::fs::remove_file(&path);
                }
                db.delete_job(&job.id)?;
                emit_job_done(notify, &job);
                return Ok(());
            }
            Err(e) => {
                if let Some(ref id) = line_id {
                    state.reachability.mark_offline(id, format!("{e:#}"));
                }
                if let Ok(ph) = events::emit_printer_health_json(db, &[], &state.reachability) {
                    let _ = notify.send(ph.to_string());
                }
                return Err(e);
            }
        }
    }

    let mut last_err: Option<anyhow::Error> = None;
    for printer in &printers {
        let thermal = ticket_thermal_options_for_job(
            db,
            purpose,
            Some(printer.as_str()),
            None,
            job.agent_print_type.as_deref(),
            job.document_type.as_deref(),
            print_format,
        );
        let copies = job.copies.max(1) as u32;
        if is_escpos {
            let kind = resolve_agent_print_type(&job);
            print_diag::info(format!(
                "Trabajo {} ({kind}): enviando ESC/POS ({payload_bytes} bytes) → «{printer}», corte={}, gaveta={}, copias={copies}",
                job.id,
                thermal.auto_cut,
                thermal.open_drawer,
            ));
        }
        let spooler_started = Instant::now();
        let print_result = if ticket_json {
            let bytes = escpos_bytes.as_ref().expect("ticket_json bytes");
            let printer_name = printer.clone();
            let bytes_vec = bytes.clone();
            tokio::task::spawn_blocking(move || {
                platform::print_escpos_bytes_to_printer(&bytes_vec, &printer_name, copies, thermal)
            })
            .await
            .context("spawn_blocking escpos print")?
        } else if is_escpos_file {
            let path_copy = path.clone();
            let printer_name = printer.clone();
            tokio::task::spawn_blocking(move || {
                platform::print_escpos_to_printer(&path_copy, &printer_name, copies, thermal)
            })
            .await
            .context("spawn_blocking escpos file print")?
        } else {
            let path_copy = path.clone();
            let printer_name = printer.clone();
            tokio::task::spawn_blocking(move || {
                platform::print_pdf_to_printer(&path_copy, &printer_name, copies, thermal)
            })
            .await
            .context("spawn_blocking pdf print")?
        };
        match print_result {
            Ok(()) => {
                print_diag::info_elapsed_stage(
                    Some(notify),
                    Some(&job.id),
                    "spooler",
                    spooler_started,
                    format!("«{printer}» {payload_bytes}B"),
                );
                print_diag::info_elapsed_stage(
                    Some(notify),
                    Some(&job.id),
                    "job_total",
                    job_started,
                    &job.id,
                );
                if is_escpos {
                    print_diag::info(format!(
                        "Trabajo {}: ESC/POS entregado al spooler de «{printer}» ({payload_bytes} bytes)",
                        job.id
                    ));
                }
                if path.exists() {
                    let _ = std::fs::remove_file(&path);
                }
                db.delete_job(&job.id)?;
                emit_job_done(notify, &job);
                return Ok(());
            }
            Err(e) => {
                if is_escpos {
                    print_diag::error(format!(
                        "Trabajo {}: falló ESC/POS en «{printer}»: {e:#}",
                        job.id
                    ));
                }
                tracing::warn!(job_id = %job.id, printer = %printer, "intento en impresora: {e:#}");
                last_err = Some(e);
            }
        }
    }
    if let Some(ref id) = line_id {
        if let Some(e) = &last_err {
            state.reachability.mark_offline(id, format!("{e:#}"));
        }
    }
    if last_err.is_some() {
        if let Ok(ph) = events::emit_printer_health_json(db, &[], &state.reachability) {
            let _ = notify.send(ph.to_string());
        }
    }
    Err(last_err.unwrap_or_else(|| anyhow::anyhow!("print failed")))
}

pub fn decode_pdf_base64_to_temp(dir: &PathBuf, b64: &str) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let bytes = B64.decode(b64.trim())?;
    if bytes.len() < 8 || &bytes[0..4] != b"%PDF" {
        anyhow::bail!("invalid pdf payload");
    }
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("job_{id}.pdf"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

/// Prueba de corte: ESC/POS (RAW tickets).
pub fn write_cut_test_path(dir: &PathBuf, use_escpos: bool) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    if use_escpos {
        let p = dir.join(format!("cut_test_{id}.escpos"));
        ticket_test_escpos::write_cut_test_escpos(&p)?;
        return Ok(p);
    }
    let p = dir.join(format!("cut_test_{id}.pdf"));
    cut_test_pdf::write_cut_test_pdf(&p)?;
    Ok(p)
}

/// Prueba de gaveta: ESC/POS mínimo (corte/gaveta los añade el worker).
pub fn write_drawer_test_path(dir: &PathBuf) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("drawer_test_{id}.escpos"));
    ticket_test_escpos::write_drawer_test_escpos(&p)?;
    Ok(p)
}

/// Prueba de impresión: ticket 80 mm (PDF o ESC/POS) o documento A4 mínimo.
pub fn write_test_print_path(
    dir: &PathBuf,
    purpose: &str,
    agent_label: &str,
    use_escpos: bool,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    if purpose == "tickets" && use_escpos {
        let p = dir.join(format!("test_{id}.escpos"));
        ticket_test_escpos::write_pos_ticket_test_escpos(&p, agent_label)?;
        return Ok(p);
    }
    let p = dir.join(format!("test_{id}.pdf"));
    if purpose == "tickets" {
        ticket_test_pdf::write_pos_ticket_test_pdf(&p, agent_label)?;
    } else {
        static PDF: &[u8] = include_bytes!("../assets/minimal_test.pdf");
        std::fs::write(&p, PDF)?;
    }
    Ok(p)
}

/// Hoja QA ESC/POS (RAW). Logo según flags; corte según flag al encolar.
pub fn write_escpos_qa_path(
    dir: &PathBuf,
    agent_label: &str,
    system_printer: &str,
    include_cut: bool,
    include_logo: bool,
    logo_base64: Option<&str>,
) -> Result<(PathBuf, usize)> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("escpos_qa_{id}.escpos"));
    let bytes = escpos_qa::write_escpos_qa_file(
        &p,
        agent_label,
        system_printer,
        include_cut,
        include_logo,
        logo_base64,
    )?;
    Ok((p, bytes))
}

/// Genera bytes ESC/POS de ticket de venta POS desde JSON (`pos-sale-ticket-escpos`).
pub fn write_pos_sale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_sale_ticket_escpos::write_pos_sale_ticket_escpos_from_value(dir, value)
}

pub fn write_pos_quotation_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_quotation_ticket::write_pos_quotation_ticket_escpos_from_value(dir, value)
}

pub fn write_pos_payment_in_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_payment_in_ticket::write_pos_payment_in_ticket_escpos_from_value(dir, value)
}

pub fn write_pos_customer_credit_note_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_customer_credit_note_ticket::write_pos_customer_credit_note_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_cash_closing_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_closing_ticket::write_pos_cash_closing_ticket_escpos_from_value(dir, value)
}

pub fn write_pos_cash_count_sheet_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_count_sheet_ticket::write_pos_cash_count_sheet_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_cash_session_opening_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_session_opening_ticket::write_pos_cash_session_opening_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_cash_hub_movement_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_cash_hub_movement_ticket::write_pos_cash_hub_movement_ticket_escpos_from_value(
        dir, value,
    )
}

pub fn write_pos_bank_account_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_bank_account_ticket::write_pos_bank_account_ticket_escpos_from_value(dir, value)
}

/// Genera bytes ESC/POS de ticket de preventa POS desde JSON (`pos-presale-ticket`).
pub fn write_pos_presale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_presale_ticket::write_pos_presale_ticket_escpos_from_value(dir, value)
}

/// Genera bytes ESC/POS de boleta electrónica simulada (`fiscal-boleta-preview`).
pub fn write_fiscal_boleta_preview_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::fiscal_boleta_preview::write_fiscal_boleta_preview_escpos_from_value(dir, value)
}

/// Genera bytes ESC/POS de comprobante barcode variante desde JSON (`variant-barcode-label`).
pub fn write_variant_barcode_label_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::variant_barcode_label::write_variant_barcode_label_escpos_from_value(dir, value)
}
