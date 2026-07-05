//! OS printers + send PDF path to spooler (macOS `lp`, Windows SumatraPDF `-silent -print-to`).

use anyhow::{Context, Result};
use crate::print_diag;
use serde::Serialize;
#[cfg(target_os = "macos")]
use std::collections::HashMap;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::path::PathBuf;
use std::io::Write;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::process::Command;
use std::time::{Duration, Instant};
use std::sync::Mutex;
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize)]
pub struct PrinterInfo {
    pub name: String,
    #[serde(rename = "default")]
    pub is_default: bool,
    pub online: bool,
}

const SYSTEM_PRINTERS_CACHE_TTL: Duration = Duration::from_secs(8);

struct SystemPrintersCacheEntry {
    fetched_at: Instant,
    printers: Vec<PrinterInfo>,
}

static SYSTEM_PRINTERS_CACHE: OnceLock<Mutex<Option<SystemPrintersCacheEntry>>> = OnceLock::new();

pub fn list_system_printers_cached() -> Result<Vec<PrinterInfo>> {
    let cache = SYSTEM_PRINTERS_CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(guard) = cache.lock() {
        if let Some(entry) = guard.as_ref() {
            if entry.fetched_at.elapsed() < SYSTEM_PRINTERS_CACHE_TTL {
                return Ok(entry.printers.clone());
            }
        }
    }
    let printers = list_system_printers()?;
    if let Ok(mut guard) = cache.lock() {
        *guard = Some(SystemPrintersCacheEntry {
            fetched_at: Instant::now(),
            printers: printers.clone(),
        });
    }
    Ok(printers)
}

pub fn invalidate_system_printers_cache() {
    if let Some(cache) = SYSTEM_PRINTERS_CACHE.get() {
        if let Ok(mut guard) = cache.lock() {
            *guard = None;
        }
    }
}

pub fn list_system_printers() -> Result<Vec<PrinterInfo>> {
    #[cfg(target_os = "macos")]
    {
        return list_mac();
    }
    #[cfg(target_os = "windows")]
    {
        return list_windows();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(vec![PrinterInfo {
            name: "stub-printer".into(),
            is_default: true,
            online: true,
        }])
    }
}

/// Parse `lpstat -a` lines (locale-dependent). Queue name is always first; suffix indicates accepting.
#[cfg(target_os = "macos")]
fn parse_lpstat_a_line(line: &str) -> Option<(String, bool)> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }
    const ACCEPT_SUFFIXES: &[&str] = &[
        " accepting requests since",
        " accepting requests from",
        " acepta peticiones desde",
    ];
    const REJECT_SUFFIXES: &[&str] = &[
        " not accepting requests since",
        " not accepting requests from",
        " no acepta peticiones desde",
    ];
    for suf in ACCEPT_SUFFIXES {
        if let Some(i) = line.find(suf) {
            let name = line[..i].trim();
            if !name.is_empty() {
                return Some((name.to_string(), true));
            }
        }
    }
    for suf in REJECT_SUFFIXES {
        if let Some(i) = line.find(suf) {
            let name = line[..i].trim();
            if !name.is_empty() {
                return Some((name.to_string(), false));
            }
        }
    }
    None
}

/// Parse `lpstat -p` when `-a` is empty (English / Spanish CUPS messages).
#[cfg(target_os = "macos")]
fn parse_lpstat_p_line(line: &str) -> Option<(String, bool)> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }
    let lower = line.to_lowercase();
    let offline = lower.contains("disabled") || lower.contains("deshabilitada");

    // English: "printer NAME is idle" / "printer NAME disabled"
    if let Some(rest) = line.strip_prefix("printer ") {
        let name = rest.split_whitespace().next()?.to_string();
        return Some((name, !offline));
    }
    // Spanish: "la impresora NAME está inactiva..." / "... deshabilitada..."
    if let Some(rest) = line.strip_prefix("la impresora ") {
        let name = rest
            .split_once(" está")
            .or_else(|| rest.split_once(" deshabilitada"))
            .map(|(a, _)| a.trim())
            .filter(|s| !s.is_empty())?;
        return Some((name.to_string(), !offline));
    }
    None
}

