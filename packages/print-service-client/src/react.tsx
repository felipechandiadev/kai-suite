"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  healthToVisual,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  readConfiguredPurposePrinterAliasMap,
  PRINT_SERVICE_CONFIG_CHANGED_EVENT,
  PRINT_WS_CLOSE_REASON_SERVICE_STOPPED,
  PRINT_WS_CLOSE_REASON_SERVICE_STOPPED_LEGACY,
  type HelloResponseData,
  type PrinterHealthPayload,
  type PrintAgentVisualStatus,
  type PrintServiceNotification,
  type PrintServiceWsCloseInfo,
} from "./core";
import {
  clearPrintServiceNotificationsStorage,
  formatPrintJobFailedMessage,
  PRINT_SERVICE_DISCONNECTED_MESSAGE,
  PRINT_SERVICE_JOB_FAILED_EVENT,
  readPrintServiceNotificationsFromStorage,
  writePrintServiceNotificationsToStorage,
} from "./print-notifications-storage";
import { addDualPlatformEventListener } from "./platform-events";

export type UsePrintServiceConnectionOptions = {
  defaultHost?: string;
  defaultPort?: number;
  defaultWssPort?: number;
  clientId?: string;
  requiredPurposes?: string[];
  /** Etiqueta de la app en el `hello` (p. ej. «Punto de venta»). */
  appLabel?: string;
  /** Nombre visible en el `hello` para la lista de sesiones del agente. */
  userDisplayName?: string;
  /** Empresa — visible en KaiPrinters (sesiones conectadas). */
  companyName?: string;
  /** Punto de venta (POS) — visible en KaiPrinters. */
  pointOfSaleName?: string;
  /** Aliases por propósito que usa esta app (p. ej. tickets/documents). Si no se pasa, se leen de localStorage POS/admin. */
  purposePrinterAliases?: Partial<Record<string, string>>;
  /**
   * El estado sigue en `visual`, `connected`, `lastError`.
   * @default true
   */
  enableInAppNotifications?: boolean;
  /**
   * Mensajes cortos en `lastError` ante cierre anómalo del WebSocket (no afecta el texto de la notificación de desconexión).
   * Ayuda técnica larga solo en consola si `debug` está activo.
   * @default false
   */
  briefWsErrorMessages?: boolean;
  /**
   * Si es true, escribe en consola del navegador eventos de conexión al agente local (host/puerto, open/close, errores, hello).
   * No registra el valor del token.
   */
  debug?: boolean;
  /**
   * Trabajo fallido en el agente. Si devuelve `true`, no se añade la notificación in-app por defecto.
   */
  onPrintJobFailed?: (jobId: string, error: string) => boolean | void;
  /** Trabajo completado en el agente (p. ej. limpiar fallback de impresión en navegador). */
  onPrintJobDone?: (jobId: string) => void;
};

function newNotificationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function describeWsCloseFailure(
  ev: PrintServiceWsCloseInfo,
  ctx?: { httpPageWithUserWss: boolean; wssPort: number },
  brief?: boolean,
): string {
  const r = (ev.reason && String(ev.reason).trim()) || "";
  if (brief) {
    if (ev.code === 1006 && ctx?.httpPageWithUserWss === true) {
      return "Sin impresión local: revisá TLS/WSS o que KaiPrinters esté activo.";
    }
    if (ev.code === 1006) return "KaiPrinters sin conexión.";
    if (ev.code === 1002) return `Error de conexión (1002)${r ? `: ${r}` : ""}`;
    if (ev.code === 1008) return `Conexión rechazada (1008)${r ? `: ${r}` : ""}`;
    return r ? `Conexión perdida (${ev.code}): ${r}` : `Sin conexión (${ev.code}).`;
  }
  if (ev.code === 1006) {
    const httpWssHint =
      ctx?.httpPageWithUserWss === true
        ? [
            "Esta PWA está en HTTP y tenés «TLS/WSS» activado en los ajustes de impresión local: el navegador intenta wss:// y suele fallar (certificado no confiado o agente solo en WS).",
            `Podés desactivar «TLS/WSS» en el menú de impresión para usar ws:// en el puerto WS (típicamente 14567), o abrir una vez https://127.0.0.1:${ctx.wssPort} y aceptar el certificado local.`,
            "",
          ].join(" ")
        : "";
    return [
      httpWssHint,
      "WebSocket no conectó o se cortó de forma anómala (código 1006).",
      "Revisá: la app «KaiPrinters» en ejecución (bandeja); host y puertos; desde HTTPS el navegador exige WSS (no ws://).",
      "Si usás WSS, puede hacer falta abrir una vez https://127.0.0.1:PUERTO_WSS en el navegador y aceptar el certificado local.",
      "En la app del agente, «orígenes permitidos» debe incluir el origen exacto de esta PWA (incluido https y el puerto).",
      "Host 127.0.0.1 = agente en este mismo dispositivo (aunque abras el POS por IP de la red). IP LAN = agente en otro equipo; en KaiPrinters usá interfaz 0.0.0.0 y orígenes permitidos.",
    ].join(" ");
  }
  if (ev.code === 1002) {
    return `Error de protocolo WebSocket (1002)${r ? `: ${r}` : ""}.`;
  }
  if (ev.code === 1008) {
    return `Conexión rechazada por política (1008)${r ? `: ${r}` : ""}.`;
  }
  return `WebSocket cerrado (código ${ev.code})${r ? `: ${r}` : ""}.`;
}

