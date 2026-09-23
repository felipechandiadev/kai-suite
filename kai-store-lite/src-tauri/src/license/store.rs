use serde::{Deserialize, Serialize};

use crate::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseFile {
    pub payload: serde_json::Value,
    pub signature: String,
}

pub fn load_license() -> Option<LicenseFile> {
    let path = paths::license_path();
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn save_license(file: &LicenseFile) -> Result<(), String> {
    let path = paths::license_path();
    let raw = serde_json::to_string_pretty(file).map_err(|e| e.to_string())?;
    std::fs::write(path, raw).map_err(|e| e.to_string())
}
