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
    if let Some(d) = std::env::var_os("HOME") {
        return PathBuf::from(d).join("Library/Application Support");
    }
    if let Some(d) = std::env::var_os("APPDATA") {
        return PathBuf::from(d);
    }
    std::env::temp_dir()
}
