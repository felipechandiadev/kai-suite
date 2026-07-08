const HEARTBEAT_MS = 30_000;

export type ConnectivityState = {
  browserOnline: boolean;
  backendReachable: boolean;
  lastCheckedAt: number | null;
};

type Listener = (state: ConnectivityState) => void;

let state: ConnectivityState = {
  browserOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  backendReachable: typeof window === "undefined",
  lastCheckedAt: null,
};

const listeners = new Set<Listener>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatStarted = false;

function emit() {
  for (const l of listeners) l({ ...state });
}

export function getConnectivityState(): ConnectivityState {
  return { ...state };
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

async function runHeartbeat() {
  const { posOfflineHealthCheck } = await import("./backend-api-client");
  const reachable = state.browserOnline ? await posOfflineHealthCheck() : false;
  state = {
    ...state,
    backendReachable: reachable,
    lastCheckedAt: Date.now(),
  };
  emit();
}

export function startConnectivityHeartbeat() {
  if (heartbeatStarted || typeof window === "undefined") return;
  heartbeatStarted = true;

  const onOnline = () => {
    state = { ...state, browserOnline: true };
    emit();
    void runHeartbeat();
  };
  const onOffline = () => {
    state = { ...state, browserOnline: false, backendReachable: false, lastCheckedAt: Date.now() };
    emit();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  void runHeartbeat();
  heartbeatTimer = setInterval(() => void runHeartbeat(), HEARTBEAT_MS);
}

export function stopConnectivityHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  heartbeatStarted = false;
}

export function isBackendReachable(): boolean {
  return state.browserOnline && state.backendReachable;
}

/** Permite intentar API si hay red y el backend no fue descartado aún por heartbeat. */
export function shouldUseBackendApi(): boolean {
  if (!state.browserOnline) return false;
  if (!state.backendReachable && state.lastCheckedAt != null) return false;
  return true;
}
