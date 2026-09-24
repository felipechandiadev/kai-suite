use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::paths;

const CONFIG_ID: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintConfig {
    pub display_name: String,
    /// Nombre de la impresora del SO; vacío = predeterminada del sistema.
    pub system_printer_name: String,
    /// `58mm` | `80mm`
    pub paper_profile: String,
    pub auto_cut_enabled: bool,
    pub enabled: bool,
    /// Imprimir ticket al confirmar venta.
    #[serde(default = "default_true")]
    pub auto_print_sale: bool,
    /// Imprimir comprobante al abrir caja.
    #[serde(default = "default_true")]
    pub auto_print_cash_opening: bool,
    /// Imprimir comprobante al cerrar caja.
    #[serde(default = "default_true")]
    pub auto_print_cash_closing: bool,
    /// Copias del ticket de venta (1–2).
    #[serde(default = "default_copies")]
    pub sale_ticket_copies: u8,
    /// Pie de ticket (venta). Vacío = sin pie.
    #[serde(default = "default_footer")]
    pub ticket_footer: String,
    #[serde(default = "default_true")]
    pub show_company_rut: bool,
    #[serde(default = "default_true")]
    pub show_company_address: bool,
    #[serde(default = "default_true")]
    pub show_company_phone: bool,
    /// Pulso ESC/POS abrir cajón al imprimir venta.
    #[serde(default)]
    pub open_cash_drawer: bool,
    /// `cp850` | `cp437` | `utf8`
    #[serde(default = "default_encoding")]
    pub text_encoding: String,
    /// Prefijo de montos en tickets (ej. `$`).
    #[serde(default = "default_currency_symbol")]
    pub currency_symbol: String,
}

fn default_true() -> bool {
    true
}

fn default_copies() -> u8 {
    1
}

fn default_footer() -> String {
    "Gracias".into()
}

fn default_encoding() -> String {
    "cp850".into()
}

fn default_currency_symbol() -> String {
    "$".into()
}

impl Default for PrintConfig {
    fn default() -> Self {
        Self {
            display_name: "Ticket caja".into(),
            system_printer_name: String::new(),
            paper_profile: "80mm".into(),
            auto_cut_enabled: true,
            enabled: true,
            auto_print_sale: true,
            auto_print_cash_opening: true,
            auto_print_cash_closing: true,
            sale_ticket_copies: 1,
            ticket_footer: "Gracias".into(),
            show_company_rut: true,
            show_company_address: true,
            show_company_phone: true,
            open_cash_drawer: false,
            text_encoding: "cp850".into(),
            currency_symbol: "$".into(),
        }
    }
}

fn open() -> Result<Connection, String> {
    let path = paths::print_db_path();
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS print_config (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            system_printer_name TEXT NOT NULL DEFAULT '',
            paper_profile TEXT NOT NULL DEFAULT '80mm',
            auto_cut_enabled INTEGER NOT NULL DEFAULT 1,
            enabled INTEGER NOT NULL DEFAULT 1
         );",
    )
    .map_err(|e| e.to_string())?;

    migrate_columns(&conn)?;

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM print_config WHERE id = ?1",
            [CONFIG_ID],
            |r| r.get(0),
        )
        .unwrap_or(0);
    if count == 0 {
        let legacy = conn
            .query_row(
                "SELECT name, connection FROM printer_mappings WHERE id = 'default-sale' LIMIT 1",
                [],
                |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
            )
            .ok();
        let mut cfg = PrintConfig::default();
        if let Some((name, connection)) = legacy {
            cfg.display_name = name;
            if connection != "system-default" {
                cfg.system_printer_name = connection;
            }
        }
        insert_config(&conn, &cfg)?;
    }
    Ok(conn)
}

fn migrate_columns(conn: &Connection) -> Result<(), String> {
    let alters = [
        "ALTER TABLE print_config ADD COLUMN auto_print_sale INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN auto_print_cash_opening INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN auto_print_cash_closing INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN sale_ticket_copies INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN ticket_footer TEXT NOT NULL DEFAULT 'Gracias'",
        "ALTER TABLE print_config ADD COLUMN show_company_rut INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN show_company_address INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN show_company_phone INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE print_config ADD COLUMN open_cash_drawer INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE print_config ADD COLUMN text_encoding TEXT NOT NULL DEFAULT 'cp850'",
        "ALTER TABLE print_config ADD COLUMN currency_symbol TEXT NOT NULL DEFAULT '$'",
    ];
    for sql in alters {
        let _ = conn.execute_batch(sql);
    }
    Ok(())
}

