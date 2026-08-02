import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  type HelloResponseData,
  type PosPrintAgentPurpose,
  type PrintJobAwaitUntil,
  type PrintJobDeliveryResult,
  type PrintServiceConnectionOptions,
} from "./core";

export type PrintServiceManagerOptions = {
  clientId?: string;
  appLabel?: string;
  requiredPurposes?: string[];
  userDisplayName?: string;
  companyName?: string;
  pointOfSaleName?: string;
  onTiming?: PrintServiceConnectionOptions["onTiming"];
};

type SharedEntry = {
  conn: PrintServiceConnection;
  refCount: number;
  purposesKey: string;
};

const sharedByKey = new Map<string, SharedEntry>();
let connectPromise: Promise<PrintServiceConnection> | null = null;

function purposesKey(purposes: string[]): string {
  return [...purposes].sort().join("\u0001");
}

function buildManagerUrl(): string {
  const cfg = readPrintServiceConfigFromStorage();
  // Página HTTPS → WSS obligatorio (mixed content).
  // Página HTTP → WS; cfg.useTls+WSS autofirmado provoca closed_before_open en Chromium.
  const tls = printServicePageRequiresTls();
  const port = tls ? cfg.wssPort : cfg.port;
  return buildWebSocketUrl(cfg.host, port, tls);
}

function connectionOptions(opts: PrintServiceManagerOptions): PrintServiceConnectionOptions {
  return {
    url: buildManagerUrl(),
    clientId: opts.clientId ?? "kai-pos-print",
    appLabel: opts.appLabel ?? "KaiStore POS",
    requiredPurposes: opts.requiredPurposes ?? ["tickets", "documents"],
    userDisplayName: opts.userDisplayName,
    companyName: opts.companyName,
    pointOfSaleName: opts.pointOfSaleName,
    onTiming: opts.onTiming,
  };
}

async function ensureSharedConnection(opts: PrintServiceManagerOptions): Promise<PrintServiceConnection> {
  const purposes = opts.requiredPurposes ?? ["tickets", "documents"];
  const key = purposesKey(purposes);
  const existing = sharedByKey.get(key);
  if (existing?.conn.isConnected()) {
    return existing.conn;
  }
  // Entrada stale (WS cerrado): no reutilizar; liberar antes de reconectar.
  if (existing) {
    existing.conn.disconnect({ ifConnecting: "abandon" });
    sharedByKey.delete(key);
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      const conn = new PrintServiceConnection(connectionOptions(opts));
      conn.connect();
      try {
        await conn.waitForOpen(15_000);
      } catch (e) {
        conn.disconnect({ ifConnecting: "abandon" });
        throw e;
      }
      try {
        await conn.waitForHello(10_000);
      } catch {
        /* hello opcional si el agente está ocupado */
      }
      sharedByKey.set(key, { conn, refCount: 0, purposesKey: key });
      return conn;
    })().finally(() => {
      connectPromise = null;
    });
  }
  return connectPromise;
}

/** Ejecuta `fn` con la conexión WS compartida (no cierra al terminar). */
export async function withSharedPrintServiceConnection<T>(
  purpose: PosPrintAgentPurpose,
  opts: PrintServiceManagerOptions,
  fn: (conn: PrintServiceConnection, hello: HelloResponseData | null) => Promise<T>,
): Promise<T> {
  const purposes = Array.from(
    new Set([...(opts.requiredPurposes ?? ["tickets", "documents"]), purpose]),
  );
  const conn = await ensureSharedConnection({ ...opts, requiredPurposes: purposes });
  const key = purposesKey(purposes);
  const entry = sharedByKey.get(key);
  if (entry) entry.refCount += 1;
  try {
    return await fn(conn, conn.getHelloPayload());
  } finally {
    if (entry) entry.refCount = Math.max(0, entry.refCount - 1);
  }
}

export function isSharedPrintServiceConnected(purposes: string[] = ["tickets", "documents"]): boolean {
  const entry = sharedByKey.get(purposesKey(purposes));
  return Boolean(entry?.conn.isConnected());
}

export async function waitForSharedPrintJob(
  jobId: string,
  options?: { timeoutMs?: number; awaitUntil?: PrintJobAwaitUntil },
): Promise<PrintJobDeliveryResult> {
  for (const entry of sharedByKey.values()) {
    if (entry.conn.isConnected()) {
      return entry.conn.waitForPrintJob(jobId, options);
    }
  }
  return { status: "failed", error: "not_connected" };
}

/** Fuerza reconexión (p. ej. tras cambiar host en ajustes). */
export function resetSharedPrintServiceConnections(): void {
  for (const entry of sharedByKey.values()) {
    entry.conn.disconnect({ ifConnecting: "abandon" });
  }
  sharedByKey.clear();
  connectPromise = null;
}
