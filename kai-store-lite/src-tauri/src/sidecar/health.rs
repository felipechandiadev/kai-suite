//! Health probe for Core Lite.

use std::time::Duration;

pub async fn probe_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{port}/api/lite/health");
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };
    match client.get(url).send().await {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

/// Sync probe for spawn/ensure.
pub fn probe_health_blocking(port: u16) -> bool {
    let rt = match tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
    {
        Ok(r) => r,
        Err(_) => return false,
    };
    rt.block_on(probe_health(port))
}
