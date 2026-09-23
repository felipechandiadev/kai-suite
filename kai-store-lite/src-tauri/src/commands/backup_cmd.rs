#[tauri::command]
pub fn backup_export() -> Result<String, String> {
    crate::backup::export_backup()
}

#[tauri::command]
pub fn backup_restore() -> Result<(), String> {
    crate::backup::restore_backup()
}
