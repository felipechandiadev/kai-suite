//! SQLite: settings, printer mapping lines, print_jobs (pending/error; done rows deleted).

use anyhow::{Context, Result};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Arc;

pub struct PendingJob {
    pub id: String,
    pub payload_ref: String,
    pub purpose: Option<String>,
    pub copies: i32,
    /** Si viene informado: imprimir sólo en esta impresora (p. ej. prueba desde una línea de mapeo). */
    pub target_system_printer: Option<String>,
    /** Impresora térmica en red (IP/host, puerto RAW 9100). */
    pub target_network_host: Option<String>,
    pub document_type: Option<String>,
    /** Tipo agente (`pos-sale-ticket`, etc.) para gaveta y logs; distinto de document_type de negocio. */
    pub agent_print_type: Option<String>,
    pub format: Option<String>,
    /** `escpos_file` (default) | `ticket_json` */
    pub payload_kind: Option<String>,
    /** JSON del ticket cuando payload_kind = ticket_json */
    pub payload_ticket_json: Option<String>,
    pub created_at: Option<String>,
}

/// Destino de impresión resuelto desde una línea de mapeo.
#[derive(Clone, Debug, Default)]
pub struct PrintTarget {
    pub system_printer: Option<String>,
    pub network_host: Option<String>,
}

impl PrintTarget {
    pub fn is_configured(&self) -> bool {
        self.system_printer
            .as_ref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false)
            || self
                .network_host
                .as_ref()
                .map(|s| !s.trim().is_empty())
                .unwrap_or(false)
    }

    /** Para logs / resolución POS: nombre SO o `red:host`. */
    pub fn display_string(&self) -> Option<String> {
        if let Some(p) = self
            .system_printer
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            return Some(p.to_string());
        }
        self.network_host
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|h| format!("red:{h}"))
    }
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS printer_mappings (
  purpose TEXT PRIMARY KEY,
  printer_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS printer_mapping_lines (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  purpose TEXT,
  filename TEXT,
  payload_ref TEXT,
  copies INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  started_at TEXT,
  printed_at TEXT,
  error TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  client_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  document_type TEXT,
  internal_folio TEXT,
  source_app TEXT,
  requested_by TEXT,
  target_system_printer TEXT
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_priority ON print_jobs(priority DESC, created_at ASC);
"#;

#[derive(Clone)]
pub struct Db {
    inner: Arc<Mutex<Connection>>,
}

fn migrate_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS printer_mapping_lines (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT
);
CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);
"#,
    )?;

    let n: i64 = conn.query_row(
        "SELECT COUNT(*) FROM printer_mapping_lines",
        [],
        |r| r.get(0),
    )?;
    if n == 0 {
        let mut stmt = conn.prepare("SELECT purpose, printer_name FROM printer_mappings")?;
        let rows = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (purpose, printer_name) = row?;
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO printer_mapping_lines(id, purpose, system_printer_name, sort_order, display_label)
                 VALUES(?1, ?2, ?3, 0, NULL)",
                params![id, purpose, printer_name],
            )?;
        }
    }

    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    for col in [
        "document_type",
        "internal_folio",
        "source_app",
        "requested_by",
        "target_system_printer",
    ] {
        if !cols.iter().any(|c| c == col) {
            conn.execute(
                &format!("ALTER TABLE print_jobs ADD COLUMN {col} TEXT"),
                [],
            )?;
        }
    }

    let _ = conn.execute("DELETE FROM print_jobs WHERE status = 'done'", []);

    Ok(())
}

/// Alias (`display_label`) no repetible entre líneas (trim, no vacío). Índice parcial si la BD ya está limpia.
/// Limpia ajustes obsoletos (token, orígenes, host custom) — v1 local usa defaults fijos.
fn migrate_v3(conn: &Connection) -> Result<()> {
    for key in ["shared_token", "allowed_origins_json", "listen_host"] {
        let _ = conn.execute("DELETE FROM settings WHERE key = ?1", params![key]);
    }
    Ok(())
}

/// Corte automático por línea de mapeo (impresora del sistema).
fn migrate_v4(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if cols.iter().any(|c| c == "auto_cut_enabled") {
        return Ok(());
    }
    conn.execute(
        "ALTER TABLE printer_mapping_lines ADD COLUMN auto_cut_enabled INTEGER NOT NULL DEFAULT 1",
        [],
    )?;
    let global_off: bool = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'auto_cut_enabled'",
            [],
            |r| {
                let v: String = r.get(0)?;
                Ok(v.trim().eq_ignore_ascii_case("false"))
            },
        )
        .unwrap_or(false);
    if global_off {
        conn.execute("UPDATE printer_mapping_lines SET auto_cut_enabled = 0", [])?;
    }
    Ok(())
}

fn json_auto_cut_enabled(row: &serde_json::Value) -> bool {
    row.get("autoCutEnabled")
        .and_then(|v| {
            v.as_bool()
                .or_else(|| v.as_i64().map(|n| n != 0))
                .or_else(|| v.as_u64().map(|n| n != 0))
        })
        .unwrap_or(true)
}

fn json_drawer_open_enabled(row: &serde_json::Value) -> bool {
    row.get("drawerOpenEnabled")
        .and_then(|v| {
            v.as_bool()
                .or_else(|| v.as_i64().map(|n| n != 0))
                .or_else(|| v.as_u64().map(|n| n != 0))
        })
        .unwrap_or(false)
}

/// Motor ESC/POS directo (RAW) para tickets en esta línea de mapeo.
fn json_ticket_escpos_enabled(row: &serde_json::Value) -> bool {
    row.get("ticketEscposEnabled")
        .and_then(|v| {
            v.as_bool()
                .or_else(|| v.as_i64().map(|n| n != 0))
                .or_else(|| v.as_u64().map(|n| n != 0))
        })
        .unwrap_or(false)
}

fn json_ticket_logo_enabled(row: &serde_json::Value) -> bool {
    row.get("ticketLogoEnabled")
        .and_then(|v| {
            v.as_bool()
                .or_else(|| v.as_i64().map(|n| n != 0))
                .or_else(|| v.as_u64().map(|n| n != 0))
        })
        .unwrap_or(false)
}

/// Tickets térmicos: ESC/POS RAW en lugar de PDF (Ghostscript en Windows).
fn migrate_v5(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if cols.iter().any(|c| c == "ticket_escpos_enabled") {
        return Ok(());
    }
    conn.execute(
        "ALTER TABLE printer_mapping_lines ADD COLUMN ticket_escpos_enabled INTEGER NOT NULL DEFAULT 0",
        [],
    )?;
    Ok(())
}