#[cfg(target_os = "macos")]
fn mac_default_queue() -> Option<String> {
    let out = Command::new("lpstat").arg("-d").output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    for raw in s.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        let lower = line.to_lowercase();
        if lower.contains("no hay") || lower.contains("no default") {
            continue;
        }
        let colon = line.find(':')?;
        let key = line[..colon].to_lowercase();
        let val = line[colon + 1..].trim();
        if val.is_empty() {
            continue;
        }
        if key.contains("default destination") || key.contains("destino predeterminado") {
            return Some(val.to_string());
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn list_mac() -> Result<Vec<PrinterInfo>> {
    let default_q = mac_default_queue();

    let mut printers: Vec<PrinterInfo> = Vec::new();
    let out_a = Command::new("lpstat").args(["-a"]).output().context("lpstat -a")?;
    if out_a.status.success() {
        let s = String::from_utf8_lossy(&out_a.stdout);
        for line in s.lines() {
            if let Some((name, online)) = parse_lpstat_a_line(line) {
                let is_default = default_q.as_ref() == Some(&name);
                printers.push(PrinterInfo {
                    name,
                    is_default,
                    online,
                });
            }
        }
    } else {
        tracing::warn!(
            status = ?out_a.status,
            stderr = %String::from_utf8_lossy(&out_a.stderr),
            "lpstat -a failed"
        );
    }

    if printers.is_empty() {
        let out_p = Command::new("lpstat").args(["-p"]).output().context("lpstat -p")?;
        if out_p.status.success() {
            let s = String::from_utf8_lossy(&out_p.stdout);
            for line in s.lines() {
                if let Some((name, online)) = parse_lpstat_p_line(line) {
                    let is_default = default_q.as_ref() == Some(&name);
                    printers.push(PrinterInfo {
                        name,
                        is_default,
                        online,
                    });
                }
            }
        } else {
            tracing::warn!(
                status = ?out_p.status,
                stderr = %String::from_utf8_lossy(&out_p.stderr),
                "lpstat -p failed"
            );
        }
    }

    printers.sort_by(|a, b| a.name.cmp(&b.name));
    printers.dedup_by(|a, b| a.name == b.name);
    Ok(printers)
}

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// PowerShell sin ventana de consola (evita flashes en Windows al listar impresoras).
#[cfg(target_os = "windows")]
fn windows_powershell_output(script: &str) -> Result<std::process::Output> {
    use std::os::windows::process::CommandExt;
    Command::new("powershell")
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
        .context("powershell")
}

#[cfg(target_os = "windows")]
fn list_windows() -> Result<Vec<PrinterInfo>> {
    let ps = r#"Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline | ConvertTo-Json"#;
    let out = windows_powershell_output(ps).context("powershell printers")?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        tracing::warn!(
            code = ?out.status.code(),
            %stderr,
            "powershell list printers failed"
        );
        return Ok(vec![]);
    }
    let s = String::from_utf8_lossy(&out.stdout);
    let v: serde_json::Value = serde_json::from_str(s.trim()).unwrap_or(serde_json::Value::Null);
    let mut outv = Vec::new();
    match v {
        serde_json::Value::Array(arr) => {
            for item in arr {
                if let (Some(name), def, off) = (
                    item.get("Name").and_then(|x| x.as_str()),
                    item.get("Default").and_then(|x| x.as_bool()).unwrap_or(false),
                    item.get("WorkOffline").and_then(|x| x.as_bool()).unwrap_or(false),
                ) {
                    outv.push(PrinterInfo {
                        name: name.to_string(),
                        is_default: def,
                        online: !off,
                    });
                }
            }
        }
        serde_json::Value::Object(obj) => {
            if let (Some(name), def, off) = (
                obj.get("Name").and_then(|x| x.as_str()),
                obj.get("Default").and_then(|x| x.as_bool()).unwrap_or(false),
                obj.get("WorkOffline").and_then(|x| x.as_bool()).unwrap_or(false),
            ) {
                outv.push(PrinterInfo {
                    name: name.to_string(),
                    is_default: def,
                    online: !off,
                });
            }
        }
        _ => {}
    }
    Ok(outv)
}

/// Puntaje del valor de corte (mayor = mejor). Valores «sin corte» devuelven -1.
#[cfg(target_os = "macos")]
fn cut_value_score(value: &str) -> i32 {
    let lower = value.trim_start_matches('*').to_lowercase();
    if lower.is_empty()
        || lower.contains("nocut")
        || lower == "none"
        || lower == "0none"
        || lower == "off"
        || lower == "false"
    {
        return -1;
    }
    if lower.contains("fullcut") {
        return 100;
    }
    if lower.contains("partialcut") {
        return 85;
    }
    if lower.contains("endofpage") {
        return 90;
    }
    if lower.contains("endofjob") {
        return 88;
    }
    if lower.contains("everypage") {
        return 87;
    }
    // Epson: FeedCutAfterJobEnd = 1Line, 2Line, … (no 0None)
    if lower.ends_with("line") {
        return 45;
    }
    if matches!(lower.as_str(), "on" | "true" | "1") {
        return 30;
    }
    -1
}

/// Prioriza PageCutType / DocCutType sobre FeedCutAfterJobEnd.
#[cfg(target_os = "macos")]
fn cut_option_key_bonus(option_key: &str) -> i32 {
    let k = option_key.to_lowercase();
    if k.contains("pagecuttype") {
        return 25;
    }
    if k.contains("doccuttype") {
        return 15;
    }
    if k.contains("feedcut") {
        return 5;
    }
    0
}

/// Mejor valor de corte en una línea de `lpoptions -l` (p. ej. `PageCutType=2FullCutPage`).
#[cfg(target_os = "macos")]
fn parse_cups_cut_lp_option(lpoptions_line: &str) -> Option<(i32, String)> {
    let line = lpoptions_line.trim();
    let lower = line.to_lowercase();
    if !(lower.contains("cut") || lower.contains("cutter") || lower.contains("corte")) {
        return None;
    }
    let (_, rhs) = line.split_once(':')?;
    let option_key = line.split_once(':')?.0.split('/').next()?.trim();
    if option_key.is_empty() {
        return None;
    }
    let mut best_score = -1i32;
    let mut best_token = "";
    for t in rhs.split_whitespace() {
        let bare = t.trim_start_matches('*');
        if bare.is_empty() {
            continue;
        }
        let score = cut_value_score(bare);
        if score > best_score {
            best_score = score;
            best_token = bare;
        }
    }
    if best_score < 0 || best_token.is_empty() {
        return None;
    }
    let total = best_score + cut_option_key_bonus(option_key);
    Some((total, format!("{option_key}={best_token}")))
}

#[cfg(target_os = "macos")]
fn cups_cut_option_cache() -> &'static Mutex<HashMap<String, Option<String>>> {
    static CACHE: OnceLock<Mutex<HashMap<String, Option<String>>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Lee `lpoptions -l` y devuelve la mejor opción de corte para tickets (p. ej. `CutMedia=EndOfPage`).
#[cfg(target_os = "macos")]
pub fn detect_cups_cut_option(printer: &str) -> Option<String> {
    let name = printer.trim();
    if name.is_empty() {
        return None;
    }
    if let Ok(cache) = cups_cut_option_cache().lock() {
        if let Some(hit) = cache.get(name) {
            return hit.clone();
        }
    }
    let out = Command::new("lpoptions")
        .args(["-p", name, "-l"])
        .output()
        .ok()?;
    let mut best: Option<(i32, String)> = None;
    if out.status.success() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            if let Some((score, opt)) = parse_cups_cut_lp_option(line) {
                if best.as_ref().map(|(s, _)| score > *s).unwrap_or(true) {
                    best = Some((score, opt));
                }
            }
        }
    }
    let best = best.map(|(_, opt)| opt);
    if let Ok(mut cache) = cups_cut_option_cache().lock() {
        cache.insert(name.to_string(), best.clone());
    }
    best
}

