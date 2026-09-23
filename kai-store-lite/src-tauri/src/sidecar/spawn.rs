//! Core Lite sidecar spawn.

use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use once_cell::sync::Lazy;

static CHILD: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

/// Arranca el sidecar si no está vivo (o reintenta tras caída).
pub fn ensure_core_lite(port: u16, app_data: PathBuf) -> Result<(), String> {
    if crate::sidecar::health::probe_health_blocking(port) {
        if !is_running() {
            tracing::info!(port, "Core Lite already healthy on port (unowned process)");
        }
        return Ok(());
    }

    let _ = stop_core_lite();
    free_listen_port(port);
    start_core_lite(port, app_data)
}

pub fn start_core_lite(port: u16, app_data: PathBuf) -> Result<(), String> {
    {
        let mut guard = CHILD.lock().map_err(|e| e.to_string())?;
        if let Some(child) = guard.as_mut() {
            if child.try_wait().map_err(|e| e.to_string())?.is_none() {
                drop(guard);
                if crate::sidecar::health::probe_health_blocking(port) {
                    return Ok(());
                }
                let _ = stop_core_lite();
                free_listen_port(port);
                return start_core_lite(port, app_data);
            }
        }
    }

    let entry = locate_entrypoint()?;
    let lite_root = entry
        .parent()
        .and_then(|p| p.parent())
        .ok_or_else(|| "Ruta inválida para lite-entrypoint.mjs".to_string())?;

    let db = app_data.join("business.sqlite");
    if let Some(parent) = db.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let log_path = app_data.join("core-lite-sidecar.log");
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("log sidecar: {e}"))?;
    let log_err = log_file
        .try_clone()
        .map_err(|e| format!("log sidecar: {e}"))?;

    tracing::info!(
        entry = %entry.display(),
        db = %db.display(),
        port,
        "starting Core Lite sidecar"
    );

    let child = Command::new("node")
        .arg(&entry)
        .current_dir(lite_root)
        .env("KAI_EDITION", "lite")
        .env("KAI_CORE_PORT", port.to_string())
        .env("PORT", port.to_string())
        .env("DB_DATABASE", db.to_string_lossy().to_string())
        .env("LITE_SQLITE_PATH", db.to_string_lossy().to_string())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_err))
        .spawn()
        .map_err(|e| format!("spawn core lite (¿Node instalado?): {e}"))?;

    {
        let mut guard = CHILD.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    if !wait_for_health(port, 90) {
        return Err(format!(
            "Core Lite no respondió en :{port}/api/lite/health — revisa {}",
            log_path.display()
        ));
    }

    tracing::info!("Core Lite sidecar ready on port {port}");
    Ok(())
}

pub fn stop_core_lite() -> Result<(), String> {
    let mut guard = CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

pub fn is_running() -> bool {
    let mut guard = match CHILD.lock() {
        Ok(g) => g,
        Err(_) => return false,
    };
    if let Some(child) = guard.as_mut() {
        matches!(child.try_wait(), Ok(None))
    } else {
        false
    }
}

fn free_listen_port(port: u16) {
    let arg = format!("-tiTCP:{port}");
    let Ok(output) = Command::new("lsof").args([&arg, "-sTCP:LISTEN"]).output() else {
        return;
    };
    if !output.status.success() {
        return;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for pid in stdout.split_whitespace() {
        if pid.chars().all(|c| c.is_ascii_digit()) {
            let _ = Command::new("kill").args(["-9", pid]).status();
        }
    }
    std::thread::sleep(Duration::from_millis(300));
}

fn wait_for_health(port: u16, attempts: u32) -> bool {
    for _ in 0..attempts {
        if crate::sidecar::health::probe_health_blocking(port) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

fn locate_entrypoint() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("KAI_LITE_ENTRYPOINT") {
        let path = PathBuf::from(p);
        if path.exists() {
            return Ok(path.canonicalize().unwrap_or(path));
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("scripts/lite-entrypoint.mjs"));
        candidates.push(cwd.join("../scripts/lite-entrypoint.mjs"));
        candidates.push(cwd.join("kai-store-lite/scripts/lite-entrypoint.mjs"));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("scripts/lite-entrypoint.mjs"));
            candidates.push(dir.join("../scripts/lite-entrypoint.mjs"));
            candidates.push(dir.join("../../scripts/lite-entrypoint.mjs"));
        }
    }

    candidates.push(PathBuf::from("scripts/lite-entrypoint.mjs"));
    candidates.push(PathBuf::from("../scripts/lite-entrypoint.mjs"));

    for c in candidates {
        if c.exists() {
            return Ok(c.canonicalize().unwrap_or(c));
        }
    }

    Err(
        "lite-entrypoint.mjs no encontrado. Ejecuta `npm run tauri:dev` desde kai-store-lite/."
            .into(),
    )
}

#[allow(dead_code)]
fn repo_has_core_dist(lite_root: &Path) -> bool {
    lite_root
        .join("../../kai-core/dist/main.js")
        .exists()
        || lite_root
            .parent()
            .is_some_and(|p| p.join("kai-core/dist/main.js").exists())
}
