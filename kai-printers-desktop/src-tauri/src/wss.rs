//! WSS listener (TLS). Misma interfaz de red que WS (`listen_host` en SQLite).

use std::sync::Arc;

use anyhow::Result;
use rustls::ServerConfig;
use tokio::net::TcpListener;
use tokio::sync::watch;
use tokio_rustls::TlsAcceptor;

use crate::state::AppState;
use crate::ws;

fn log_tls_handshake_rejected(state: &AppState, e: &impl std::fmt::Display) {
    let msg = format!("{e:#}");
    tracing::warn!("tls handshake: {msg}");
    if msg.contains("CertificateUnknown") || msg.contains("certificate") {
        state.agent_log.push_warn(
            "WSS: el navegador rechazó el certificado local (CertificateUnknown). \
             En KaiPrinters → Configuración usá «Confiar certificado WSS» (Windows) o importá \
             agent-tls-cert.der en «Entidades de certificación raíz de confianza». \
             Luego cerrá el navegador del POS y volvé a abrirlo.",
        );
    }
}

pub async fn run_wss_loop(
    state: Arc<AppState>,
    tls: Arc<ServerConfig>,
    mut shutdown_rx: watch::Receiver<bool>,
) -> Result<()> {
    let port = state.db.wss_listen_port();
    let host = state.db.listen_host();
    let loopback_only = host == "127.0.0.1" || host.eq_ignore_ascii_case("localhost");
    let acceptor = TlsAcceptor::from(tls.clone());

    let mut v6_task = None;
    if loopback_only {
    if let Ok(addr6) = format!("[::1]:{port}").parse::<std::net::SocketAddr>() {
        match TcpListener::bind(addr6).await {
            Ok(listener6) => {
                tracing::info!(%addr6, "WSS listening (IPv6 loopback)");
                let acceptor6 = acceptor.clone();
                let st = state.clone();
                let mut rx_v6 = shutdown_rx.clone();
                v6_task = Some(tokio::spawn(async move {
                    loop {
                        tokio::select! {
                            _ = rx_v6.changed() => {
                                if *rx_v6.borrow() {
                                    break;
                                }
                            }
                            r = listener6.accept() => {
                                match r {
                                    Ok((tcp, _)) => {
                                        let acceptor6 = acceptor6.clone();
                                        let st = st.clone();
                                        tokio::spawn(async move {
                                            match acceptor6.accept(tcp).await {
                                                Ok(tls_stream) => {
                                                    if let Err(e) = ws::handle_connection(tls_stream, st).await {
                                                        tracing::warn!("wss connection ended: {e:#}");
                                                    }
                                                }
                                                Err(e) => log_tls_handshake_rejected(&st, &e),
                                            }
                                        });
                                    }
                                    Err(e) => tracing::warn!("wss ipv6 accept: {e:#}"),
                                }
                            }
                        }
                    }
                }));
            }
            Err(e) => tracing::debug!(%addr6, err = %e, "wss: skip IPv6 loopback bind"),
        }
    }
    }

    let addr: std::net::SocketAddr = format!("{host}:{port}").parse()?;
    let listener = TcpListener::bind(addr).await?;
    tracing::info!(%addr, "WSS listening");
    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    break;
                }
            }
            r = listener.accept() => {
                match r {
                    Ok((tcp, _)) => {
                        let acceptor = acceptor.clone();
                        let st = state.clone();
                        tokio::spawn(async move {
                            match acceptor.accept(tcp).await {
                                Ok(tls_stream) => {
                                    if let Err(e) = ws::handle_connection(tls_stream, st).await {
                                        tracing::warn!("wss connection ended: {e:#}");
                                    }
                                }
                                Err(e) => log_tls_handshake_rejected(&st, &e),
                            }
                        });
                    }
                    Err(e) => tracing::warn!("wss accept: {e:#}"),
                }
            }
        }
    }
    if let Some(t) = v6_task {
        t.abort();
        let _ = t.await;
    }
    Ok(())
}