fn insert_config(conn: &Connection, cfg: &PrintConfig) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO print_config (
            id, display_name, system_printer_name, paper_profile, auto_cut_enabled, enabled,
            auto_print_sale, auto_print_cash_opening, auto_print_cash_closing,
            sale_ticket_copies, ticket_footer,
            show_company_rut, show_company_address, show_company_phone,
            open_cash_drawer, text_encoding, currency_symbol
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        rusqlite::params![
            CONFIG_ID,
            cfg.display_name,
            cfg.system_printer_name,
            cfg.paper_profile,
            if cfg.auto_cut_enabled { 1 } else { 0 },
            if cfg.enabled { 1 } else { 0 },
            if cfg.auto_print_sale { 1 } else { 0 },
            if cfg.auto_print_cash_opening { 1 } else { 0 },
            if cfg.auto_print_cash_closing { 1 } else { 0 },
            cfg.sale_ticket_copies as i64,
            cfg.ticket_footer,
            if cfg.show_company_rut { 1 } else { 0 },
            if cfg.show_company_address { 1 } else { 0 },
            if cfg.show_company_phone { 1 } else { 0 },
            if cfg.open_cash_drawer { 1 } else { 0 },
            cfg.text_encoding,
            cfg.currency_symbol,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn normalize_paper_profile(raw: &str) -> String {
    match raw.trim().to_lowercase().as_str() {
        "58mm" | "58" => "58mm".into(),
        _ => "80mm".into(),
    }
}

fn normalize_copies(n: u8) -> u8 {
    if n >= 2 {
        2
    } else {
        1
    }
}

fn normalize_encoding(raw: &str) -> String {
    match raw.trim().to_lowercase().as_str() {
        "cp437" | "ibm437" => "cp437".into(),
        "utf8" | "utf-8" => "utf8".into(),
        _ => "cp850".into(),
    }
}

fn normalize_currency_symbol(raw: &str) -> String {
    let t: String = raw.trim().chars().take(4).collect();
    if t.is_empty() {
        "$".into()
    } else {
        t
    }
}

fn col_bool(r: &rusqlite::Row<'_>, idx: usize, default: bool) -> bool {
    r.get::<_, i64>(idx)
        .map(|v| v != 0)
        .unwrap_or(default)
}

pub fn get_config() -> Result<PrintConfig, String> {
    let conn = open()?;
    conn.query_row(
        "SELECT display_name, system_printer_name, paper_profile, auto_cut_enabled, enabled,
                auto_print_sale, auto_print_cash_opening, auto_print_cash_closing,
                sale_ticket_copies, ticket_footer,
                show_company_rut, show_company_address, show_company_phone,
                open_cash_drawer, text_encoding, currency_symbol
         FROM print_config WHERE id = ?1",
        [CONFIG_ID],
        |r| {
            let copies = r.get::<_, i64>(8).unwrap_or(1).clamp(1, 2) as u8;
            let footer: String = r
                .get::<_, String>(9)
                .unwrap_or_else(|_| "Gracias".into());
            let encoding: String = r
                .get::<_, String>(14)
                .unwrap_or_else(|_| "cp850".into());
            let currency: String = r
                .get::<_, String>(15)
                .unwrap_or_else(|_| "$".into());
            Ok(PrintConfig {
                display_name: r.get(0)?,
                system_printer_name: r.get(1)?,
                paper_profile: normalize_paper_profile(&r.get::<_, String>(2)?),
                auto_cut_enabled: r.get::<_, i64>(3)? != 0,
                enabled: r.get::<_, i64>(4)? != 0,
                auto_print_sale: col_bool(r, 5, true),
                auto_print_cash_opening: col_bool(r, 6, true),
                auto_print_cash_closing: col_bool(r, 7, true),
                sale_ticket_copies: normalize_copies(copies),
                ticket_footer: footer,
                show_company_rut: col_bool(r, 10, true),
                show_company_address: col_bool(r, 11, true),
                show_company_phone: col_bool(r, 12, true),
                open_cash_drawer: col_bool(r, 13, false),
                text_encoding: normalize_encoding(&encoding),
                currency_symbol: normalize_currency_symbol(&currency),
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn save_config(mut cfg: PrintConfig) -> Result<PrintConfig, String> {
    cfg.display_name = cfg.display_name.trim().to_string();
    if cfg.display_name.is_empty() {
        cfg.display_name = "Ticket caja".into();
    }
    cfg.system_printer_name = cfg.system_printer_name.trim().to_string();
    cfg.paper_profile = normalize_paper_profile(&cfg.paper_profile);
    cfg.sale_ticket_copies = normalize_copies(cfg.sale_ticket_copies);
    cfg.ticket_footer = cfg.ticket_footer.trim().to_string();
    cfg.text_encoding = normalize_encoding(&cfg.text_encoding);
    cfg.currency_symbol = normalize_currency_symbol(&cfg.currency_symbol);
    let conn = open()?;
    insert_config(&conn, &cfg)?;
    Ok(cfg)
}

/// Compat: un solo “mapping” virtual desde la config única.
#[derive(Debug, Clone, Serialize)]
pub struct PrinterMapping {
    pub id: String,
    pub name: String,
    pub purpose: String,
    pub connection: String,
}

pub fn list_mappings() -> Result<Vec<PrinterMapping>, String> {
    let cfg = get_config()?;
    let connection = if cfg.system_printer_name.is_empty() {
        "system-default".into()
    } else {
        cfg.system_printer_name.clone()
    };
    Ok(vec![PrinterMapping {
        id: CONFIG_ID.into(),
        name: cfg.display_name,
        purpose: "POS_SALE".into(),
        connection,
    }])
}
