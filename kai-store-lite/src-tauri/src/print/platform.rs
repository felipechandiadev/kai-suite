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
    match print_raw_windows_spooler(printer, data) {
        Ok(written) => {
            info!(
                printer,
                written,
                expected = data.len(),
                "ESC/POS enviado vía Win32 spooler"
            );
            Ok(())
        }
        Err(spool_err) => {
            tracing::warn!(
                printer,
                err = %spool_err,
                "Win32 spooler falló; intentando copy /B"
            );
            print_raw_windows_copy(printer, data).map_err(|copy_err| {
                format!(
                    "Impresión Windows falló. Spooler: {spool_err}. copy /B: {copy_err}"
                )
            })
        }
    }
}

/// OpenPrinter → StartDoc(RAW) → WritePrinter (mismo flujo que kai-printers-desktop).
#[cfg(target_os = "windows")]
fn print_raw_windows_spooler(printer: &str, data: &[u8]) -> Result<u32, String> {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PWSTR;
    use windows::Win32::Foundation::{BOOL, HANDLE};
    use windows::Win32::Graphics::Printing::*;

    let wide: Vec<u16> = std::ffi::OsStr::new(printer)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut open_datatype: Vec<u16> = "RAW\0".encode_utf16().collect();
    let defaults = PRINTER_DEFAULTSW {
        pDatatype: PWSTR(open_datatype.as_mut_ptr()),
        pDevMode: std::ptr::null_mut(),
        DesiredAccess: PRINTER_ACCESS_USE,
    };
    let mut h_printer = HANDLE::default();
    let mut written: u32 = 0;
    unsafe {
        OpenPrinterW(
            windows::core::PCWSTR(wide.as_ptr()),
            &mut h_printer,
            Some(&defaults),
        )
        .map_err(|e| format!("OpenPrinterW({printer}): {e}"))?;

        let mut doc_name: Vec<u16> = "KaiStore Lite\0".encode_utf16().collect();
        let mut doc_datatype: Vec<u16> = "RAW\0".encode_utf16().collect();
        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name.as_mut_ptr()),
            pOutputFile: PWSTR::null(),
            pDatatype: PWSTR(doc_datatype.as_mut_ptr()),
        };
        let job_id = StartDocPrinterW(h_printer, 1, &doc_info);
        if job_id == 0 {
            let _ = ClosePrinter(h_printer);
            return Err("StartDocPrinterW devolvió 0".into());
        }
        if StartPagePrinter(h_printer) == BOOL(0) {
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);
            return Err("StartPagePrinter falló".into());
        }
        let ok = WritePrinter(
            h_printer,
            data.as_ptr() as *const c_void,
            data.len() as u32,
            &mut written,
        );
        if ok == BOOL(0) {
            let _ = EndPagePrinter(h_printer);
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);
            return Err("WritePrinter falló".into());
        }
        let _ = EndPagePrinter(h_printer);
        let _ = EndDocPrinter(h_printer);
        let _ = ClosePrinter(h_printer);
    }
    Ok(written)
}

/// Respaldo: `copy /B` a `\\localhost\<cola>` con rutas entrecomilladas.
#[cfg(target_os = "windows")]
fn print_raw_windows_copy(printer: &str, data: &[u8]) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let id = uuid::Uuid::new_v4().to_string();
    let path = std::env::temp_dir().join(format!("kai_lite_escpos_{id}.bin"));
    std::fs::write(&path, data).map_err(|e| format!("temp escpos: {e}"))?;
    let dest = format!(r"\\localhost\{printer}");
    let path_s = path.to_string_lossy().replace('"', "");
    let dest_q = dest.replace('"', "");
    // Un solo string tras /C para que cmd respete comillas (espacios en Temp / nombre de cola).
    let cmdline = format!(r#"copy /B "{path_s}" "{dest_q}""#);
    let out = Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", &cmdline])
        .output()
        .map_err(|e| format!("copy /B: {e}"))?;
    let _ = std::fs::remove_file(&path);
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        let stdout = String::from_utf8_lossy(&out.stdout);
        let detail = [stderr.trim(), stdout.trim()]
            .into_iter()
            .find(|s| !s.is_empty())
            .unwrap_or("(sin detalle)")
            .to_string();
        return Err(format!(
            "copy /B a «{dest}» falló (código {:?}): {detail}",
            out.status.code()
        ));
    }
    info!(printer, dest = %dest, bytes = data.len(), "ESC/POS enviado vía copy /B");
    Ok(())
}

fn outbox_dir() -> Result<std::path::PathBuf, String> {
    let dir = crate::paths::app_data_dir().join("print-outbox");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}
