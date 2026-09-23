use sha2::{Digest, Sha256};

/// Composite machine fingerprint (hostname + OS + arch + optional machine-id).
pub fn machine_fingerprint() -> String {
    let host = hostname();
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let mid = machine_id().unwrap_or_default();
    let raw = format!("{host}|{os}|{arch}|{mid}");
    let hash = Sha256::digest(raw.as_bytes());
    hex::encode(hash)
}

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| {
            std::fs::read_to_string("/etc/hostname")
                .unwrap_or_else(|_| "unknown-host".into())
                .trim()
                .to_string()
        })
}

fn machine_id() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
            .ok()?;
        let s = String::from_utf8_lossy(&out.stdout);
        for line in s.lines() {
            if line.contains("IOPlatformUUID") {
                if let Some(v) = line.split('"').nth(3) {
                    return Some(v.to_string());
                }
            }
        }
        None
    }
    #[cfg(target_os = "windows")]
    {
        let out = std::process::Command::new("wmic")
            .args(["csproduct", "get", "UUID"])
            .output()
            .ok()?;
        let s = String::from_utf8_lossy(&out.stdout);
        s.lines()
            .map(str::trim)
            .find(|l| !l.is_empty() && *l != "UUID")
            .map(|s| s.to_string())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        std::fs::read_to_string("/etc/machine-id")
            .ok()
            .map(|s| s.trim().to_string())
    }
}