export type UsePrintServiceConnectionReturn = {
  connected: boolean;
  health: PrinterHealthPayload | null;
  visual: PrintAgentVisualStatus;
  lastError: string | null;
  /** URL que intenta usar el cliente (diagnóstico). */
  attemptedWsUrl: string | null;
  reconnect: () => void;
  notifications: PrintServiceNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
};

function printServiceDebugLog(message: string, detail?: Record<string, unknown>): void {
  if (typeof console === "undefined" || typeof console.info !== "function") return;
  if (detail && Object.keys(detail).length > 0) {
    console.info("[KaiPrinters]", message, detail);
  } else {
    console.info("[KaiPrinters]", message);
  }
}

export function usePrintServiceConnection(opts: UsePrintServiceConnectionOptions = {}): UsePrintServiceConnectionReturn {
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);
  const [socketConnecting, setSocketConnecting] = useState(false);
  const [health, setHealth] = useState<PrinterHealthPayload | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attemptedWsUrl, setAttemptedWsUrl] = useState<string | null>(null);
  const storageClientId = opts.clientId ?? "pwa";
  /** Inicia vacío: leer localStorage en el initializer rompe la hidratación (SSR = 0, cliente = N). */
  const [notifications, setNotifications] = useState<PrintServiceNotification[]>([]);
  const connRef = useRef<PrintServiceConnection | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const healthOverallRef = useRef<string | undefined>(undefined);
  const lastWsErrorRef = useRef<{ msg: string; at: number }>({ msg: "", at: 0 });
  /** Evita repetir la notificación de desconexión hasta volver a conectar. */
  const disconnectNotifiedRef = useRef(false);
  const lineStatusByIdRef = useRef<Map<string, string>>(new Map());
  const debugRef = useRef(false);
  debugRef.current = Boolean(opts.debug);

  const envDefaults = useMemo(() => {
    const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
    const env = g.process?.env ?? {};
    return {
      host: opts.defaultHost ?? env.NEXT_PUBLIC_PRINT_SERVICE_HOST ?? "127.0.0.1",
      port: opts.defaultPort ?? Number(env.NEXT_PUBLIC_PRINT_SERVICE_PORT || "14567"),
      wssPort: opts.defaultWssPort ?? Number(env.NEXT_PUBLIC_PRINT_SERVICE_WSS_PORT || "14568"),
    };
  }, [opts.defaultHost, opts.defaultPort, opts.defaultWssPort]);

  /** Evita re-montar el WebSocket cuando el padre pasa `requiredPurposes={[...]}` inline (nueva ref cada render). */
  const clientOptsKey = useMemo(() => {
    const cid = opts.clientId ?? "pwa";
    const purposes = (opts.requiredPurposes ?? []).join("\u0001");
    const app = (opts.appLabel ?? "").trim();
    const who = (opts.userDisplayName ?? "").trim();
    const company = (opts.companyName ?? "").trim();
    const pos = (opts.pointOfSaleName ?? "").trim();
    return `${cid}\u0002${purposes}\u0002${app}\u0002${who}\u0002${company}\u0002${pos}`;
  }, [
    opts.clientId,
    (opts.requiredPurposes ?? []).join("\u0001"),
    opts.appLabel,
    opts.userDisplayName,
    opts.companyName,
    opts.pointOfSaleName,
  ]);

  const visual: PrintAgentVisualStatus = healthToVisual(connected, health, socketConnecting);

  const persistNotifications = useCallback(
    (items: PrintServiceNotification[]) => {
      writePrintServiceNotificationsToStorage(storageClientId, items);
    },
    [storageClientId],
  );

  const pushNotification = useCallback(
    (partial: Omit<PrintServiceNotification, "id" | "read" | "at" | "level">) => {
      if (opts.enableInAppNotifications === false) return;
      setNotifications((prev) => {
        const entry: PrintServiceNotification = {
          ...partial,
          id: newNotificationId(),
          at: Date.now(),
          read: false,
          level: "error",
        };
        const next: PrintServiceNotification[] = [entry, ...prev].slice(0, 30);
        persistNotifications(next);
        return next;
      });
    },
    [opts.enableInAppNotifications, persistNotifications],
  );

  const notifyClientPrinterOffline = useCallback(
    (p: PrinterHealthPayload) => {
      const aliasMap =
        opts.purposePrinterAliases && Object.keys(opts.purposePrinterAliases).length > 0
          ? opts.purposePrinterAliases
          : readConfiguredPurposePrinterAliasMap();
      const lines = p.lines ?? [];
      for (const [purpose, aliasRaw] of Object.entries(aliasMap)) {
        const alias = (aliasRaw ?? "").trim();
        if (!alias) continue;
        const line = lines.find(
          (l) =>
            l.purpose === purpose &&
            (l.displayLabel ?? "").trim().toLowerCase() === alias.toLowerCase(),
        );
        if (!line?.id) continue;
        const cur = line.status ?? "unknown";
        const prev = lineStatusByIdRef.current.get(line.id);
        if (prev === "online" && cur === "offline") {
          const queue = line.systemPrinterName?.trim() || "?";
          pushNotification({
            kind: "printer_offline",
            message: `Impresora «${alias}» (${queue}) no disponible.`,
          });
        }
        if (cur === "online" || cur === "offline") {
          lineStatusByIdRef.current.set(line.id, cur);
        }
      }
    },
    [opts.purposePrinterAliases, pushNotification],
  );

  const applyPrinterHealth = useCallback(
    (p: PrinterHealthPayload) => {
      setHealth(p);
      const o = p.overall;
      if (o) healthOverallRef.current = o;
      notifyClientPrinterOffline(p);
    },
    [notifyClientPrinterOffline],
  );

  const notifyDisconnected = useCallback(() => {
    if (disconnectNotifiedRef.current) return;
    disconnectNotifiedRef.current = true;
    pushNotification({
      kind: "disconnected",
      message: PRINT_SERVICE_DISCONNECTED_MESSAGE,
    });
  }, [pushNotification]);

  const notifyJobFailed = useCallback(
    (_jobId: string, error: string) => {
      pushNotification({
        kind: "job_failed",
        message: formatPrintJobFailedMessage(error),
      });
    },
    [pushNotification],
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistNotifications(next);
      return next;
    });
  }, [persistNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    clearPrintServiceNotificationsStorage(storageClientId);
  }, [storageClientId]);

  useEffect(() => {
    setNotifications(readPrintServiceNotificationsFromStorage(storageClientId));
    disconnectNotifiedRef.current = false;
  }, [storageClientId]);

  useEffect(() => {
    const onSyncJobFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ error?: string }>).detail;
      const err = detail?.error?.trim();
      if (err) notifyJobFailed("", err);
    };
    return addDualPlatformEventListener(PRINT_SERVICE_JOB_FAILED_EVENT, onSyncJobFailed);
  }, [notifyJobFailed]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const scheduleReconnect = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(retryRef.current, 5));
    if (debugRef.current) {
      printServiceDebugLog("reconnect_scheduled", {
        delayMs: delay,
        nextAttempt: retryRef.current + 1,
      });
    }
    timerRef.current = window.setTimeout(() => {
      retryRef.current += 1;
      setTick((t: number) => t + 1);
    }, delay);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === "printServiceHost" ||
        e.key === "printServicePort" ||
        e.key === "printServiceWssPort" ||
        e.key === "printServiceUseTls"
      ) {
        if (debugRef.current) {
          printServiceDebugLog("storage_print_config_changed", { key: e.key, newValue: e.newValue ?? null });
        }
        setTick((t) => t + 1);
      }
    };
    const onSameTabConfig = () => {
      if (debugRef.current) {
        printServiceDebugLog("print_config_changed_same_tab", {});
      }
      setTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PRINT_SERVICE_CONFIG_CHANGED_EVENT, onSameTabConfig);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PRINT_SERVICE_CONFIG_CHANGED_EVENT, onSameTabConfig);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fromLs = readPrintServiceConfigFromStorage();
    const host = fromLs.host || envDefaults.host;
    const pageHttps = printServicePageRequiresTls();
    /** HTTPS exige WSS (mixed content). En HTTP usamos `ws://` salvo que el usuario active «TLS/WSS» en ajustes (localStorage). `NEXT_PUBLIC_PRINT_SERVICE_USE_TLS` ya no fuerza WSS en HTTP: chocaba con el POS en `http://localhost:*` sin certificado aceptado. */
    const useTls = pageHttps || fromLs.useTls;
    const port = useTls ? fromLs.wssPort || envDefaults.wssPort : fromLs.port || envDefaults.port;
    const tlsBecause = pageHttps ? "https_page" : fromLs.useTls ? "local_storage_printServiceUseTls" : "plain_ws";
    const url = buildWebSocketUrl(host, port, useTls);
    setAttemptedWsUrl(url);

    if (opts.debug) {
      printServiceDebugLog("connect_start", {
        url,
        pageHttps,
        useTls,
        tlsBecause,
        host,
        port,
        clientId: opts.clientId ?? "pwa",
        requiredPurposes: opts.requiredPurposes ?? [],
        pwaOrigin: typeof window !== "undefined" ? window.location.origin : "",
        ...(pageHttps || !fromLs.useTls
          ? {}
          : {
              hint:
                "Página HTTP con WSS activado en ajustes: desactivá «TLS/WSS» en el menú de impresión (ws:// puerto WS) o confiá el certificado en https://127.0.0.1:" +
                String(fromLs.wssPort || envDefaults.wssPort),
            }),
      });
    }

    setSocketConnecting(true);
    setConnected(false);
    setHealth(null);
    healthOverallRef.current = undefined;
    lineStatusByIdRef.current = new Map();

    const c = new PrintServiceConnection({
      url,
      clientId: opts.clientId,
      requiredPurposes: opts.requiredPurposes,
      appLabel: opts.appLabel,
      userDisplayName: opts.userDisplayName,
      companyName: opts.companyName,
      pointOfSaleName: opts.pointOfSaleName,
      onOpen: () => {
        if (opts.debug) {
          printServiceDebugLog("ws_open", { url });
        }
        setSocketConnecting(false);
        setConnected(true);
        setLastError(null);
        retryRef.current = 0;
        disconnectNotifiedRef.current = false;
      },
      onClose: (ev) => {
        if (opts.debug) {
          printServiceDebugLog("ws_close", {
            url,
            code: ev.code,
            reason: ev.reason || "",
            wasClean: ev.wasClean,
          });
        }
        setSocketConnecting(false);
        setConnected(false);
        const stoppedFromAgentUi =
          ev.code === 1000 &&
          ev.wasClean &&
          typeof ev.reason === "string" &&
          (ev.reason.includes(PRINT_WS_CLOSE_REASON_SERVICE_STOPPED) ||
            ev.reason.includes(PRINT_WS_CLOSE_REASON_SERVICE_STOPPED_LEGACY));
        const abnormal = !stoppedFromAgentUi && (ev.code !== 1000 || !ev.wasClean);
        if (!cancelled) {
          const briefErr = opts.briefWsErrorMessages === true;
          const wssPortForHint = fromLs.wssPort || envDefaults.wssPort;
          const hint =
            describeWsCloseFailure(
              ev,
              {
                httpPageWithUserWss: !pageHttps && useTls,
                wssPort: wssPortForHint,
              },
              briefErr,
            ) +
            (briefErr || typeof window === "undefined"
              ? ""
              : ` Origen de esta PWA: ${window.location.origin}.`);
          if (opts.debug && briefErr) {
            printServiceDebugLog("ws_close_user_hint_long", {
              code: ev.code,
              reason: ev.reason ?? "",
              wasClean: ev.wasClean,
              url,
              hintFull: describeWsCloseFailure(ev, {
                httpPageWithUserWss: !pageHttps && useTls,
                wssPort: wssPortForHint,
              }),
              origin:
                typeof window !== "undefined" ? window.location.origin : undefined,
            });
          }
          if (abnormal || stoppedFromAgentUi) {
            const now = Date.now();
            const prev = lastWsErrorRef.current;
            if (!(prev.msg === hint && now - prev.at < 5000)) {
              lastWsErrorRef.current = { msg: hint, at: now };
              setLastError(hint);
            }
          }
          notifyDisconnected();
        }
        if (!cancelled) scheduleReconnect();
      },
      onError: (m) => {
        if (opts.debug) {
          printServiceDebugLog("ws_or_protocol_error", { url, message: m });
        }
        setSocketConnecting(false);
        const human = m;
        const now = Date.now();
        const prev = lastWsErrorRef.current;
        if (prev.msg === human && now - prev.at < 800) return;
        lastWsErrorRef.current = { msg: human, at: now };
        setLastError(human);
      },
      onHello: (d: HelloResponseData) => {
        if (opts.debug) {
          const ph = d.printerHealth;
          printServiceDebugLog("hello_ok", {
            serviceStatus: d.serviceStatus,
            printerHealthOverall: ph?.overall,
            printerHealthMessage: ph?.message,
            purposesKeys: ph?.purposes ? Object.keys(ph.purposes) : [],
          });
        }
        if (d.printerHealth) {
          applyPrinterHealth(d.printerHealth);
        }
      },
      onPrinterHealth: (p) => {
        applyPrinterHealth(p);
      },
      onConfigChanged: () => {
        /* sin notificación: solo desconexión y fallo de impresión */
      },
      onPrintJobDone: (jobId) => {
        if (!cancelled) opts.onPrintJobDone?.(jobId);
      },
      onPrintJobFailed: (jobId, error) => {
        if (cancelled) return;
        const handled = opts.onPrintJobFailed?.(jobId, error);
        if (handled !== true && opts.enableInAppNotifications !== false) {
          notifyJobFailed(jobId, error);
        }
      },
    });
    connRef.current = c;
    c.connect();

    return () => {
      cancelled = true;
      if (opts.debug) {
        printServiceDebugLog("connect_cleanup", { url });
      }
      setSocketConnecting(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      c.disconnect();
      connRef.current = null;
    };
  }, [
    envDefaults.host,
    envDefaults.port,
    envDefaults.wssPort,
    clientOptsKey,
    scheduleReconnect,
    tick,
    opts.debug,
    opts.enableInAppNotifications,
    opts.briefWsErrorMessages,
    opts.appLabel,
    opts.userDisplayName,
    opts.companyName,
    opts.pointOfSaleName,
    notifyDisconnected,
    notifyJobFailed,
    applyPrinterHealth,
    opts.onPrintJobDone,
    opts.onPrintJobFailed,
  ]);

  const reconnect = useCallback(() => {
    if (debugRef.current) {
      printServiceDebugLog("reconnect_manual");
    }
    retryRef.current = 0;
    setTick((t: number) => t + 1);
  }, []);

  return {
    connected,
    health,
    visual,
    lastError,
    attemptedWsUrl,
    reconnect,
    notifications,
    unreadCount,
    markNotificationsRead,
    clearNotifications,
  };
}

export type PrintServiceIndicatorProps = {
  visual: PrintAgentVisualStatus;
  title?: string;
  href?: string;
};

export function PrintServiceIndicator({ visual, title, href }: PrintServiceIndicatorProps) {
  const color =
    visual === "ok"
      ? "bg-emerald-500"
      : visual === "degraded"
        ? "bg-amber-500"
        : visual === "error"
          ? "bg-red-500"
          : visual === "connecting"
            ? "bg-amber-400 animate-pulse"
            : "bg-neutral-400";
  const label =
    title ??
    (visual === "ok"
      ? "Impresión local: OK"
      : visual === "degraded"
        ? "Impresión local: revisar mapeos"
        : visual === "error"
          ? "Impresión local: error"
          : visual === "connecting"
            ? "Impresión local: conectando…"
            : "Impresión local: desconectado");
  const inner = (
    <span
      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      title={label}
      aria-label={label}
      role="img"
    />
  );
  if (href) {
    return (
      <a href={href} className="inline-flex items-center rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
        {inner}
      </a>
    );
  }
  return inner;
}