/// Altura de la primera página del PDF en mm (lee `/MediaBox` del PDF generado por printpdf).
pub fn pdf_page_height_mm(pdf_path: &Path) -> Result<f32> {
    const PT_TO_MM: f32 = 0.352_778;
    let bytes = std::fs::read(pdf_path).context("read pdf")?;
    let hay = String::from_utf8_lossy(&bytes);
    let idx = hay.find("/MediaBox").context("MediaBox not found")?;
    let tail = &hay[idx..hay.len().min(idx + 80)];
    let nums: Vec<f32> = tail
        .split(|c: char| !c.is_ascii_digit() && c != '.' && c != '-')
        .filter_map(|t| t.parse::<f32>().ok())
        .collect();
    if nums.len() >= 4 {
        let h_pt = (nums[3] - nums[1]).max(1.0);
        return Ok(h_pt * PT_TO_MM);
    }
    anyhow::bail!("could not parse MediaBox");
}

#[derive(Debug, Clone, Copy)]
pub struct ThermalPrintOptions {
    /// Ticket térmico (58 mm o 80 mm); en documentos PDF va en `false`.
    pub thermal_80mm: bool,
    /// Ancho del rollo cuando `thermal_80mm` (58 o 80).
    pub roll_width_mm: u8,
    pub auto_cut: bool,
    pub open_drawer: bool,
}

