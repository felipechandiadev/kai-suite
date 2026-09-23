use rfd::FileDialog;

use crate::paths;

pub fn restore_backup() -> Result<(), String> {
    let file = FileDialog::new()
        .add_filter("SQLite", &["sqlite", "db"])
        .set_title("Restaurar backup KaiStore Lite")
        .pick_file()
        .ok_or_else(|| "Cancelado".to_string())?;
    let dest = paths::business_db_path();
    std::fs::copy(&file, &dest).map_err(|e| e.to_string())?;
    Ok(())
}
