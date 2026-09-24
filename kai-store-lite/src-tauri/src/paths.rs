use std::path::PathBuf;

pub fn app_data_dir() -> PathBuf {
    let base = dirs_fallback();
    let dir = base.join("KaiStore Lite");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn business_db_path() -> PathBuf {
    app_data_dir().join("business.sqlite")
}

pub fn print_db_path() -> PathBuf {
    app_data_dir().join("print.sqlite")
}

pub fn license_path() -> PathBuf {
    app_data_dir().join("license.json")
}

pub fn trial_path() -> PathBuf {
    app_data_dir().join("trial.json")
}

fn dirs_fallback() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        if let Some(d) = std::env::var_os("HOME") {
            return PathBuf::from(d).join("Library/Application Support");
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(d) = std::env::var_os("APPDATA") {
            return PathBuf::from(d);
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
            let xdg = xdg.trim();
            if !xdg.is_empty() {
                return PathBuf::from(xdg);
            }
        }
        if let Some(d) = std::env::var_os("HOME") {
            return PathBuf::from(d).join(".local/share");
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        if let Some(d) = std::env::var_os("HOME") {
            return PathBuf::from(d).join(".local/share");
        }
    }

    std::env::temp_dir()
}