/// Logo de ticket por línea (ruta relativa bajo app_data_dir, p. ej. `ticket_logos/{id}.png`).
fn migrate_v6(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if cols.iter().any(|c| c == "ticket_logo_path") {
        return Ok(());
    }
    conn.execute(
        "ALTER TABLE printer_mapping_lines ADD COLUMN ticket_logo_path TEXT",
        [],
    )?;
    Ok(())
}

/// Activar logo de ticket por línea (independiente de si hay archivo guardado).
fn migrate_v7(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if cols.iter().any(|c| c == "ticket_logo_enabled") {
        return Ok(());
    }
    conn.execute(
        "ALTER TABLE printer_mapping_lines ADD COLUMN ticket_logo_enabled INTEGER NOT NULL DEFAULT 0",
        [],
    )?;
    conn.execute(
        "UPDATE printer_mapping_lines SET ticket_logo_enabled = 1
         WHERE ticket_logo_path IS NOT NULL AND trim(ticket_logo_path) != ''",
        [],
    )?;
    Ok(())
}

/// Apertura de gaveta (ESC p) por línea de tickets.
fn migrate_v10(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if cols.iter().any(|c| c == "drawer_open_enabled") {
        return Ok(());
    }
    conn.execute(
        "ALTER TABLE printer_mapping_lines ADD COLUMN drawer_open_enabled INTEGER NOT NULL DEFAULT 0",
        [],
    )?;
    Ok(())
}

fn json_ticket_printer_type(row: &serde_json::Value) -> &str {
    row.get("ticketPrinterType")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("system")
}

/// Tickets en red + `system_printer_name` nullable.
fn migrate_v9(conn: &Connection) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !cols.iter().any(|c| c == "ticket_printer_type") {
        conn.execute(
            "ALTER TABLE printer_mapping_lines ADD COLUMN ticket_printer_type TEXT NOT NULL DEFAULT 'system'",
            [],
        )?;
    }
    if !cols.iter().any(|c| c == "ticket_network_host") {
        conn.execute(
            "ALTER TABLE printer_mapping_lines ADD COLUMN ticket_network_host TEXT",
            [],
        )?;
    }

    let notnull: i32 = conn
        .query_row(
            "SELECT \"notnull\" FROM pragma_table_info('printer_mapping_lines') WHERE name = 'system_printer_name'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(1);
    if notnull != 0 {
        conn.execute_batch(
            r#"
CREATE TABLE printer_mapping_lines_v9 (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT,
  auto_cut_enabled INTEGER NOT NULL DEFAULT 1,
  ticket_escpos_enabled INTEGER NOT NULL DEFAULT 0,
  ticket_logo_path TEXT,
  ticket_logo_enabled INTEGER NOT NULL DEFAULT 0,
  ticket_printer_type TEXT NOT NULL DEFAULT 'system',
  ticket_network_host TEXT
);
INSERT INTO printer_mapping_lines_v9(
  id, purpose, system_printer_name, sort_order, display_label,
  auto_cut_enabled, ticket_escpos_enabled, ticket_logo_path, ticket_logo_enabled,
  ticket_printer_type, ticket_network_host
)
SELECT
  id, purpose,
  CASE WHEN trim(COALESCE(system_printer_name, '')) = '' THEN NULL ELSE trim(system_printer_name) END,
  sort_order, display_label,
  auto_cut_enabled, ticket_escpos_enabled, ticket_logo_path, ticket_logo_enabled,
  COALESCE(ticket_printer_type, 'system'), ticket_network_host
FROM printer_mapping_lines;
DROP TABLE printer_mapping_lines;
ALTER TABLE printer_mapping_lines_v9 RENAME TO printer_mapping_lines;
CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);
"#,
        )?;
    }

    let job_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !job_cols.iter().any(|c| c == "target_network_host") {
        conn.execute(
            "ALTER TABLE print_jobs ADD COLUMN target_network_host TEXT",
            [],
        )?;
    }
    Ok(())
}

/// Elimina mapeos del propósito `reports` (ya no soportado).
fn migrate_v8(conn: &Connection) -> Result<()> {
    conn.execute(
        "DELETE FROM printer_mapping_lines WHERE purpose = 'reports'",
        [],
    )?;
    conn.execute(
        "DELETE FROM printer_mappings WHERE purpose = 'reports'",
        [],
    )?;
    Ok(())
}

fn query_ticket_logo_enabled_by_label(
    conn: &Connection,
    purpose: &str,
    display_label: &str,
) -> Result<Option<i32>> {
    let mut stmt = conn.prepare(
        "SELECT ticket_logo_enabled FROM printer_mapping_lines
         WHERE purpose = ?1 AND lower(trim(display_label)) = lower(trim(?2))
         ORDER BY sort_order ASC, id ASC LIMIT 1",
    )?;
    let mut rows = stmt.query(params![purpose, display_label])?;
    if let Some(r) = rows.next()? {
        return Ok(Some(r.get(0)?));
    }
    Ok(None)
}

fn query_ticket_logo_enabled_by_network_host(
    conn: &Connection,
    purpose: &str,
    network_host: &str,
) -> Result<Option<i32>> {
    let mut stmt = conn.prepare(
        "SELECT ticket_logo_enabled FROM printer_mapping_lines
         WHERE purpose = ?1 AND trim(ticket_network_host) = trim(?2)
           AND lower(trim(ticket_printer_type)) = 'network'
         ORDER BY sort_order ASC, id ASC LIMIT 1",
    )?;
    let mut rows = stmt.query(params![purpose, network_host])?;
    if let Some(r) = rows.next()? {
        return Ok(Some(r.get(0)?));
    }
    Ok(None)
}

fn query_ticket_logo_enabled_by_system_printer(
    conn: &Connection,
    purpose: &str,
    system_printer: &str,
) -> Result<Option<i32>> {
    let mut stmt = conn.prepare(
        "SELECT ticket_logo_enabled FROM printer_mapping_lines
         WHERE purpose = ?1 AND trim(system_printer_name) = trim(?2)
         ORDER BY sort_order ASC, id ASC LIMIT 1",
    )?;
    let mut rows = stmt.query(params![purpose, system_printer])?;
    if let Some(r) = rows.next()? {
        return Ok(Some(r.get(0)?));
    }
    Ok(None)
}

