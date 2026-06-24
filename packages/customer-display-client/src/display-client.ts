import type {
  CustomerDisplayEvent,
  CustomerDisplaySnapshot,
  DisplayStatusPayload,
} from "./display-snapshot";
import {
  buildCartSnapshotMessage,
  buildDisplayEventMessage,
  buildHelloMessage,
  isSupportedDisplayProtocolVersion,
} from "./protocol";

export type DisplayConnectionOptions = {
  url: string;
  clientId?: string;
  pointOfSaleId: string;
  storeName?: string;
  appLabel?: string;
  token?: string;
  debounceMs?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
  onDisplayStatus?: (status: DisplayStatusPayload) => void;
};

type PendingSnapshot = CustomerDisplaySnapshot | null;
type PendingEvent = CustomerDisplayEvent | null;

/**
 * WebSocket client: POS → Kai Screen agent.
 * Best-effort: errors are surfaced via onError, never thrown to callers.
 */
export class DisplayConnection {
  private ws: WebSocket | null = null;
  private helloOk = false;
  private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private debounceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private pendingSnapshot: PendingSnapshot = null;
  private pendingEvent: PendingEvent = null;
  private reconnectAttempt = 0;
  private stopped = false;

  constructor(private readonly opts: DisplayConnectionOptions) {}

  connect(): void {
    this.stopped = false;
    this.clearReconnect();
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    try {
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;
      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.helloOk = false;
        this.sendHello();
        this.opts.onOpen?.();
        this.flushPending();
      };
      ws.onmessage = (ev) => this.handleMessage(String(ev.data ?? ""));
      ws.onerror = () => this.opts.onError?.("WebSocket error");
      ws.onclose = () => {
        this.helloOk = false;
        this.ws = null;
        this.opts.onClose?.();
        this.scheduleReconnect();
      };
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e.message : "connect_failed");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopped = true;
    this.clearReconnect();
    this.clearDebounce();
    const ws = this.ws;
    this.ws = null;
    this.helloOk = false;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING)) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  publishSnapshot(snapshot: CustomerDisplaySnapshot): void {
    this.pendingSnapshot = snapshot;
    this.scheduleFlush();
  }

  publishEvent(event: CustomerDisplayEvent): void {
    this.pendingEvent = event;
    this.scheduleFlush();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.helloOk;
  }

  private sendHello(): void {
    const msg = buildHelloMessage({
      clientId: this.opts.clientId ?? "pwa-pos",
      pointOfSaleId: this.opts.pointOfSaleId,
      appLabel: this.opts.appLabel,
      storeName: this.opts.storeName,
      token: this.opts.token,
    });
    this.sendJson(msg);
  }

  private scheduleFlush(): void {
    const ms = this.opts.debounceMs ?? 100;
    this.clearDebounce();
    this.debounceTimer = globalThis.setTimeout(() => {
      this.debounceTimer = null;
      this.flushPending();
    }, ms);
  }

  private flushPending(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.helloOk) return;

    const event = this.pendingEvent;
    if (event) {
      this.pendingEvent = null;
      this.sendJson(buildDisplayEventMessage(event));
    }

    const snapshot = this.pendingSnapshot;
    if (snapshot) {
      this.pendingSnapshot = null;
      this.sendJson(buildCartSnapshotMessage(snapshot));
    }
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.event === "display_status") {
        const payload = parsed.payload as Record<string, unknown> | undefined;
        if (payload) {
          this.opts.onDisplayStatus?.({
            connected: payload.connected === true,
            displayAttached: payload.displayAttached === true,
            message: typeof payload.message === "string" ? payload.message : undefined,
          });
        }
        return;
      }
      if (parsed.action === "hello" || parsed.ok === true) {
        const version = parsed.version ?? (parsed.payload as Record<string, unknown> | undefined)?.version;
        if (isSupportedDisplayProtocolVersion(typeof version === "string" ? version : null) || parsed.ok === true) {
          this.helloOk = true;
          this.flushPending();
        }
      }
    } catch {
      // ignore malformed server messages
    }
  }

  private sendJson(body: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(body));
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e.message : "send_failed");
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.clearReconnect();
    const delay = Math.min(30_000, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer != null) {
      globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearDebounce(): void {
    if (this.debounceTimer != null) {
      globalThis.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
