use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::activation_hashes::{ACTIVATION_CODE_HASHES, ACTIVATION_SALT};
use super::fingerprint::machine_fingerprint;
use super::store::{load_license, save_license, LicenseFile};
use super::trial::{trial_status, TrialStatus};

/// Public key for Lite licenses (demo / replace in production via env LITE_LICENSE_PUBKEY_HEX).
const DEFAULT_PUBKEY_HEX: &str =
    "0000000000000000000000000000000000000000000000000000000000000000";

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum LicenseStatusDto {
    #[serde(rename = "licensed")]
    Licensed {
        #[serde(rename = "companyName")]
        company_name: String,
        #[serde(rename = "expiresAt")]
        expires_at: Option<String>,
    },
    #[serde(rename = "trial")]
    Trial {
        #[serde(rename = "daysLeft")]
        days_left: i64,
        #[serde(rename = "endsAt")]
        ends_at: String,
    },
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "none")]
    None,
}

pub fn current_status() -> LicenseStatusDto {
    if let Some(file) = load_license() {
        if let Ok(dto) = status_from_license(&file) {
            return dto;
        }
    }
    match trial_status() {
        TrialStatus::Active { days_left, ends_at } => LicenseStatusDto::Trial { days_left, ends_at },
        TrialStatus::Expired => LicenseStatusDto::Expired,
        TrialStatus::None => LicenseStatusDto::None,
    }
}

fn status_from_license(file: &LicenseFile) -> Result<LicenseStatusDto, String> {
    verify_license_json(&serde_json::to_string(file).map_err(|e| e.to_string())?)?;
    let company = file
        .payload
        .get("companyName")
        .and_then(|v| v.as_str())
        .unwrap_or("Licensed")
        .to_string();
    let expires = file
        .payload
        .get("expiresAt")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    Ok(LicenseStatusDto::Licensed {
        company_name: company,
        expires_at: expires,
    })
}

pub fn verify_license_json(payload_json: &str) -> Result<LicenseFile, String> {
    let file: LicenseFile =
        serde_json::from_str(payload_json).map_err(|e| format!("JSON inválido: {e}"))?;

    let fp = file
        .payload
        .get("fingerprint")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Licencia sin fingerprint".to_string())?;
    if fp != machine_fingerprint() {
        return Err("Licencia no corresponde a esta máquina".into());
    }

    // Activación local (botón): atada al fingerprint, sin firma Ed25519.
    if file.signature.trim() == "LOCAL_BIND"
        && file
            .payload
            .get("mode")
            .and_then(|v| v.as_str())
            == Some("local-bind")
    {
        return Ok(file);
    }

    let pubkey_hex = std::env::var("LITE_LICENSE_PUBKEY_HEX").unwrap_or_else(|_| DEFAULT_PUBKEY_HEX.into());
    // Zero pubkey = accept signature check skipped in dev (still fingerprint-bound)
    if pubkey_hex.chars().all(|c| c == '0') {
        return Ok(file);
    }

    let pk_bytes = hex::decode(&pubkey_hex).map_err(|e| e.to_string())?;
    let pk_arr: [u8; 32] = pk_bytes
        .try_into()
        .map_err(|_| "pubkey debe ser 32 bytes".to_string())?;
    let verifying = VerifyingKey::from_bytes(&pk_arr).map_err(|e| e.to_string())?;

    let msg = canonical_payload(&file.payload)?;
    let sig_bytes = base64::engine::general_purpose::STANDARD
        .decode(file.signature.trim())
        .map_err(|e| format!("signature base64: {e}"))?;
    let sig = Signature::from_slice(&sig_bytes).map_err(|e| e.to_string())?;
    verifying
        .verify(msg.as_bytes(), &sig)
        .map_err(|_| "Firma inválida".to_string())?;
    Ok(file)
}

fn canonical_payload(v: &Value) -> Result<String, String> {
    serde_json::to_string(v).map_err(|e| e.to_string())
}

/// Activa esta máquina: guarda licencia local perpetua atada al fingerprint actual.
pub fn activate_this_machine() -> Result<LicenseStatusDto, String> {
    let fp = machine_fingerprint();
    let file = LicenseFile {
        payload: serde_json::json!({
            "fingerprint": fp,
            "companyName": "Equipo activado",
            "mode": "local-bind",
            "activatedAt": chrono::Utc::now().to_rfc3339(),
            "expiresAt": serde_json::Value::Null,
        }),
        signature: "LOCAL_BIND".into(),
    };
    save_license(&file)?;
    Ok(current_status())
}

fn normalize_activation_code(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn hash_activation_code(normalized: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(ACTIVATION_SALT.as_bytes());
    hasher.update(normalized.as_bytes());
    hex::encode(hasher.finalize())
}

/// Valida un código corto contra los SHA embebidos y, si ok, hace bind a esta máquina.
pub fn activate_with_code(code: &str) -> Result<LicenseStatusDto, String> {
    let normalized = normalize_activation_code(code);
    if normalized.len() < 6 {
        return Err("Código de activación inválido".into());
    }
    let digest = hash_activation_code(&normalized);
    let ok = ACTIVATION_CODE_HASHES
        .iter()
        .any(|h| h.eq_ignore_ascii_case(&digest));
    if !ok {
        return Err("Código de activación inválido".into());
    }
    activate_this_machine()
}
