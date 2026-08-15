//! Logo global de tickets ESC/POS (`app_data_dir/ticket_logos/global.*`).

use anyhow::{bail, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rusqlite::Connection;
use serde_json::Value;
use std::path::{Path, PathBuf};

pub const LOGOS_SUBDIR: &str = "ticket_logos";
pub const GLOBAL_LOGO_BASENAME: &str = "global";
pub const GLOBAL_LOGO_SETTING_KEY: &str = "ticket_logo_path";
pub const GLOBAL_LOGO_PRINT_ENABLED_KEY: &str = "ticket_logo_print_enabled";

const KAI_DEFAULT_TICKET_LOGO_PNG: &[u8] = include_bytes!("../assets/kai-default-ticket-logo.png");

/// Qué hacer con `company.logoBase64` del ticket según la línea de mapeo y el logo global.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MappingLogoAction {
    /// Sin logo en el ticket (switch OFF o sin línea).
    Suppress,
    /// Logo global configurado en el agente.
    ApplyGlobal,
    /// Switch ON sin logo global: logo Kai embebido.
    ApplyKaiDefault,
    /// Propósitos distintos de tickets: no modificar JSON del POS.
    LeaveTicketAsIs,
}

pub fn logos_dir(data_dir: &Path) -> PathBuf {
    data_dir.join(LOGOS_SUBDIR)
}

pub fn kai_default_logo_base64() -> String {
    B64.encode(KAI_DEFAULT_TICKET_LOGO_PNG)
}

fn allowed_ext(path: &Path) -> Result<&'static str> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "png" => Ok("png"),
        "jpg" | "jpeg" => Ok("jpg"),
        _ => bail!("formato no soportado (use PNG o JPG)"),
    }
}

pub fn delete_logo_file(data_dir: &Path, rel_path: &str) {
    let p = data_dir.join(rel_path.trim());
    let _ = std::fs::remove_file(p);
}

pub fn clear_global_logo_files(data_dir: &Path) {
    let dir = logos_dir(data_dir);
    for ext in ["png", "jpg", "jpeg"] {
        let _ = std::fs::remove_file(dir.join(format!("{GLOBAL_LOGO_BASENAME}.{ext}")));
    }
}

/// Copia la imagen a `ticket_logos/global.{ext}` y devuelve la ruta relativa.
pub fn import_global_logo(data_dir: &Path, source: &Path) -> Result<String> {
    let ext = allowed_ext(source)?;
    clear_global_logo_files(data_dir);
    let dir = logos_dir(data_dir);
    std::fs::create_dir_all(&dir)?;
    let bytes = std::fs::read(source).context("leer imagen")?;
    image::load_from_memory(&bytes).context("imagen inválida (PNG/JPG)")?;
    let dest = dir.join(format!("{GLOBAL_LOGO_BASENAME}.{ext}"));
    std::fs::write(&dest, &bytes).context("guardar logo")?;
    Ok(format!("{LOGOS_SUBDIR}/{GLOBAL_LOGO_BASENAME}.{ext}"))
}

pub fn read_logo_as_base64(data_dir: &Path, rel_path: &str) -> Result<Option<String>> {
    let trimmed = rel_path.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let path = data_dir.join(trimmed);
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path).context("leer logo")?;
    if bytes.is_empty() {
        return Ok(None);
    }
    Ok(Some(B64.encode(bytes)))
}