fn append_escpos_ticket_trailer(data: &mut Vec<u8>, thermal: ThermalPrintOptions) {
    if !thermal.thermal_80mm {
        return;
    }
    data.extend(crate::pos_sale_ticket_escpos::escpos_post_print_trailer(
        thermal.auto_cut,
        thermal.open_drawer,
    ));
}

const NETWORK_RAW_PRINT_PORT: u16 = 9100;
const NETWORK_CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
const NETWORK_WRITE_TIMEOUT: Duration = Duration::from_secs(30);

/// `192.168.1.50` o `192.168.1.50:9100` → (host, puerto).
pub fn parse_network_printer_target(raw: &str) -> Result<(String, u16)> {
    let t = raw.trim();
    if t.is_empty() {
        anyhow::bail!("network host vacío");
    }
    if let Some((host, port_str)) = t.rsplit_once(':') {
        if !host.is_empty() && port_str.chars().all(|c| c.is_ascii_digit()) {
            if let Ok(p) = port_str.parse::<u16>() {
                if p > 0 {
                    return Ok((host.to_string(), p));
                }
            }
        }
    }
    if looks_like_ipv4(t) || t.contains('.') || t.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Ok((t.to_string(), NETWORK_RAW_PRINT_PORT));
    }
    anyhow::bail!("dirección de red inválida: {t}");
}

fn looks_like_ipv4(host: &str) -> bool {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() != 4 {
        return false;
    }
    parts.iter().all(|oct| {
        let Ok(n) = oct.parse::<u16>() else {
            return false;
        };
        n <= 255
    })
}

fn socket_addrs_ipv4_first(
    host: &str,
    port: u16,
) -> Result<Vec<SocketAddr>> {
    let addr = format!("{host}:{port}");
    let mut addrs: Vec<SocketAddr> = addr
        .to_socket_addrs()
        .with_context(|| format!("resolver {addr}"))?
        .collect();
    addrs.sort_by_key(|sa| match sa {
        SocketAddr::V4(_) => 0,
        SocketAddr::V6(_) => 1,
    });
    if addrs.is_empty() {
        anyhow::bail!("no se pudo resolver {addr}");
    }
    Ok(addrs)
}

/// Prueba TCP al puerto RAW (sin enviar datos de impresión).
pub fn probe_network_printer(host: &str) -> Result<()> {
    probe_network_printer_with_timeout(host, NETWORK_CONNECT_TIMEOUT)
}

/// Igual que `probe_network_printer` con timeout de conexión configurable (health checks).
pub fn probe_network_printer_with_timeout(host: &str, connect_timeout: Duration) -> Result<()> {
    let (host, port) = parse_network_printer_target(host)?;
    let addr = format!("{host}:{port}");
    let mut last_err: Option<String> = None;
    for sa in socket_addrs_ipv4_first(&host, port)? {
        match TcpStream::connect_timeout(&sa, connect_timeout) {
            Ok(_) => {
                print_diag::info(format!("Red OK: conexión TCP a {sa}"));
                return Ok(());
            }
            Err(e) => last_err = Some(format!("{sa} → {e}")),
        }
    }
    anyhow::bail!(
        "No hay conexión TCP a {addr} ({connect_timeout:?}). \
         Verificá IP, que la impresora esté encendida, en la misma red y que el puerto {port} (RAW) esté abierto. \
         Detalle: {}",
        last_err.unwrap_or_else(|| "sin rutas".into())
    )
}

