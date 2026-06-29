//! Self-signed TLS material for local WSS (127.0.0.1). PEM files under app data dir.

use std::path::Path;
use std::sync::Arc;

use anyhow::Context;
use rcgen::{generate_simple_self_signed, CertifiedKey};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::ServerConfig;

pub const WSS_CERT_FILE: &str = "agent-tls-cert.der";
const KEY_FILE: &str = "agent-tls-key.der";

pub fn wss_cert_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(WSS_CERT_FILE)
}

pub fn load_or_create_server_config(dir: &Path) -> anyhow::Result<Arc<ServerConfig>> {
    std::fs::create_dir_all(dir).ok();
    let cert_path = dir.join(WSS_CERT_FILE);
    let key_path = dir.join(KEY_FILE);

    if !cert_path.exists() || !key_path.exists() {
        let CertifiedKey { cert, key_pair } = generate_simple_self_signed([
            "localhost".into(),
            "127.0.0.1".into(),
        ])
        .context("rcgen self-signed")?;
        std::fs::write(&cert_path, cert.der().as_ref()).context("write tls cert")?;
        std::fs::write(&key_path, key_pair.serialize_der()).context("write tls key")?;
    }

    let cert_der = std::fs::read(&cert_path).context("read tls cert")?;
    let key_der = std::fs::read(&key_path).context("read tls key")?;
    let chain = vec![CertificateDer::from(cert_der)];
    let key = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(key_der));

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(chain, key)
        .context("rustls with_single_cert")?;
    Ok(Arc::new(config))
}
