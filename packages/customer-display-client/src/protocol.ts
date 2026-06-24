import type { CustomerDisplayEvent, CustomerDisplaySnapshot } from "./display-snapshot";

export const DISPLAY_PROTOCOL_VERSION = "1.0";

export const DEFAULT_DISPLAY_WS_PORT = 14570;
export const DEFAULT_DISPLAY_WSS_PORT = 14571;

export function buildDisplayWebSocketUrl(host: string, port: number, useTls: boolean): string {
  const scheme = useTls ? "wss" : "ws";
  const h = host.trim() || "127.0.0.1";
  return `${scheme}://${h}:${port}`;
}

export function buildHelloMessage(input: {
  requestId?: string;
  clientId: string;
  pointOfSaleId: string;
  appLabel?: string;
  storeName?: string;
  token?: string;
}): Record<string, unknown> {
  return {
    version: DISPLAY_PROTOCOL_VERSION,
    action: "hello",
    request_id: input.requestId ?? cryptoRandomId(),
    clientId: input.clientId,
    pointOfSaleId: input.pointOfSaleId,
    appLabel: input.appLabel ?? "Punto de venta",
    storeName: input.storeName,
    token: input.token,
  };
}

export function buildCartSnapshotMessage(
  snapshot: CustomerDisplaySnapshot,
  requestId?: string,
): Record<string, unknown> {
  return {
    version: DISPLAY_PROTOCOL_VERSION,
    action: "cart_snapshot",
    request_id: requestId ?? cryptoRandomId(),
    payload: snapshot,
  };
}

export function buildDisplayEventMessage(
  event: CustomerDisplayEvent,
  requestId?: string,
): Record<string, unknown> {
  return {
    version: DISPLAY_PROTOCOL_VERSION,
    action: "display_event",
    request_id: requestId ?? cryptoRandomId(),
    payload: event,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
