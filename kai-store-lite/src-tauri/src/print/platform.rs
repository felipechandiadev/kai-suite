use tracing::info;

use crate::print::db::get_config;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemPrinterInfo {
    pub name: String,
    #[serde(rename = "default")]
    pub is_default: bool,
    pub online: bool,
}

/// Enumera impresoras del SO (macOS/Linux `lpstat`, Windows PowerShell).
pub fn list_system_printers() -> Result<Vec<SystemPrinterInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        return list_cups();
    }
    #[cfg(target_os = "linux")]
    {
        return list_cups();
    }
    #[cfg(target_os = "windows")]
    {
        return list_windows();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Ok(vec![SystemPrinterInfo {
            name: "stub-printer".into(),
            is_default: true,
            online: true,
        }])
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn list_cups() -> Result<Vec<SystemPrinterInfo>, String> {
    use std::process::Command;

    let default_q = Command::new("lpstat")
        .args(["-d"])
        .output()
        .ok()
        .and_then(|o| {
            if !o.status.success() {
                return None;
            }
            let s = String::from_utf8_lossy(&o.stdout);
            // "system default destination: Name"
            s.split(':').nth(1).map(|p| p.trim().to_string())
        });

    let out = Command::new("lpstat")
        .args(["-a"])
        .output()
        .map_err(|e| format!("lpstat: {e} (¿cups-client instalado?)"))?;
    let mut printers = Vec::new();
    if out.status.success() {
        let s = String::from_utf8_lossy(&out.stdout);
        for line in s.lines() {
            let name = line.split_whitespace().next().unwrap_or("").trim();
            if name.is_empty() {
                continue;
            }
            let online = !line.to_lowercase().contains("disabled");
            let is_default = default_q.as_deref() == Some(name);
            printers.push(SystemPrinterInfo {
                name: name.into(),
                is_default,
                online,
            });
        }
    }
    printers.sort_by(|a, b| a.name.cmp(&b.name));
    printers.dedup_by(|a, b| a.name == b.name);
    Ok(printers)
}

#[cfg(target_os = "windows")]
fn list_windows() -> Result<Vec<SystemPrinterInfo>, String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let script = r#"
Get-CimInstance Win32_Printer | ForEach-Object {
  $def = if ($_.Default) { '1' } else { '0' }
  $on = if ($_.WorkOffline) { '0' } else { '1' }
  $_.Name + "`t" + $def + "`t" + $on
}
"#;
    let out = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Ok(vec![]);
    }
    let s = String::from_utf8_lossy(&out.stdout);
    let mut printers = Vec::new();
    for line in s.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.is_empty() || parts[0].trim().is_empty() {
            continue;
        }
        printers.push(SystemPrinterInfo {
            name: parts[0].trim().into(),
            is_default: parts.get(1).copied() == Some("1"),
            online: parts.get(2).copied() != Some("0"),
        });
    }
    printers.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(printers)
}

/// Resuelve cola: config → default del SO → primera listada.
pub fn resolve_target_printer() -> Result<String, String> {
    let cfg = get_config()?;
    let named = cfg.system_printer_name.trim();
    if !named.is_empty() {
        return Ok(named.to_string());
    }
    let printers = list_system_printers()?;
    if let Some(p) = printers.iter().find(|p| p.is_default) {
        return Ok(p.name.clone());
    }
    if let Some(p) = printers.first() {
        return Ok(p.name.clone());
    }
    Err("No hay impresora del sistema. Configurala en Admin → Impresión.".into())
}

/// Escribe outbox + envía ESC/POS RAW a la impresora configurada.
/// Respeta `enabled` de la config.
pub fn dispatch_escpos(bytes: &[u8], human_label: &str) -> Result<(), String> {
    let cfg = get_config()?;
    if !cfg.enabled {
        return Err("La impresión está deshabilitada en Configuración → Impresión".into());
    }

    // QA / inspección local (siempre, si print enabled).
    write_outbox(bytes, human_label)?;

    let printer = resolve_target_printer()?;
    print_raw_bytes_to_printer(&printer, bytes)?;
    info!(
        printer = %printer,
        bytes = bytes.len(),
        "ESC/POS enviado a impresora"
    );
    Ok(())
}

/// Writes human-readable `.txt` to print-outbox (QA).
#[allow(dead_code)]
pub fn send_raw_text(body: &str) -> Result<(), String> {
    let dir = outbox_dir()?;
    let path = dir.join(format!("job-{}.txt", uuid::Uuid::new_v4()));
    std::fs::write(&path, body).map_err(|e| e.to_string())?;
    info!(path = %path.display(), "print text job written");
    Ok(())
}

fn write_outbox(bytes: &[u8], human_label: &str) -> Result<(), String> {
    let dir = outbox_dir()?;
    let id = uuid::Uuid::new_v4();
    let bin_path = dir.join(format!("job-{id}.bin"));
    let txt_path = dir.join(format!("job-{id}.txt"));

    std::fs::write(&bin_path, bytes).map_err(|e| e.to_string())?;

    let mut human = String::from(human_label);
    if !human.ends_with('\n') {
        human.push('\n');
    }
    human.push_str(&format!("---\nbytes: {}\n", bytes.len()));
    std::fs::write(&txt_path, human).map_err(|e| e.to_string())?;

    info!(
        bin = %bin_path.display(),
        txt = %txt_path.display(),
        "print raw job written to outbox"
    );
    Ok(())
}

fn print_raw_bytes_to_printer(printer: &str, data: &[u8]) -> Result<(), String> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        return print_raw_cups(printer, data);
    }
    #[cfg(target_os = "windows")]
    {
        return print_raw_windows(printer, data);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        info!(printer, len = data.len(), "stub raw print (unsupported OS)");
        Ok(())
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn print_raw_cups(printer: &str, data: &[u8]) -> Result<(), String> {
    use std::process::Command;

    let id = uuid::Uuid::new_v4().to_string();
    let path = std::env::temp_dir().join(format!("kai_lite_escpos_{id}.bin"));
    std::fs::write(&path, data).map_err(|e| format!("temp escpos: {e}"))?;
    let status = Command::new("lp")
        .arg("-d")
        .arg(printer)
        .arg("-o")
        .arg("raw")
        .arg(&path)
        .status()
        .map_err(|e| format!("lp: {e}"))?;
    let _ = std::fs::remove_file(&path);
    if !status.success() {
        return Err(format!(
            "lp -o raw a «{printer}» falló (código {:?})",
            status.code()
        ));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn print_raw_windows(printer: &str, data: &[u8]) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let id = uuid::Uuid::new_v4().to_string();
    let path = std::env::temp_dir().join(format!("kai_lite_escpos_{id}.bin"));
    std::fs::write(&path, data).map_err(|e| format!("temp escpos: {e}"))?;
    let dest = format!(r"\\localhost\{printer}");
    let path_s = path.to_string_lossy().to_string();
    let status = Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", "copy", "/B", &path_s, &dest])
        .status()
        .map_err(|e| format!("copy /B: {e}"))?;
    let _ = std::fs::remove_file(&path);
    if !status.success() {
        return Err(format!(
            "copy /B a «{dest}» falló (código {:?})",
            status.code()
        ));
    }
    Ok(())
}

fn outbox_dir() -> Result<std::path::PathBuf, String> {
    let dir = crate::paths::app_data_dir().join("print-outbox");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}