/// Envía bytes ESC/POS por socket TCP (puerto RAW, default 9100) a impresora en red.
pub fn print_escpos_bytes_to_network(
    host: &str,
    data: &[u8],
    copies: u32,
    thermal: ThermalPrintOptions,
) -> Result<()> {
    let (host, port) = parse_network_printer_target(host)?;
    let mut payload = data.to_vec();
    append_escpos_ticket_trailer(&mut payload, thermal);
    let addr = format!("{host}:{port}");
    let copy_count = copies.max(1);
    for i in 0..copy_count {
        let mut last_connect: Option<String> = None;
        let mut stream: Option<TcpStream> = None;
        for sa in socket_addrs_ipv4_first(&host, port)? {
            match TcpStream::connect_timeout(&sa, NETWORK_CONNECT_TIMEOUT) {
                Ok(s) => {
                    stream = Some(s);
                    break;
                }
                Err(e) => last_connect = Some(format!("{sa} → {e}")),
            }
        }
        let mut stream = stream.with_context(|| {
            format!(
                "conectar a impresora en red {addr} ({NETWORK_CONNECT_TIMEOUT:?}): {}. \
                 Comprobá que el Mac/PC y la impresora estén en la misma red, la IP sea correcta y el puerto {port} acepte RAW.",
                last_connect.unwrap_or_else(|| "sin direcciones".into())
            )
        })?;
        stream
            .set_write_timeout(Some(NETWORK_WRITE_TIMEOUT))
            .context("write timeout red")?;
        stream
            .write_all(&payload)
            .with_context(|| format!("enviar ESC/POS a {addr}"))?;
        stream.flush().ok();
        print_diag::info(format!(
            "Red ESC/POS: {addr}, {} bytes{}",
            payload.len(),
            if copy_count > 1 {
                format!(" (copia {} de {copy_count})", i + 1)
            } else {
                String::new()
            }
        ));
    }
    tracing::info!(
        host,
        bytes = payload.len(),
        auto_cut = thermal.auto_cut,
        open_drawer = thermal.open_drawer,
        "ESC/POS enviado a impresora en red"
    );
    Ok(())
}

/// Envía bytes ESC/POS a la impresora (RAW). En tickets con `auto_cut` añade feed + corte GS V.
pub fn print_escpos_to_printer(
    escpos_path: &Path,
    printer: &str,
    copies: u32,
    thermal: ThermalPrintOptions,
) -> Result<()> {
    let mut data = std::fs::read(escpos_path).with_context(|| {
        format!("read escpos {}", escpos_path.display())
    })?;
    append_escpos_ticket_trailer(&mut data, thermal);
    let copy_count = copies.max(1);
    for i in 0..copy_count {
        print_raw_bytes_to_printer(printer, &data).with_context(|| {
            if copy_count > 1 {
                format!("copia {} de {copy_count}", i + 1)
            } else {
                "envío ESC/POS RAW".into()
            }
        })?;
    }
    tracing::info!(
        printer,
        bytes = data.len(),
        auto_cut = thermal.auto_cut,
        open_drawer = thermal.open_drawer,
        "ESC/POS enviado a impresora (RAW)"
    );
    Ok(())
}