fn logo_action_from_enabled(
    enabled: i32,
    has_global_logo: bool,
) -> crate::ticket_logos::MappingLogoAction {
    if enabled == 0 {
        return crate::ticket_logos::MappingLogoAction::Suppress;
    }
    if has_global_logo {
        crate::ticket_logos::MappingLogoAction::ApplyGlobal
    } else {
        crate::ticket_logos::MappingLogoAction::ApplyKaiDefault
    }
}

/// Logo global único + quitar `ticket_logo_path` por línea.
fn migrate_v12(conn: &Connection, data_dir: &std::path::Path) -> Result<()> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !cols.iter().any(|c| c == "ticket_logo_path") {
        return Ok(());
    }

    crate::ticket_logos::consolidate_per_line_logos_to_global(data_dir, conn)?;

    conn.execute_batch(
        r#"
CREATE TABLE printer_mapping_lines_v12 (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT,
  auto_cut_enabled INTEGER NOT NULL DEFAULT 1,
  ticket_escpos_enabled INTEGER NOT NULL DEFAULT 0,
  ticket_logo_enabled INTEGER NOT NULL DEFAULT 0,
  ticket_printer_type TEXT NOT NULL DEFAULT 'system',
  ticket_network_host TEXT,
  drawer_open_enabled INTEGER NOT NULL DEFAULT 0,
  paper_profile TEXT NOT NULL DEFAULT '80mm'
);
INSERT INTO printer_mapping_lines_v12(
  id, purpose, system_printer_name, sort_order, display_label,
  auto_cut_enabled, ticket_escpos_enabled, ticket_logo_enabled,
  ticket_printer_type, ticket_network_host, drawer_open_enabled, paper_profile
)
SELECT
  id, purpose, system_printer_name, sort_order, display_label,
  auto_cut_enabled, ticket_escpos_enabled, ticket_logo_enabled,
  COALESCE(ticket_printer_type, 'system'), ticket_network_host,
  COALESCE(drawer_open_enabled, 0), COALESCE(paper_profile, '80mm')
FROM printer_mapping_lines;
DROP TABLE printer_mapping_lines;
ALTER TABLE printer_mapping_lines_v12 RENAME TO printer_mapping_lines;
CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);
"#,
    )?;
    Ok(())
}

fn migrate_v11(conn: &Connection) -> Result<()> {
    let mapping_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(printer_mapping_lines)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !mapping_cols.iter().any(|c| c == "paper_profile") {
        conn.execute(
            "ALTER TABLE printer_mapping_lines ADD COLUMN paper_profile TEXT NOT NULL DEFAULT '80mm'",
            [],
        )?;
    }
    let job_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !job_cols.iter().any(|c| c == "format") {
        conn.execute(
            "ALTER TABLE print_jobs ADD COLUMN format TEXT",
            [],
        )?;
    }
    Ok(())
}

/// Tipo agente (`pos-sale-ticket`, etc.) en cola de impresión — usado para gaveta.
fn migrate_v13(conn: &Connection) -> Result<()> {
    let job_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !job_cols.iter().any(|c| c == "agent_print_type") {
        conn.execute(
            "ALTER TABLE print_jobs ADD COLUMN agent_print_type TEXT",
            [],
        )?;
    }
    Ok(())
}

/// Cola: JSON de ticket en worker (`ticket_json`) vs archivo ESC/POS/PDF listo.
fn migrate_v14(conn: &Connection) -> Result<()> {
    let job_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !job_cols.iter().any(|c| c == "payload_kind") {
        conn.execute(
            "ALTER TABLE print_jobs ADD COLUMN payload_kind TEXT NOT NULL DEFAULT 'escpos_file'",
            [],
        )?;
    }
    if !job_cols.iter().any(|c| c == "payload_ticket_json") {
        conn.execute(
            "ALTER TABLE print_jobs ADD COLUMN payload_ticket_json TEXT",
            [],
        )?;
    }
    Ok(())
}

fn migrate_v2(conn: &Connection) -> Result<()> {
    let sql = r#"
CREATE UNIQUE INDEX IF NOT EXISTS idx_mapping_lines_display_label_unique
ON printer_mapping_lines(display_label)
WHERE display_label IS NOT NULL AND trim(display_label) != ''
"#;
    if let Err(e) = conn.execute(sql, []) {
        tracing::warn!(
            error = %e,
            "idx_mapping_lines_display_label_unique: omitido (puede haber alias duplicados en datos existentes). Se valida al guardar líneas."
        );
    }
    Ok(())
}

fn validate_unique_trimmed_display_labels(lines: &[serde_json::Value]) -> Result<()> {
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    for row in lines {
        let Some(raw) = row.get("displayLabel").and_then(|v| v.as_str()) else {
            continue;
        };
        let t = raw.trim();
        if t.is_empty() {
            continue;
        }
        if !seen.insert(t.to_lowercase()) {
            anyhow::bail!("display_label_alias_duplicate:{t}");
        }
    }
    Ok(())
}

impl Db {
    pub fn open(dir: &PathBuf) -> Result<Self> {
        std::fs::create_dir_all(dir).ok();
        let path = dir.join("print_service.sqlite3");
        let conn = Connection::open(&path)
            .with_context(|| format!("open sqlite {}", path.display()))?;
        conn.execute_batch(SCHEMA).context("schema")?;
        migrate_v1(&conn).context("migrate_v1")?;
        migrate_v2(&conn).context("migrate_v2")?;
        migrate_v3(&conn).context("migrate_v3")?;
        migrate_v4(&conn).context("migrate_v4")?;
        migrate_v5(&conn).context("migrate_v5")?;
        migrate_v6(&conn).context("migrate_v6")?;
        migrate_v7(&conn).context("migrate_v7")?;
        migrate_v8(&conn).context("migrate_v8")?;
        migrate_v9(&conn).context("migrate_v9")?;
        migrate_v10(&conn).context("migrate_v10")?;
        migrate_v11(&conn).context("migrate_v11")?;
        migrate_v12(&conn, dir.as_path()).context("migrate_v12")?;
        migrate_v13(&conn).context("migrate_v13")?;
        migrate_v14(&conn).context("migrate_v14")?;
        Ok(Self {
            inner: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn global_ticket_logo_path(&self) -> Result<Option<String>> {
        Ok(self
            .get_setting(crate::ticket_logos::GLOBAL_LOGO_SETTING_KEY)?
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()))
    }

    pub fn set_global_ticket_logo_path(&self, rel_path: &str) -> Result<()> {
        self.set_setting(crate::ticket_logos::GLOBAL_LOGO_SETTING_KEY, rel_path)
    }

    pub fn clear_global_ticket_logo_path(&self) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "DELETE FROM settings WHERE key = ?1",
            params![crate::ticket_logos::GLOBAL_LOGO_SETTING_KEY],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let c = self.inner.lock();
        let mut stmt = c
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .context("prepare")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(r) = rows.next()? {
            let v: String = r.get(0)?;
            return Ok(Some(v));
        }
        Ok(None)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "INSERT INTO settings(key, value) VALUES(?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn default_listen_port() -> u16 {
        14567
    }

    pub fn default_wss_port() -> u16 {
        14568
    }

    /// `0.0.0.0` = aceptar conexiones WS desde otros equipos en la LAN (tablets, POS remoto).
    pub fn default_listen_host() -> &'static str {
        "0.0.0.0"
    }

