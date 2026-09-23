use crate::license::{
    activate_with_code, current_status, machine_fingerprint, save_license, start_trial,
    verify_license_json, LicenseStatusDto,
};

#[tauri::command]
pub fn license_status() -> LicenseStatusDto {
    current_status()
}

#[tauri::command]
pub fn license_fingerprint() -> String {
    machine_fingerprint()
}

#[tauri::command]
pub fn license_start_trial() -> Result<LicenseStatusDto, String> {
    start_trial()?;
    Ok(current_status())
}

/// Activación con código corto (SHA embebidos). Queda atada al fingerprint.
#[tauri::command]
pub fn license_activate_code(code: String) -> Result<LicenseStatusDto, String> {
    activate_with_code(&code)
}

/// Compat: JSON firmado Ed25519 (emisión externa).
#[tauri::command]
pub fn license_activate(payload_json: String) -> Result<LicenseStatusDto, String> {
    let file = verify_license_json(&payload_json)?;
    save_license(&file)?;
    Ok(current_status())
}