fn print_raw_bytes_to_printer(printer: &str, data: &[u8]) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        return print_raw_mac(printer, data);
    }
    #[cfg(target_os = "windows")]
    {
        return print_raw_windows(printer, data);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        tracing::warn!(printer, len = data.len(), "stub raw print (unsupported OS)");
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn print_raw_mac(printer: &str, data: &[u8]) -> Result<()> {
    let id = uuid::Uuid::new_v4().to_string();
    let path = std::env::temp_dir().join(format!("kai_escpos_{id}.bin"));
    std::fs::write(&path, data).context("write escpos temp")?;
    let status = Command::new("lp")
        .arg("-d")
        .arg(printer)
        .arg("-o")
        .arg("raw")
        .arg(&path)
        .status()
        .context("lp raw")?;
    let _ = std::fs::remove_file(&path);
    if !status.success() {
        anyhow::bail!("lp raw exited {:?}", status.code());
    }
    print_diag::info(format!(
        "macOS RAW (lp -o raw): «{printer}», {} bytes",
        data.len()
    ));
    Ok(())
}

#[cfg(target_os = "windows")]
fn print_raw_windows(printer: &str, data: &[u8]) -> Result<()> {
    match print_raw_windows_spooler(printer, data) {
        Ok(written) => {
            print_diag::info(format!(
                "Windows RAW (spooler): «{printer}», {written}/{} bytes escritos",
                data.len()
            ));
            Ok(())
        }
        Err(e) => {
            print_diag::warn(format!(
                "Windows RAW spooler falló en «{printer}»: {e:#}; probando copy /B"
            ));
            tracing::warn!(
                printer,
                err = %e,
                "Win32 RAW spooler falló; intentando copy /B a cola local"
            );
            print_raw_windows_copy(printer, data)
                .with_context(|| format!("RAW spooler: {e:#}"))
        }
    }
}

/// Envío RAW vía spooler (OpenPrinter → StartDoc → StartPage → WritePrinter → EndPage → EndDoc).
#[cfg(target_os = "windows")]
fn print_raw_windows_spooler(printer: &str, data: &[u8]) -> Result<u32> {
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
        .map_err(|e| anyhow::anyhow!("OpenPrinterW({printer}): {e}"))?;
        let mut doc_name: Vec<u16> = "KaiPrinters\0".encode_utf16().collect();
        let mut doc_datatype: Vec<u16> = "RAW\0".encode_utf16().collect();
        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name.as_mut_ptr()),
            pOutputFile: PWSTR::null(),
            pDatatype: PWSTR(doc_datatype.as_mut_ptr()),
        };
        let job_id = StartDocPrinterW(h_printer, 1, &doc_info);
        if job_id == 0 {
            let _ = ClosePrinter(h_printer);
            anyhow::bail!("StartDocPrinterW returned 0");
        }
        if StartPagePrinter(h_printer) == BOOL(0) {
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);
            anyhow::bail!("StartPagePrinter failed");
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
            anyhow::bail!("WritePrinter failed");
        }
        if written as usize != data.len() {
            tracing::warn!(
                expected = data.len(),
                written,
                "WritePrinter wrote fewer bytes than expected"
            );
        }
        let _ = EndPagePrinter(h_printer);
        let _ = EndDocPrinter(h_printer);
        let _ = ClosePrinter(h_printer);
    }
    Ok(written)
}

/// Respaldo: `copy /B` a `\\localhost\\<cola>` (suele funcionar cuando el driver ignora WritePrinter sin página).
#[cfg(target_os = "windows")]
fn print_raw_windows_copy(printer: &str, data: &[u8]) -> Result<()> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let id = uuid::Uuid::new_v4().to_string();
    let path = std::env::temp_dir().join(format!("kai_escpos_{id}.bin"));
    std::fs::write(&path, data).context("write escpos temp")?;
    let dest = format!(r"\\localhost\{printer}");
    let path_s = path.to_string_lossy();
    let status = Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", "copy", "/B", &path_s, &dest])
        .status()
        .context("copy /B to printer")?;
    let _ = std::fs::remove_file(&path);
    if !status.success() {
        anyhow::bail!("copy /B to {dest} exited {:?}", status.code());
    }
    print_diag::info(format!(
        "Windows RAW (copy /B): «{printer}» → {dest}, {} bytes",
        data.len()
    ));
    tracing::info!(printer, dest, bytes = data.len(), "ESC/POS enviado vía copy /B");
    Ok(())
}

pub fn print_pdf_to_printer(
    pdf_path: &Path,
    printer: &str,
    copies: u32,
    thermal: ThermalPrintOptions,
) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("lp");
        cmd.arg("-d")
            .arg(printer)
            .arg("-n")
            .arg(copies.max(1).to_string());
        if thermal.thermal_80mm {
            // Altura del rollo = altura real del PDF (evita banda blanca por media fija).
            let page_h_mm = pdf_page_height_mm(pdf_path)
                .unwrap_or(120.0)
                .clamp(40.0, 1200.0);
            let roll_w = if thermal.roll_width_mm == 58 { 48 } else { 72 };
            let media = format!("Custom.{roll_w}x{page_h_mm:.0}mm");
            tracing::debug!(%media, "CUPS thermal media");
            cmd.arg("-o").arg(media);
            cmd.arg("-o")
                .arg("fit-to-page=false")
                .arg("-o")
                .arg("print-scaling=none")
                .arg("-o")
                .arg("page-left=0")
                .arg("-o")
                .arg("page-right=0")
                .arg("-o")
                .arg("page-top=0")
                .arg("-o")
                .arg("page-bottom=0")
                .arg("-o")
                .arg("margin=0");
            if thermal.auto_cut {
                if let Some(cut) = detect_cups_cut_option(printer) {
                    tracing::info!(printer, cut_option = %cut, "CUPS: solicitar corte de ticket");
                    cmd.arg("-o").arg(cut);
                } else {
                    tracing::debug!(
                        printer,
                        "CUPS: la cola no expone opción de corte (solo feed en blanco del PDF)"
                    );
                }
            } else {
                tracing::debug!(printer, "CUPS: corte automático desactivado en KaiPrinters");
            }
        }
        let status = cmd.arg(pdf_path).status().context("lp")?;
        if !status.success() {
            anyhow::bail!("lp exited {:?}", status.code());
        }
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        return print_windows(pdf_path, printer, copies, thermal);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        tracing::warn!(path = ?pdf_path, printer, "stub print (unsupported OS)");
        Ok(())
    }
}