/// Migra logos por línea (`ticket_logos/{lineId}.*`) al logo global único.
pub fn consolidate_per_line_logos_to_global(data_dir: &Path, conn: &Connection) -> Result<()> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [GLOBAL_LOGO_SETTING_KEY],
            |r| r.get(0),
        )
        .ok();
    if let Some(ref rel) = existing {
        let t = rel.trim();
        if !t.is_empty() && data_dir.join(t).is_file() {
            cleanup_line_logo_files(data_dir, conn)?;
            return Ok(());
        }
    }

    let first_path: Option<String> = conn
        .query_row(
            "SELECT ticket_logo_path FROM printer_mapping_lines
             WHERE ticket_logo_path IS NOT NULL AND trim(ticket_logo_path) != ''
             ORDER BY sort_order ASC, id ASC LIMIT 1",
            [],
            |r| r.get(0),
        )
        .ok();

    if let Some(ref rel) = first_path {
        let trimmed = rel.trim();
        if !trimmed.is_empty() {
            let src = data_dir.join(trimmed);
            if src.is_file() {
                let rel_global = import_global_logo(data_dir, &src)?;
                conn.execute(
                    "INSERT INTO settings(key, value) VALUES(?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    [GLOBAL_LOGO_SETTING_KEY, rel_global.as_str()],
                )?;
            }
        }
    }

    cleanup_line_logo_files(data_dir, conn)?;
    Ok(())
}

fn cleanup_line_logo_files(data_dir: &Path, conn: &Connection) -> Result<()> {
    let global_rel: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [GLOBAL_LOGO_SETTING_KEY],
            |r| r.get(0),
        )
        .ok();

    let mut stmt = conn.prepare(
        "SELECT id, ticket_logo_path FROM printer_mapping_lines
         WHERE ticket_logo_path IS NOT NULL AND trim(ticket_logo_path) != ''",
    )?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    for row in rows {
        let (id, path) = row?;
        let t = path.trim();
        if global_rel.as_deref().map(str::trim) == Some(t) {
            continue;
        }
        delete_logo_file(data_dir, t);
        let dir = logos_dir(data_dir);
        for ext in ["png", "jpg", "jpeg"] {
            let _ = std::fs::remove_file(dir.join(format!("{id}.{ext}")));
        }
    }
    Ok(())
}

pub fn merge_mapping_logo_into_ticket(
    data_dir: &Path,
    db: &crate::db::Db,
    purpose: &str,
    display_label: Option<&str>,
    ticket: &mut Value,
) {
    let action = match db.ticket_logo_action_for_enqueue(purpose, display_label) {
        Ok(a) => a,
        Err(e) => {
            tracing::warn!(err = %e, "ticket: no se pudo resolver logo");
            return;
        }
    };
    let Some(obj) = ticket.as_object_mut() else {
        return;
    };
    let company = obj
        .entry("company")
        .or_insert_with(|| serde_json::json!({}));
    let Some(co) = company.as_object_mut() else {
        return;
    };
    match action {
        MappingLogoAction::Suppress => {
            co.remove("logoBase64");
            tracing::debug!("ticket: logo suprimido por configuración del agente");
        }
        MappingLogoAction::ApplyGlobal => {
            let Some(rel) = db.global_ticket_logo_path().ok().flatten() else {
                co.insert(
                    "logoBase64".to_string(),
                    Value::String(kai_default_logo_base64()),
                );
                return;
            };
            match read_logo_as_base64(data_dir, &rel) {
                Ok(Some(b64)) => {
                    co.insert("logoBase64".to_string(), Value::String(b64));
                    tracing::debug!(path = %rel, "ticket: logo global aplicado");
                }
                Ok(None) => {
                    co.insert(
                        "logoBase64".to_string(),
                        Value::String(kai_default_logo_base64()),
                    );
                    tracing::warn!(path = %rel, "logo global no legible; fallback Kai");
                }
                Err(e) => tracing::warn!(err = %e, "ticket: error leyendo logo global"),
            }
        }
        MappingLogoAction::ApplyKaiDefault => {
            co.insert(
                "logoBase64".to_string(),
                Value::String(kai_default_logo_base64()),
            );
            tracing::debug!("ticket: logo Kai predeterminado aplicado");
        }
        MappingLogoAction::LeaveTicketAsIs => {}
    }
}

/// Base64 del logo global si existe; si no, None (el caller puede usar Kai default).
pub fn global_logo_base64_or_none(data_dir: &Path, db: &crate::db::Db) -> Option<String> {
    let rel = db.global_ticket_logo_path().ok().flatten()?;
    read_logo_as_base64(data_dir, &rel)
        .ok()
        .flatten()
        .or_else(|| {
            tracing::warn!("logo global configurado pero no legible");
            None
        })
}
