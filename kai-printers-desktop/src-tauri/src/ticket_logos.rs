//! Logos de ticket por línea de mapeo (copiados a `app_data_dir/ticket_logos/`).

use anyhow::{bail, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::Value;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

pub const LOGOS_SUBDIR: &str = "ticket_logos";

/// Qué hacer con `company.logoBase64` del ticket POS según la línea de mapeo.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MappingLogoAction {
    /// Usar logo guardado en KaiPrinters para esa línea.
    Apply(String),
    /// Logo desactivado en la línea: no imprimir logo del POS.
    Suppress,
    /// Sin línea aplicable o sin config de logo: conservar el JSON del POS.
    LeaveTicketAsIs,
}

pub fn logos_dir(data_dir: &Path) -> PathBuf {
    data_dir.join(LOGOS_SUBDIR)
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

pub fn delete_logos_for_line(data_dir: &Path, line_id: &str) {
    let dir = logos_dir(data_dir);
    for ext in ["png", "jpg", "jpeg"] {
        let _ = std::fs::remove_file(dir.join(format!("{line_id}.{ext}")));
    }
}

/// Copia la imagen a `ticket_logos/{line_id}.{ext}` y devuelve la ruta relativa.
pub fn import_logo(data_dir: &Path, line_id: &str, source: &Path) -> Result<String> {
    let ext = allowed_ext(source)?;
    delete_logos_for_line(data_dir, line_id);
    let dir = logos_dir(data_dir);
    std::fs::create_dir_all(&dir)?;
    let bytes = std::fs::read(source).context("leer imagen")?;
    image::load_from_memory(&bytes).context("imagen inválida (PNG/JPG)")?;
    let dest = dir.join(format!("{line_id}.{ext}"));
    std::fs::write(&dest, &bytes).context("guardar logo")?;
    Ok(format!("{LOGOS_SUBDIR}/{line_id}.{ext}"))
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
            tracing::warn!(err = %e, "ticket: no se pudo resolver logo de línea");
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
            tracing::debug!("ticket: logo suprimido (desactivado en línea de mapeo)");
        }
        MappingLogoAction::Apply(rel) => {
            let Ok(Some(b64)) = read_logo_as_base64(data_dir, &rel) else {
                tracing::warn!(path = %rel, "logo de línea no legible");
                return;
            };
            co.insert("logoBase64".to_string(), Value::String(b64));
            tracing::debug!(path = %rel, "ticket: logo de línea aplicado");
        }
        MappingLogoAction::LeaveTicketAsIs => {}
    }
}

pub fn cleanup_orphaned_after_save(
    data_dir: &Path,
    old_lines: &[Value],
    new_lines: &[Value],
) -> Result<()> {
    let mut keep_paths: HashSet<String> = HashSet::new();
    for row in new_lines {
        if let Some(p) = row.get("ticketLogoPath").and_then(|v| v.as_str()) {
            let t = p.trim();
            if !t.is_empty() {
                keep_paths.insert(t.to_string());
            }
        }
    }
    for old in old_lines {
        let id = old.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let still = new_lines
            .iter()
            .any(|l| l.get("id").and_then(|v| v.as_str()) == Some(id));
        if still {
            continue;
        }
        if let Some(p) = old.get("ticketLogoPath").and_then(|v| v.as_str()) {
            let t = p.trim();
            if !t.is_empty() && !keep_paths.contains(t) {
                delete_logo_file(data_dir, t);
            }
        } else {
            delete_logos_for_line(data_dir, id);
        }
    }
    Ok(())
}