#[cfg(target_os = "windows")]
static BUNDLED_SUMATRA: OnceLock<Option<PathBuf>> = OnceLock::new();

#[cfg(target_os = "windows")]
static RESOLVED_SUMATRA: std::sync::Mutex<Option<PathBuf>> = std::sync::Mutex::new(None);

/// Ruta empaquetada vía Tauri (`resources/bin/SumatraPDF.exe`) o portable junto al exe, fijada en `setup`.
#[cfg(target_os = "windows")]
pub fn set_bundled_sumatra_path(path: Option<PathBuf>) {
    let _ = BUNDLED_SUMATRA.set(path);
}

/// Limpia la caché de resolución (p. ej. tras mover el portable o «Comprobar de nuevo»).
#[cfg(target_os = "windows")]
pub fn invalidate_sumatra_cache() {
    if let Ok(mut g) = RESOLVED_SUMATRA.lock() {
        *g = None;
    }
}

#[cfg(not(target_os = "windows"))]
pub fn invalidate_sumatra_cache() {}

#[cfg(target_os = "windows")]
fn sumatra_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(p) = std::env::var("KAI_PRINTERS_SUMATRA") {
        out.push(PathBuf::from(p));
    }
    if let Some(p) = BUNDLED_SUMATRA.get().and_then(|o| o.clone()) {
        out.push(p);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            out.push(dir.join("SumatraPDF.exe"));
            out.push(dir.join("resources").join("bin").join("SumatraPDF.exe"));
            out.push(dir.join("bin").join("SumatraPDF.exe"));
        }
    }
    out
}

#[cfg(target_os = "windows")]
fn resolve_sumatra_exe() -> Result<PathBuf> {
    if let Ok(guard) = RESOLVED_SUMATRA.lock() {
        if let Some(cached) = guard.clone() {
            if cached.is_file() {
                return Ok(cached);
            }
        }
    }
    if let Some(p) = sumatra_candidates().into_iter().find(|c| c.is_file()) {
        if let Ok(mut guard) = RESOLVED_SUMATRA.lock() {
            *guard = Some(p.clone());
        }
        return Ok(p);
    }
    if let Ok(mut guard) = RESOLVED_SUMATRA.lock() {
        *guard = None;
    }
    anyhow::bail!(
        "SumatraPDF no encontrado. Reinstalá KaiPrinters o definí KAI_PRINTERS_SUMATRA \
         con la ruta completa a SumatraPDF.exe"
    )
}

/// Opciones `-print-settings` de Sumatra: copias (`Nx`) y escala térmica (`fit`).
#[cfg(target_os = "windows")]
fn sumatra_print_settings(copies: u32, thermal: ThermalPrintOptions) -> String {
    let n = copies.max(1);
    let mut parts = Vec::new();
    if n > 1 {
        parts.push(format!("{n}x"));
    }
    if thermal.thermal_80mm {
        parts.push("fit".to_string());
    }
    parts.join(",")
}

