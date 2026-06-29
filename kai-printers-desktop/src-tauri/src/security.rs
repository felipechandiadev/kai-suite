//! Ajustes por defecto al iniciar (v1 local: sin token ni filtro de orígenes).

use anyhow::Result;

pub fn ensure_defaults(db: &crate::db::Db) -> Result<()> {
    if db.get_setting("wss_enabled")?.is_none() {
        db.set_setting("wss_enabled", "true")?;
    }
    let missing_or_empty = db
        .get_setting("agent_display_name")?
        .map(|s| s.trim().is_empty())
        .unwrap_or(true);
    if missing_or_empty {
        db.set_setting("agent_display_name", crate::db::Db::default_agent_display_name())?;
    }
    Ok(())
}
