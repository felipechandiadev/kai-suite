use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::paths;

const TRIAL_DAYS: i64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialFile {
    pub started_at: String,
    pub ends_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum TrialStatus {
    #[serde(rename = "trial")]
    Active { days_left: i64, ends_at: String },
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "none")]
    None,
}

pub fn start_trial() -> Result<TrialStatus, String> {
    if paths::trial_path().exists() {
        return Ok(trial_status());
    }
    let started = Utc::now();
    let ends = started + Duration::days(TRIAL_DAYS);
    let file = TrialFile {
        started_at: started.to_rfc3339(),
        ends_at: ends.to_rfc3339(),
    };
    let raw = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    std::fs::write(paths::trial_path(), raw).map_err(|e| e.to_string())?;
    Ok(TrialStatus::Active {
        days_left: TRIAL_DAYS,
        ends_at: file.ends_at,
    })
}

pub fn trial_status() -> TrialStatus {
    let Ok(raw) = std::fs::read_to_string(paths::trial_path()) else {
        return TrialStatus::None;
    };
    let Ok(file) = serde_json::from_str::<TrialFile>(&raw) else {
        return TrialStatus::None;
    };
    let Ok(ends) = chrono::DateTime::parse_from_rfc3339(&file.ends_at) else {
        return TrialStatus::None;
    };
    let now = Utc::now();
    if now > ends.with_timezone(&Utc) {
        return TrialStatus::Expired;
    }
    let days_left = (ends.with_timezone(&Utc) - now).num_days().max(0);
    TrialStatus::Active {
        days_left,
        ends_at: file.ends_at,
    }
}