#[cfg(target_os = "windows")]
fn print_windows_sumatra(
    sumatra: &Path,
    pdf_path: &Path,
    printer: &str,
    copies: u32,
    thermal: ThermalPrintOptions,
) -> Result<()> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let pdf = pdf_path
        .canonicalize()
        .unwrap_or_else(|_| pdf_path.to_path_buf());
    let settings = sumatra_print_settings(copies, thermal);
    let mut cmd = Command::new(sumatra);
    cmd.creation_flags(CREATE_NO_WINDOW)
        .arg("-silent")
        .arg("-print-to")
        .arg(printer.trim());
    if !settings.is_empty() {
        cmd.arg("-print-settings").arg(&settings);
    }
    let out = cmd
        .arg(&pdf)
        .output()
        .with_context(|| format!("SumatraPDF ({})", sumatra.display()))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        let stdout = String::from_utf8_lossy(&out.stdout);
        anyhow::bail!(
            "SumatraPDF salió {:?}: {stdout}{stderr}",
            out.status.code()
        );
    }
    tracing::info!(
        printer,
        sumatra = ?sumatra,
        print_settings = %settings,
        thermal_80mm = thermal.thermal_80mm,
        copies,
        "Windows: PDF enviado a impresora vía SumatraPDF"
    );
    Ok(())
}

#[cfg(target_os = "windows")]
fn print_windows(
    pdf_path: &Path,
    printer: &str,
    copies: u32,
    thermal: ThermalPrintOptions,
) -> Result<()> {
    if !pdf_path.is_file() {
        anyhow::bail!("PDF temporal no encontrado: {}", pdf_path.display());
    }
    let sumatra = resolve_sumatra_exe()?;
    print_windows_sumatra(&sumatra, pdf_path, printer, copies, thermal)
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SumatraStatus {
    pub installed: bool,
    pub path: Option<String>,
    pub bundled: bool,
}

pub fn host_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "other"
    }
}

pub fn sumatra_status() -> SumatraStatus {
    #[cfg(target_os = "windows")]
    {
        match resolve_sumatra_exe() {
            Ok(p) => {
                let bundled = BUNDLED_SUMATRA.get().and_then(|o| o.as_ref()).is_some_and(|b| {
                    if !b.is_file() || !p.is_file() {
                        return false;
                    }
                    match (std::fs::canonicalize(b), std::fs::canonicalize(&p)) {
                        (Ok(bb), Ok(pp)) => bb == pp,
                        _ => b == &p,
                    }
                });
                SumatraStatus {
                    installed: true,
                    path: Some(p.display().to_string()),
                    bundled,
                }
            }
            Err(_) => SumatraStatus {
                installed: false,
                path: None,
                bundled: false,
            },
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        SumatraStatus {
            installed: true,
            path: None,
            bundled: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_cut_media_end_of_page() {
        let opt = parse_cups_cut_lp_option("CutMedia/Cut Media: None *EndOfPage EndOfJob")
            .map(|(_, s)| s);
        assert_eq!(opt.as_deref(), Some("CutMedia=EndOfPage"));
    }

    #[test]
    fn skips_none_only_cut() {
        let opt = parse_cups_cut_lp_option("CutMedia/Cut: *None Off");
        assert!(opt.is_none());
    }

    #[test]
    fn prefers_full_cut_page_over_feed_none() {
        let page = parse_cups_cut_lp_option(
            "PageCutType/1. Page Cut Type: *0NoCutPage 1PartialCutPage 2FullCutPage",
        );
        let feed = parse_cups_cut_lp_option(
            "FeedCutAfterJobEnd/3. Feed Cut After Job End: *0None 1Line 2Line",
        );
        let (page_score, page_opt) = page.unwrap();
        let (feed_score, feed_opt) = feed.unwrap();
        assert_eq!(page_opt.as_str(), "PageCutType=2FullCutPage");
        assert_eq!(feed_opt.as_str(), "FeedCutAfterJobEnd=1Line");
        assert!(page_score > feed_score);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn sumatra_print_settings_copies_and_thermal() {
        assert_eq!(
            sumatra_print_settings(3, ThermalPrintOptions {
                thermal_80mm: false,
                roll_width_mm: 80,
                auto_cut: false,
                open_drawer: false,
            }),
            "3x"
        );
        assert_eq!(
            sumatra_print_settings(1, ThermalPrintOptions {
                thermal_80mm: true,
                roll_width_mm: 80,
                auto_cut: false,
                open_drawer: false,
            }),
            "fit"
        );
        assert_eq!(
            sumatra_print_settings(2, ThermalPrintOptions {
                thermal_80mm: true,
                roll_width_mm: 80,
                auto_cut: false,
                open_drawer: false,
            }),
            "2x,fit"
        );
    }
}
