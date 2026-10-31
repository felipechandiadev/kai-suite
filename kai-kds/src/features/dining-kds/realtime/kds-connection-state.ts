/**
 * Estado de conexión del socket KDS (lógica pura, sin React ni socket.io).
 *
 * - connecting: aún no hubo una conexión OK en esta sesión de socket.
 * - connected: socket autenticado y (si hay unidad) suscrito a su room.
 * - reconnecting: se perdió la conexión hace menos de `offlineAfterMs`.
 * - offline: lleva caída `offlineAfterMs` o más → alerta sonora "lost" (una vez).
 * Al volver a `connected` tras una alerta "lost" → alerta "restored".
 */
export type KdsConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export type KdsConnectionState = {
  status: KdsConnectionStatus;
  /** ms epoch desde que está caída (null si conectada). */
  downSince: number | null;
  /** true si ya sonó la alerta de pérdida en esta caída. */
  lostAlerted: boolean;
  everConnected: boolean;
};

export type KdsConnectionEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "tick" }
  | { type: "reset" };

export type KdsConnectionAlert = "lost" | "restored" | null;

export const KDS_OFFLINE_AFTER_MS = 5000;

export function initialKdsConnectionState(now: number): KdsConnectionState {
  return { status: "connecting", downSince: now, lostAlerted: false, everConnected: false };
}

export function reduceKdsConnection(
  state: KdsConnectionState,
  event: KdsConnectionEvent,
  now: number,
  offlineAfterMs = KDS_OFFLINE_AFTER_MS,
): { state: KdsConnectionState; alert: KdsConnectionAlert } {
  switch (event.type) {
    case "reset":
      return { state: initialKdsConnectionState(now), alert: null };
    case "connected": {
      const alert: KdsConnectionAlert = state.lostAlerted ? "restored" : null;
      return {
        state: { status: "connected", downSince: null, lostAlerted: false, everConnected: true },
        alert,
      };
    }
    case "disconnected": {
      if (state.status !== "connected") {
        return reduceKdsConnection(state, { type: "tick" }, now, offlineAfterMs);
      }
      const next: KdsConnectionState = { ...state, status: "reconnecting", downSince: now };
      return reduceKdsConnection(next, { type: "tick" }, now, offlineAfterMs);
    }
    case "tick": {
      if (state.status === "connected" || state.downSince === null) {
        return { state, alert: null };
      }
      if (now - state.downSince < offlineAfterMs) return { state, alert: null };
      // Solo alerta si alguna vez estuvo conectada (evita sonar en el arranque).
      const shouldAlert = state.everConnected && !state.lostAlerted;
      return {
        state: {
          ...state,
          status: "offline",
          lostAlerted: state.lostAlerted || shouldAlert,
        },
        alert: shouldAlert ? "lost" : null,
      };
    }
  }
}

/** Backoff exponencial con jitter: base·2^attempt acotado a max, ±jitter. */
export function kdsReconnectDelayMs(
  attempt: number,
  opts: { baseMs?: number; maxMs?: number; jitter?: number; random?: () => number } = {},
): number {
  const baseMs = opts.baseMs ?? 1000;
  const maxMs = opts.maxMs ?? 15000;
  const jitter = Math.min(Math.max(opts.jitter ?? 0.3, 0), 1);
  const random = opts.random ?? Math.random;
  const raw = Math.min(maxMs, baseMs * 2 ** Math.max(0, Math.floor(attempt)));
  const delta = raw * jitter * (random() * 2 - 1);
  return Math.max(0, Math.round(Math.min(maxMs, raw + delta)));
}

export function kdsConnectionLabel(status: KdsConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Conectado";
    case "connecting":
      return "Conectando";
    case "reconnecting":
      return "Reconectando";
    case "offline":
      return "Sin conexión";
  }
}
