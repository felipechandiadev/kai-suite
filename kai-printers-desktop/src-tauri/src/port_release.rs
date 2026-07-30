//! Libera puertos WS/WSS si quedó una instancia previa de este agente (misma máquina).
//! Solo en Unix: `lsof` + `SIGTERM` a procesos cuya línea de comando parece este binario.
//! En Windows no hace nada (ampliar con netstat si hace falta).

#[cfg(unix)]
use std::collections::HashSet;
#[cfg(unix)]
use std::process::Command;
#[cfg(unix)]
use std::time::{Duration, Instant};

use crate::db::Db;

/// Puertos distintos a revisar (típicamente WS y WSS).
pub fn terminate_stale_agent_if_ports_busy(db: &Db) {
    let mut ports: Vec<u16> = vec![db.listen_port()];
    let wss = db.wss_listen_port();
    if !ports.contains(&wss) {
        ports.push(wss);
    }
    terminate_stale_on_listen_ports(&ports);
}

fn terminate_stale_on_listen_ports(ports: &[u16]) {
    #[cfg(not(unix))]
    {
        let _ = ports;
        return;
    }
    #[cfg(unix)]
    {
        let killed = terminate_stale_on_listen_ports_unix(ports);
        if killed && !wait_until_tcp_listen_cleared_unix(ports, Duration::from_secs(3)) {
            tracing::warn!(
                "Tras SIGTERM el puerto WS/WSS sigue en LISTEN; el bind puede fallar si no es este agente"
            );
        }
    }
}

#[cfg(unix)]
fn pids_listening_on_tcp_port(port: u16) -> HashSet<String> {
    let mut out_set = HashSet::new();
    let Ok(out) = Command::new("lsof")
        .args(["-nP", &format!("-iTCP:{port}"), "-sTCP:LISTEN", "-t"])
        .output()
    else {
        return out_set;
    };
    if out.stdout.is_empty() {
        return out_set;
    }
    for line in String::from_utf8_lossy(&out.stdout).lines() {
        let p = line.trim();
        if !p.is_empty() {
            out_set.insert(p.to_string());
        }
    }
    out_set
}

#[cfg(unix)]
fn any_port_still_listening(ports: &[u16]) -> bool {
    ports
        .iter()
        .any(|p| !pids_listening_on_tcp_port(*p).is_empty())
}

#[cfg(unix)]
fn wait_until_tcp_listen_cleared_unix(ports: &[u16], timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if !any_port_still_listening(ports) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(75));
    }
    !any_port_still_listening(ports)
}

#[cfg(unix)]
fn terminate_stale_on_listen_ports_unix(ports: &[u16]) -> bool {
    let my_pid = std::process::id();
    let mut candidates: HashSet<String> = HashSet::new();

    for port in ports {
        candidates.extend(pids_listening_on_tcp_port(*port));
    }

    let mut killed_any = false;
    for pid in candidates {
        let Ok(pid_num) = pid.parse::<u32>() else {
            continue;
        };
        if pid_num == my_pid {
            continue;
        }
        if !unix_process_looks_like_flowstore_print_agent(&pid) {
            continue;
        }
        killed_any = true;
        tracing::warn!(
            pid = %pid,
            "Instancia previa de Kai Printers aún escucha el puerto; envío SIGTERM para liberarlo"
        );
        eprintln!(
            "[Kai Printers] Cerrando instancia previa (PID {pid}) que ocupaba el puerto WS/WSS…"
        );
        let _ = Command::new("kill").args(["-15", &pid]).status();
    }
    killed_any
}

#[cfg(unix)]
fn unix_process_looks_like_flowstore_print_agent(pid: &str) -> bool {
    // macOS truncates `ps -o command=` unless `-ww` (wide); nombre del bin puede truncarse.
    let Ok(ps_out) = Command::new("ps")
        .args(["-p", pid, "-ww", "-o", "command="])
        .output()
    else {
        return false;
    };
    let cmd = String::from_utf8_lossy(&ps_out.stdout).to_lowercase();
    // Binario actual, nombres legacy (migración desde print-service-app), bundle id
    cmd.contains("print-service")
        || cmd.contains("print_service")
        || cmd.contains("kai-printers-desktop")
        || cmd.contains("print-service-app")
        || cmd.contains("print_service_app")
        || cmd.contains("flowstore print service")
        || cmd.contains("kaiprinters")
        || cmd.contains("kai-printers")
        || cmd.contains("/print-service")
        || cmd.contains("/kai-printers-desktop")
        || cmd.contains("/print-service-app")
        || cmd.contains("print-service.exe")
        || cmd.contains("print-service-app.exe")
        || cmd.contains("com.flowstore.printservice")
}