    pub fn default_agent_display_name() -> &'static str {
        "Kai Printers"
    }

    pub fn agent_display_name(&self) -> String {
        self.get_setting("agent_display_name")
            .ok()
            .flatten()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| Self::default_agent_display_name().to_string())
    }

    /// Corte CUPS según la línea de mapeo (impresora + propósito). Por defecto activado.
    pub fn auto_cut_enabled_for_printer(&self, system_printer_name: &str, purpose: &str) -> bool {
        let name = system_printer_name.trim();
        if name.is_empty() {
            return true;
        }
        let c = self.inner.lock();
        let mut stmt = match c.prepare(
            "SELECT auto_cut_enabled FROM printer_mapping_lines
             WHERE trim(system_printer_name) = trim(?1) AND purpose = ?2
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        ) {
            Ok(s) => s,
            Err(_) => return true,
        };
        let mut rows = match stmt.query(params![name, purpose]) {
            Ok(r) => r,
            Err(_) => return true,
        };
        if let Some(row) = rows.next().ok().flatten() {
            if let Ok(v) = row.get::<_, i32>(0) {
                return v != 0;
            }
        }
        let mut fallback = match c.prepare(
            "SELECT auto_cut_enabled FROM printer_mapping_lines
             WHERE trim(system_printer_name) = trim(?1)
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        ) {
            Ok(s) => s,
            Err(_) => return true,
        };
        let mut rows = match fallback.query(params![name]) {
            Ok(r) => r,
            Err(_) => return true,
        };
        if let Some(row) = rows.next().ok().flatten() {
            if let Ok(v) = row.get::<_, i32>(0) {
                return v != 0;
            }
        }
        true
    }

    /// Destino de impresión: alias POS o primera línea configurada (SO o red).
    pub fn resolve_print_target_for_enqueue(
        &self,
        purpose: &str,
        display_label: Option<&str>,
    ) -> Result<Option<PrintTarget>> {
        if let Some(lbl) = display_label.map(str::trim).filter(|s| !s.is_empty()) {
            return self.print_target_for_purpose_display_label(purpose, lbl);
        }
        self.default_print_target_for_purpose(purpose)
    }

    /// Primera línea de mapeo con impresora SO o host de red configurado.
    pub fn default_print_target_for_purpose(&self, purpose: &str) -> Result<Option<PrintTarget>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT system_printer_name, ticket_printer_type, ticket_network_host
             FROM printer_mapping_lines
             WHERE purpose = ?1
             ORDER BY sort_order ASC, id ASC",
        )?;
        let mut rows = stmt.query(params![purpose])?;
        while let Some(r) = rows.next()? {
            let system_printer_name: Option<String> = r.get(0)?;
            let ticket_printer_type: String = r.get(1)?;
            let ticket_network_host: Option<String> = r.get(2)?;
            let target = Self::print_target_from_row(
                purpose,
                &ticket_printer_type,
                system_printer_name,
                ticket_network_host,
            );
            if target.is_configured() {
                return Ok(Some(target));
            }
        }
        drop(rows);
        drop(stmt);
        let mut leg = c.prepare("SELECT printer_name FROM printer_mappings WHERE purpose = ?1")?;
        let mut lr = leg.query(params![purpose])?;
        if let Some(r) = lr.next()? {
            let name: String = r.get(0)?;
            let t = name.trim();
            if !t.is_empty() {
                return Ok(Some(PrintTarget {
                    system_printer: Some(t.to_string()),
                    network_host: None,
                }));
            }
        }
        Ok(None)
    }

    pub fn listen_host(&self) -> String {
        self.get_setting("listen_host")
            .ok()
            .flatten()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| Self::default_listen_host().to_string())
    }

    pub fn listen_port(&self) -> u16 {
        self.get_setting("listen_port")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok())
            .unwrap_or(Self::default_listen_port())
    }

    pub fn wss_listen_port(&self) -> u16 {
        self.get_setting("wss_listen_port")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok())
            .unwrap_or(Self::default_wss_port())
    }

    pub fn set_allowed_origins_json(&self, json: &str) -> Result<()> {
        self.set_setting("allowed_origins_json", json)
    }

    /// Legacy 1:1 mappings (compat / migración).
    pub fn get_mappings(&self) -> Result<Vec<(String, String)>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare("SELECT purpose, printer_name FROM printer_mappings ORDER BY purpose")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.collect::<Result<Vec<_>, _>>()
            .context("mappings")
    }

    pub fn set_mapping(&self, purpose: &str, printer_name: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "INSERT INTO printer_mappings(purpose, printer_name) VALUES(?1, ?2)
             ON CONFLICT(purpose) DO UPDATE SET printer_name = excluded.printer_name",
            params![purpose, printer_name],
        )?;
        Ok(())
    }

    pub fn clear_mapping(&self, purpose: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "DELETE FROM printer_mappings WHERE purpose = ?1",
            params![purpose],
        )?;
        Ok(())
    }

    /// Orden failover: líneas por `sort_order`, y si no hay líneas la tabla legacy `printer_mappings`.
    pub fn printers_for_purpose_ordered(&self, purpose: &str) -> Result<Vec<String>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT system_printer_name FROM printer_mapping_lines
             WHERE purpose = ?1 AND system_printer_name IS NOT NULL AND trim(system_printer_name) != ''
             ORDER BY sort_order ASC, id ASC",
        )?;
        let rows = stmt.query_map(params![purpose], |r| r.get::<_, String>(0))?;
        let mut names: Vec<String> = rows.collect::<Result<Vec<_>, _>>()?;
        if names.is_empty() {
            let mut leg = c.prepare("SELECT printer_name FROM printer_mappings WHERE purpose = ?1")?;
            let mut lr = leg.query(params![purpose])?;
            if let Some(r) = lr.next()? {
                names.push(r.get(0)?);
            }
        }
        Ok(names)
    }

    /// Logo según switch de la línea que imprimirá y logo global del agente.
    pub fn ticket_logo_action_for_enqueue(
        &self,
        purpose: &str,
        display_label: Option<&str>,
    ) -> Result<crate::ticket_logos::MappingLogoAction> {
        if purpose != "tickets" {
            return Ok(crate::ticket_logos::MappingLogoAction::LeaveTicketAsIs);
        }
        let enabled = self.ticket_logo_enabled_for_enqueue(purpose, display_label)?;
        if !enabled {
            return Ok(crate::ticket_logos::MappingLogoAction::Suppress);
        }
        let has_global = self
            .global_ticket_logo_path()?
            .is_some();
        Ok(logo_action_from_enabled(1, has_global))
    }

    pub fn ticket_logo_enabled_for_enqueue(
        &self,
        purpose: &str,
        display_label: Option<&str>,
    ) -> Result<bool> {
        if purpose != "tickets" {
            return Ok(false);
        }
        let c = self.inner.lock();
        if let Some(lbl) = display_label.map(str::trim).filter(|s| !s.is_empty()) {
            if let Some(en) = query_ticket_logo_enabled_by_label(&c, purpose, lbl)? {
                return Ok(en != 0);
            }
        }
        drop(c);
        if let Some(target) = self.resolve_print_target_for_enqueue(purpose, display_label)? {
            let c = self.inner.lock();
            if let Some(host) = target
                .network_host
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                if let Some(en) = query_ticket_logo_enabled_by_network_host(&c, purpose, host)? {
                    return Ok(en != 0);
                }
            }
            if let Some(pr) = target
                .system_printer
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                if let Some(en) = query_ticket_logo_enabled_by_system_printer(&c, purpose, pr)? {
                    return Ok(en != 0);
                }
            }
        }
        Ok(false)
    }

    pub fn list_mapping_lines(&self) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, purpose, system_printer_name, sort_order, display_label, auto_cut_enabled, ticket_escpos_enabled, ticket_logo_enabled, ticket_printer_type, ticket_network_host, drawer_open_enabled, paper_profile
             FROM printer_mapping_lines ORDER BY purpose, sort_order ASC, id ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            let auto_cut: i32 = r.get(5)?;
            let ticket_escpos: i32 = r.get(6)?;
            let ticket_logo_enabled: i32 = r.get(7)?;
            let ticket_printer_type: String = r.get(8)?;
            let ticket_network_host: Option<String> = r.get(9)?;
            let drawer_open: i32 = r.get(10)?;
            let paper_profile: String = r.get(11)?;
            let system_printer_name: Option<String> = r.get(2)?;
            Ok(serde_json::json!({
                "id": r.get::<_, String>(0)?,
                "purpose": r.get::<_, String>(1)?,
                "systemPrinterName": system_printer_name.filter(|s| !s.trim().is_empty()),
                "sortOrder": r.get::<_, i32>(3)?,
                "displayLabel": r.get::<_, Option<String>>(4)?,
                "autoCutEnabled": auto_cut != 0,
                "ticketEscposEnabled": ticket_escpos != 0,
                "ticketLogoEnabled": ticket_logo_enabled != 0,
                "ticketPrinterType": ticket_printer_type,
                "ticketNetworkHost": ticket_network_host.filter(|s| !s.trim().is_empty()),
                "drawerOpenEnabled": drawer_open != 0,
                "paperProfile": paper_profile,
            }))
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    fn print_target_from_row(
        purpose: &str,
        ticket_printer_type: &str,
        system_printer_name: Option<String>,
        ticket_network_host: Option<String>,
    ) -> PrintTarget {
        if purpose == "tickets" && ticket_printer_type.trim().eq_ignore_ascii_case("network") {
            let host = ticket_network_host
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            return PrintTarget {
                system_printer: None,
                network_host: host,
            };
        }
        let sp = system_printer_name
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        PrintTarget {
            system_printer: sp,
            network_host: None,
        }
    }

    /// Resuelve `display_label` (alias) + propósito al destino de impresión de esa línea.
    pub fn print_target_for_purpose_display_label(
        &self,
        purpose: &str,
        display_label: &str,
    ) -> Result<Option<PrintTarget>> {
        let t = display_label.trim();
        if t.is_empty() {
            return Ok(None);
        }
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT system_printer_name, ticket_printer_type, ticket_network_host FROM printer_mapping_lines
             WHERE purpose = ?1 AND lower(trim(display_label)) = lower(trim(?2))
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        )?;
        let mut rows = stmt.query(params![purpose, t])?;
        if let Some(r) = rows.next()? {
            let system_printer_name: Option<String> = r.get(0)?;
            let ticket_printer_type: String = r.get(1)?;
            let ticket_network_host: Option<String> = r.get(2)?;
            return Ok(Some(Self::print_target_from_row(
                purpose,
                &ticket_printer_type,
                system_printer_name,
                ticket_network_host,
            )));
        }
        Ok(None)
    }

    /// Lista de alias por propósito (solo `display_label` no vacío, sin repetir, orden de failover).
    pub fn paper_profile_by_alias_json(&self) -> Result<serde_json::Value> {
        let lines = self.list_mapping_lines()?;
        let mut root = serde_json::Map::new();
        for line in &lines {
            if let (Some(alias), Some(profile)) = (
                line.get("displayLabel").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()),
                line.get("paperProfile").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty()),
            ) {
                root.insert(alias.to_string(), serde_json::Value::String(profile.to_string()));
            }
        }
        Ok(serde_json::Value::Object(root))
    }

    pub fn paper_profile_for_mapping_line(
        &self,
        purpose: &str,
        display_label: Option<&str>,
    ) -> Result<String> {
        if let Some(lbl) = display_label.map(str::trim).filter(|s| !s.is_empty()) {
            if self.print_target_for_purpose_display_label(purpose, lbl)?.is_some() {
                let c = self.inner.lock();
                let mut stmt = c.prepare(
                    "SELECT paper_profile FROM printer_mapping_lines
                     WHERE purpose = ?1 AND lower(trim(display_label)) = lower(trim(?2))
                     ORDER BY sort_order ASC LIMIT 1",
                )?;
                let mut rows = stmt.query(params![purpose, lbl])?;
                if let Some(r) = rows.next()? {
                    return Ok(r.get::<_, String>(0)?);
                }
            }
        }
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT paper_profile FROM printer_mapping_lines
             WHERE purpose = ?1 ORDER BY sort_order ASC LIMIT 1",
        )?;
        let mut rows = stmt.query(params![purpose])?;
        if let Some(r) = rows.next()? {
            return Ok(r.get::<_, String>(0)?);
        }
        Ok(crate::print_formats::PaperProfile::default_for_purpose(purpose).storage_value().to_string())
    }

    /// Perfil de papel de la línea de tickets según impresora del SO o host en red.
    pub fn paper_profile_for_ticket_line(
        &self,
        purpose: &str,
        system_printer: Option<&str>,
        network_host: Option<&str>,
    ) -> String {
        let default = || {
            crate::print_formats::PaperProfile::default_for_purpose(purpose)
                .storage_value()
                .to_string()
        };
        if let Some(h) = network_host.map(str::trim).filter(|s| !s.is_empty()) {
            let c = self.inner.lock();
            let mut stmt = match c.prepare(
                "SELECT paper_profile FROM printer_mapping_lines
                 WHERE purpose = ?1 AND trim(ticket_network_host) = trim(?2)
                   AND lower(trim(ticket_printer_type)) = 'network'
                 ORDER BY sort_order ASC, id ASC LIMIT 1",
            ) {
                Ok(s) => s,
                Err(_) => return default(),
            };
            let mut rows = match stmt.query(params![purpose, h]) {
                Ok(r) => r,
                Err(_) => return default(),
            };
            if let Ok(Some(row)) = rows.next() {
                if let Ok(v) = row.get::<_, String>(0) {
                    return v;
                }
            }
        }
        if let Some(p) = system_printer.map(str::trim).filter(|s| !s.is_empty()) {
            let c = self.inner.lock();
            let mut stmt = match c.prepare(
                "SELECT paper_profile FROM printer_mapping_lines
                 WHERE purpose = ?1 AND trim(system_printer_name) = trim(?2)
                 ORDER BY sort_order ASC, id ASC LIMIT 1",
            ) {
                Ok(s) => s,
                Err(_) => return default(),
            };
            let mut rows = match stmt.query(params![purpose, p]) {
                Ok(r) => r,
                Err(_) => return default(),
            };
            if let Ok(Some(row)) = rows.next() {
                if let Ok(v) = row.get::<_, String>(0) {
                    return v;
                }
            }
        }
        default()
    }

    pub fn aliases_by_purpose_json(&self) -> Result<serde_json::Value> {
        const PURPOSES: &[&str] = &["documents", "tickets", "labels"];
        let lines = self.list_mapping_lines()?;
        let mut root = serde_json::Map::new();
        for purpose in PURPOSES {
            let mut seen = std::collections::HashSet::new();
            let mut arr = Vec::new();
            for line in &lines {
                let p = line
                    .get("purpose")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if p != *purpose {
                    continue;
                }
                if let Some(s) = line.get("displayLabel").and_then(|v| v.as_str()) {
                    let t = s.trim();
                    if !t.is_empty() && seen.insert(t.to_lowercase()) {
                        arr.push(serde_json::Value::String(t.to_string()));
                    }
                }
            }
            root.insert(
                (*purpose).to_string(),
                serde_json::Value::Array(arr),
            );
        }
        Ok(serde_json::Value::Object(root))
    }

    /// Alias único (case-insensitive), excluyendo la línea que se está guardando.
    pub fn validate_display_label_unique(&self, label: &str, exclude_id: Option<&str>) -> Result<()> {
        let t = label.trim();
        if t.is_empty() {
            return Ok(());
        }
        let exclude = exclude_id.unwrap_or("");
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id FROM printer_mapping_lines
             WHERE lower(trim(display_label)) = lower(trim(?1))
               AND (trim(?2) = '' OR id != ?2)
             LIMIT 1",
        )?;
        let mut rows = stmt.query(params![t, exclude])?;
        if rows.next()?.is_some() {
            anyhow::bail!("display_label_alias_duplicate:{t}");
        }
        Ok(())
    }

    pub fn upsert_mapping_line(&self, row: &serde_json::Value) -> Result<()> {
        let id = row
            .get("id")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .ok_or_else(|| anyhow::anyhow!("line missing id"))?;
        let purpose = row
            .get("purpose")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("line missing purpose"))?;
        let ticket_printer_type = if purpose == "tickets" {
            json_ticket_printer_type(row).to_string()
        } else {
            "system".to_string()
        };
        let network_line =
            purpose == "tickets" && ticket_printer_type.eq_ignore_ascii_case("network");
        let system_printer_name: Option<String> = if network_line {
            None
        } else {
            let name = row
                .get("systemPrinterName")
                .and_then(|v| {
                    if v.is_null() {
                        None
                    } else {
                        v.as_str().map(str::trim).filter(|s| !s.is_empty())
                    }
                })
                .map(String::from);
            if name.is_none() {
                anyhow::bail!("line missing systemPrinterName");
            }
            name
        };
        let ticket_network_host: Option<String> = if network_line {
            let host = row
                .get("ticketNetworkHost")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(String::from);
            if host.is_none() {
                anyhow::bail!("ticket_network_host_required");
            }
            host
        } else {
            None
        };
        let paper_profile = row
            .get("paperProfile")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| {
                if purpose == "documents" { "a4" } else { "80mm" }
            });
        let sort_order = row
            .get("sortOrder")
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
        let display_label = row.get("displayLabel").and_then(|v| v.as_str());
        if let Some(lbl) = display_label {
            self.validate_display_label_unique(lbl, Some(id))?;
        }
        let auto_cut: i32 = if json_auto_cut_enabled(row) { 1 } else { 0 };
        let drawer_open: i32 = if purpose == "tickets" && json_drawer_open_enabled(row) {
            1
        } else {
            0
        };
        let ticket_escpos: i32 = if json_ticket_escpos_enabled(row) { 1 } else { 0 };
        let ticket_logo_enabled: i32 = if purpose == "tickets" && json_ticket_logo_enabled(row) {
            1
        } else {
            0
        };
        let c = self.inner.lock();
        c.execute(
            "INSERT INTO printer_mapping_lines(id, purpose, system_printer_name, sort_order, display_label, auto_cut_enabled, ticket_escpos_enabled, ticket_logo_enabled, ticket_printer_type, ticket_network_host, drawer_open_enabled, paper_profile)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET
               purpose = excluded.purpose,
               system_printer_name = excluded.system_printer_name,
               sort_order = excluded.sort_order,
               display_label = excluded.display_label,
               auto_cut_enabled = excluded.auto_cut_enabled,
               ticket_escpos_enabled = excluded.ticket_escpos_enabled,
               ticket_logo_enabled = excluded.ticket_logo_enabled,
               ticket_printer_type = excluded.ticket_printer_type,
               ticket_network_host = excluded.ticket_network_host,
               drawer_open_enabled = excluded.drawer_open_enabled,
               paper_profile = excluded.paper_profile",
            params![
                id,
                purpose,
                system_printer_name,
                sort_order,
                display_label,
                auto_cut,
                ticket_escpos,
                ticket_logo_enabled,
                ticket_printer_type,
                ticket_network_host,
                drawer_open,
                paper_profile,
            ],
        )?;
        Ok(())
    }

    pub fn delete_mapping_line(&self, line_id: &str) -> Result<bool> {
        let id = line_id.trim();
        if id.is_empty() {
            return Ok(false);
        }
        let c = self.inner.lock();
        let n = c.execute(
            "DELETE FROM printer_mapping_lines WHERE id = ?1",
            params![id],
        )?;
        Ok(n > 0)
    }

    pub fn replace_all_mapping_lines(&self, lines: &[serde_json::Value]) -> Result<()> {
        validate_unique_trimmed_display_labels(lines)?;
        let mut c = self.inner.lock();
        let tx = c.transaction()?;
        tx.execute("DELETE FROM printer_mapping_lines", [])?;
        for (idx, row) in lines.iter().enumerate() {
            let id = row
                .get("id")
                .and_then(|v| v.as_str())
                .map(String::from)
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let purpose = row
                .get("purpose")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("line missing purpose"))?;
            let ticket_printer_type = if purpose == "tickets" {
                json_ticket_printer_type(row).to_string()
            } else {
                "system".to_string()
            };
            let network_line =
                purpose == "tickets" && ticket_printer_type.eq_ignore_ascii_case("network");
            let system_printer_name: Option<String> = if network_line {
                None
            } else {
                let name = row
                    .get("systemPrinterName")
                    .and_then(|v| {
                        if v.is_null() {
                            None
                        } else {
                            v.as_str().map(str::trim).filter(|s| !s.is_empty())
                        }
                    })
                    .map(String::from);
                if name.is_none() {
                    anyhow::bail!("line missing systemPrinterName");
                }
                name
            };
            let ticket_network_host: Option<String> = if network_line {
                row.get("ticketNetworkHost")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(String::from)
            } else {
                None
            };
            let paper_profile = row
            .get("paperProfile")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| {
                if purpose == "documents" { "a4" } else { "80mm" }
            });
        let sort_order = row
                .get("sortOrder")
                .and_then(|v| v.as_i64())
                .unwrap_or(idx as i64) as i32;
            let display_label = row
                .get("displayLabel")
                .and_then(|v| v.as_str());
            let auto_cut: i32 = if json_auto_cut_enabled(row) { 1 } else { 0 };
            let drawer_open: i32 = if purpose == "tickets" && json_drawer_open_enabled(row) {
                1
            } else {
                0
            };
            let ticket_escpos: i32 = if json_ticket_escpos_enabled(row) { 1 } else { 0 };
            let ticket_logo_enabled: i32 = if purpose == "tickets" && json_ticket_logo_enabled(row) {
                1
            } else {
                0
            };
            tx.execute(
                "INSERT INTO printer_mapping_lines(id, purpose, system_printer_name, sort_order, display_label, auto_cut_enabled, ticket_escpos_enabled, ticket_logo_enabled, ticket_printer_type, ticket_network_host, drawer_open_enabled, paper_profile)
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![
                    id,
                    purpose,
                    system_printer_name,
                    sort_order,
                    display_label,
                    auto_cut,
                    ticket_escpos,
                    ticket_logo_enabled,
                    ticket_printer_type,
                    ticket_network_host,
                    drawer_open,
                    paper_profile,
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn insert_job(
        &self,
        id: &str,
        purpose: Option<&str>,
        filename: &str,
        payload_ref: &str,
        copies: i32,
        client_id: Option<&str>,
        priority: i32,
        document_type: Option<&str>,
        internal_folio: Option<&str>,
        source_app: Option<&str>,
        requested_by: Option<&str>,
        target_system_printer: Option<&str>,
        target_network_host: Option<&str>,
        format: Option<&str>,
        agent_print_type: Option<&str>,
        payload_kind: Option<&str>,
        payload_ticket_json: Option<&str>,
    ) -> Result<()> {
        let c = self.inner.lock();
        let now = Utc::now().to_rfc3339();
        let kind = payload_kind.unwrap_or("escpos_file");
        c.execute(
            "INSERT INTO print_jobs(id, status, purpose, filename, payload_ref, copies, created_at, client_id, priority,
             document_type, internal_folio, source_app, requested_by, target_system_printer, target_network_host, format, agent_print_type,
             payload_kind, payload_ticket_json)
             VALUES(?1, 'pending', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                id,
                purpose,
                filename,
                payload_ref,
                copies,
                now,
                client_id,
                priority,
                document_type,
                internal_folio,
                source_app,
                requested_by,
                target_system_printer,
                target_network_host,
                format,
                agent_print_type,
                kind,
                payload_ticket_json,
            ],
        )?;
        Ok(())
    }

    pub fn auto_cut_enabled_for_ticket_network_host(&self, host: &str, purpose: &str) -> bool {
        let h = host.trim();
        if h.is_empty() || purpose != "tickets" {
            return false;
        }
        let c = self.inner.lock();
        let Ok(mut stmt) = c.prepare(
            "SELECT auto_cut_enabled FROM printer_mapping_lines
             WHERE purpose = ?1 AND trim(ticket_network_host) = trim(?2)
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        ) else {
            return true;
        };
        let Ok(mut rows) = stmt.query(params![purpose, h]) else {
            return true;
        };
        if let Ok(Some(r)) = rows.next() {
            if let Ok(v) = r.get::<_, i32>(0) {
                return v != 0;
            }
        }
        true
    }

    pub fn drawer_open_enabled_for_printer(&self, system_printer_name: &str, purpose: &str) -> bool {
        let name = system_printer_name.trim();
        if name.is_empty() || purpose != "tickets" {
            return false;
        }
        let c = self.inner.lock();
        let Ok(mut stmt) = c.prepare(
            "SELECT drawer_open_enabled FROM printer_mapping_lines
             WHERE purpose = ?1 AND trim(system_printer_name) = trim(?2)
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        ) else {
            return false;
        };
        let Ok(mut rows) = stmt.query(params![purpose, name]) else {
            return false;
        };
        if let Ok(Some(r)) = rows.next() {
            if let Ok(v) = r.get::<_, i32>(0) {
                return v != 0;
            }
        }
        false
    }

    pub fn drawer_open_enabled_for_ticket_network_host(&self, host: &str, purpose: &str) -> bool {
        let h = host.trim();
        if h.is_empty() || purpose != "tickets" {
            return false;
        }
        let c = self.inner.lock();
        let Ok(mut stmt) = c.prepare(
            "SELECT drawer_open_enabled FROM printer_mapping_lines
             WHERE purpose = ?1 AND trim(ticket_network_host) = trim(?2)
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        ) else {
            return false;
        };
        let Ok(mut rows) = stmt.query(params![purpose, h]) else {
            return false;
        };
        if let Ok(Some(r)) = rows.next() {
            if let Ok(v) = r.get::<_, i32>(0) {
                return v != 0;
            }
        }
        false
    }

    pub fn next_pending_job(&self) -> Result<Option<PendingJob>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, payload_ref, purpose, copies, target_system_printer, document_type, target_network_host, format, agent_print_type,
                    payload_kind, payload_ticket_json, created_at
             FROM print_jobs WHERE status = 'pending'
             ORDER BY priority DESC, created_at ASC LIMIT 1",
        )?;
        let mut rows = stmt.query([])?;
        if let Some(r) = rows.next()? {
            return Ok(Some(PendingJob {
                id: r.get(0)?,
                payload_ref: r.get(1)?,
                purpose: r.get(2)?,
                copies: r.get(3)?,
                target_system_printer: r.get(4)?,
                document_type: r.get(5)?,
                target_network_host: r.get(6)?,
                format: r.get(7)?,
                agent_print_type: r.get(8)?,
                payload_kind: r.get(9)?,
                payload_ticket_json: r.get(10)?,
                created_at: r.get(11)?,
            }));
        }
        Ok(None)
    }

    pub fn update_job_status(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        let c = self.inner.lock();
        let now = Utc::now().to_rfc3339();
        match status {
            "printing" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, started_at = ?3, error = NULL WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            "done" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3, error = NULL WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            "error" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3, error = ?4 WHERE id = ?1",
                    params![id, status, now, error.unwrap_or("unknown")],
                )?;
            }
            "cancelled" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3 WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            _ => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2 WHERE id = ?1",
                    params![id, status],
                )?;
            }
        }
        Ok(())
    }

    pub fn delete_job(&self, id: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute("DELETE FROM print_jobs WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn bump_retry(&self, id: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "UPDATE print_jobs SET retry_count = retry_count + 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn retry_count(&self, id: &str) -> Result<i32> {
        let c = self.inner.lock();
        let n: i32 = c.query_row(
            "SELECT retry_count FROM print_jobs WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )?;
        Ok(n)
    }

    /// Historial genérico (incluye done si quedara alguno tras migraciones).
    #[allow(dead_code)]
    pub fn list_jobs(&self, limit: i32) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, status, purpose, filename, copies, created_at, printed_at, error, priority, client_id, retry_count,
                    document_type, internal_folio, source_app, requested_by, target_system_printer
             FROM print_jobs ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], job_row_to_json)?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Cola UI: pendientes, en impresión y fallidos (sin done).
    pub fn list_jobs_queue(&self, limit: i32) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, status, purpose, filename, copies, created_at, printed_at, error, priority, client_id, retry_count,
                    document_type, internal_folio, source_app, requested_by, target_system_printer
             FROM print_jobs
             WHERE status IN ('pending', 'printing', 'error')
             ORDER BY
               CASE status WHEN 'printing' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
               priority DESC, created_at ASC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], job_row_to_json)?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Quita un trabajo de la cola UI (pending / printing / error): borra la fila y el PDF temporal si aplica.
    pub fn dismiss_queue_job(&self, id: &str) -> Result<bool> {
        let c = self.inner.lock();
        match c.query_row(
            "SELECT payload_ref FROM print_jobs WHERE id = ?1 AND status IN ('pending', 'printing', 'error')",
            params![id],
            |r| r.get::<_, Option<String>>(0),
        ) {
            Ok(Some(p)) if !p.is_empty() => {
                let _ = std::fs::remove_file(std::path::Path::new(&p));
            }
            Ok(_) => {}
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
            Err(e) => return Err(e.into()),
        }
        let n = c.execute(
            "DELETE FROM print_jobs WHERE id = ?1 AND status IN ('pending', 'printing', 'error')",
            params![id],
        )?;
        Ok(n > 0)
    }

    /// Borra todas las filas visibles en la cola UI (pending, printing, error).
    pub fn dismiss_all_queue_jobs(&self) -> Result<()> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT payload_ref FROM print_jobs WHERE status IN ('pending', 'printing', 'error')",
        )?;
        let paths: Vec<String> = stmt
            .query_map([], |row| {
                let p: Option<String> = row.get(0)?;
                Ok(p.unwrap_or_default())
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(stmt);
        for path in paths.iter().filter(|p| !p.is_empty()) {
            let _ = std::fs::remove_file(std::path::Path::new(path));
        }
        let _ = c.execute(
            "DELETE FROM print_jobs WHERE status IN ('pending', 'printing', 'error')",
            [],
        )?;
        Ok(())
    }

    /// Elimina filas `done` (post-migración a delete-on-success).
    #[allow(dead_code)]
    pub fn purge_done_jobs(&self) -> Result<u64> {
        let c = self.inner.lock();
        let n = c.execute("DELETE FROM print_jobs WHERE status = 'done'", [])?;
        Ok(n as u64)
    }
}

fn job_row_to_json(r: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?,
        "status": r.get::<_, String>(1)?,
        "purpose": r.get::<_, Option<String>>(2)?,
        "filename": r.get::<_, Option<String>>(3)?,
        "copies": r.get::<_, i32>(4)?,
        "createdAt": r.get::<_, String>(5)?,
        "printedAt": r.get::<_, Option<String>>(6)?,
        "error": r.get::<_, Option<String>>(7)?,
        "priority": r.get::<_, i32>(8)?,
        "clientId": r.get::<_, Option<String>>(9)?,
        "retryCount": r.get::<_, i32>(10)?,
        "documentType": r.get::<_, Option<String>>(11)?,
        "internalFolio": r.get::<_, Option<String>>(12)?,
        "sourceApp": r.get::<_, Option<String>>(13)?,
        "requestedBy": r.get::<_, Option<String>>(14)?,
        "targetSystemPrinter": r.get::<_, Option<String>>(15)?,
    }))
}
