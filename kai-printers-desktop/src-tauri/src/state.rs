use crate::agent_log::AgentLog;
use crate::db::Db;
use crate::reachability::ReachabilityCache;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::async_runtime::JoinHandle as AsyncSpawnHandle;
use tokio::sync::broadcast;
use tokio::sync::watch;

/// Handle para detener el listener WS/WSS sin salir del proceso.
pub struct ListenerControl {
    pub shutdown: watch::Sender<bool>,
    pub join: AsyncSpawnHandle<()>,
}

/// Per-connection metadata after successful `hello`.
pub struct Session {
    pub client_id: String,
    pub required_purposes: Vec<String>,
    pub app_label: String,
    pub user_display_name: String,
    pub company_name: Option<String>,
    pub point_of_sale_name: Option<String>,
}

pub struct AppState {
    pub db: Arc<Db>,
    pub broadcast: broadcast::Sender<String>,
    /// Señal a todas las conexiones WebSocket activas para cerrar (p. ej. al apagar el servicio sin cerrar la app).
    pub ws_disconnect_all: broadcast::Sender<()>,
    pub clients: Mutex<HashMap<String, Session>>,
    pub client_counter: AtomicUsize,
    pub temp_dir: PathBuf,
    /** Directorio raíz de datos de la app (certificados TLS, DB, etc.). */
    pub data_dir: PathBuf,
    pub jobs_completed_total: AtomicU64,
    pub ws_listener: Mutex<Option<ListenerControl>>,
    pub wss_listener: Mutex<Option<ListenerControl>>,
    pub agent_log: Arc<AgentLog>,
    pub reachability: Arc<ReachabilityCache>,
}

impl AppState {
    pub fn new(db: Arc<Db>, temp_dir: PathBuf, data_dir: PathBuf, agent_log: Arc<AgentLog>) -> Arc<Self> {
        let (broadcast, _) = broadcast::channel(256);
        let (ws_disconnect_all, _) = broadcast::channel::<()>(32);
        Arc::new(Self {
            db,
            broadcast,
            ws_disconnect_all,
            clients: Mutex::new(HashMap::new()),
            client_counter: AtomicUsize::new(0),
            temp_dir,
            data_dir,
            jobs_completed_total: AtomicU64::new(0),
            ws_listener: Mutex::new(None),
            wss_listener: Mutex::new(None),
            agent_log,
            reachability: Arc::new(ReachabilityCache::new()),
        })
    }

    pub fn signal_disconnect_all_ws_clients(&self) {
        let _ = self.ws_disconnect_all.send(());
    }

    pub fn connected(&self) -> usize {
        self.clients.lock().len()
    }

    pub fn register(&self, conn_id: String, s: Session) {
        self.clients.lock().insert(conn_id, s);
    }

    pub fn unregister(&self, conn_id: &str) {
        self.clients.lock().remove(conn_id);
    }

    pub fn next_conn_id(&self) -> String {
        let n = self.client_counter.fetch_add(1, Ordering::Relaxed);
        format!("c{n}")
    }

    pub fn connected_sessions_json(&self) -> Vec<serde_json::Value> {
        self.clients
            .lock()
            .iter()
            .map(|(conn_id, s)| {
                serde_json::json!({
                    "connectionId": conn_id,
                    "clientId": s.client_id,
                    "appLabel": s.app_label,
                    "userDisplayName": s.user_display_name,
                    "companyName": s.company_name,
                    "pointOfSaleName": s.point_of_sale_name,
                    "requiredPurposes": s.required_purposes,
                })
            })
            .collect()
    }

    /// `true` si el task del listener WS sigue vivo.
    pub fn ws_listener_running(&self) -> bool {
        match self.ws_listener.lock().as_ref() {
            None => false,
            Some(c) => !c.join.inner().is_finished(),
        }
    }

    /// `true` si el task del listener WSS sigue vivo (o no aplica si WSS está apagado en settings).
    pub fn wss_listener_running(&self) -> bool {
        match self.wss_listener.lock().as_ref() {
            None => false,
            Some(c) => !c.join.inner().is_finished(),
        }
    }
}
