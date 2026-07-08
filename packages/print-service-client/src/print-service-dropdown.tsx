"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { PrintServiceNotification, PrintAgentVisualStatus, PrinterHealthPayload } from "./core";
import { httpsPageFromWebSocketUrl } from "./core";
import { TopBarNotificationCountBadge, type TopBarNotificationCountBadgeVariant } from "./top-bar-notification-badge";

/** Misma capa que alertas de stock (`StockAlertsDropdown`) para apilar sobre la top bar. */
const PANEL_Z = 200;

export type PrintServiceDropdownProps = {
  connected: boolean;
  health: PrinterHealthPayload | null;
  visual: PrintAgentVisualStatus;
  lastError: string | null;
  attemptedWsUrl: string | null;
  reconnect: () => void;
  notifications: PrintServiceNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  /** Ruta de la pantalla de impresión local (host, puertos, token). Por defecto `/settings/local-printing`. */
  settingsHref?: string;
  /** `pos`: panel minimalista (sin bloque de texto “Estado” extendido; mismo encabezado y notificaciones). */
  panelVariant?: "default" | "pos";
  /**
   * Sustituye el icono por defecto del servicio local (p. ej. iconos de `lucide-react` en la app consumidora).
   * Si no se pasa, se usa un marcador SVG verde/rojo integrado.
   */
  renderLocalAgentStatus?: (ctx: { connected: boolean }) => ReactNode;
  /** Clases del botón disparador (p. ej. `fs-icon-button` del POS para alinear con la top bar). */
  triggerClassName?: string;
  /** Estilo del contador de notificaciones sobre el icono de impresión. */
  notificationBadgeVariant?: TopBarNotificationCountBadgeVariant;
  /** Atributo `data-test-id` del contenedor raíz del dropdown. */
  "data-test-id"?: string;
};

function connectionIconPresentation(visual: PrintAgentVisualStatus): { dotClass: string; label: string } {
  if (visual === "ok") return { dotClass: "bg-emerald-500", label: "Conectado al agente de impresión" };
  if (visual === "connecting") return { dotClass: "bg-amber-400 animate-pulse", label: "Conectando al agente…" };
  if (visual === "degraded") return { dotClass: "bg-amber-500", label: "Conectado: revisá mapeos o impresoras en el agente" };
  return { dotClass: "bg-red-500", label: "Sin conexión al agente de impresión" };
}

/** Icono por defecto: verde (conectado al agente por WebSocket) / rojo (no hay conexión). */
function LocalPrintAgentLinkIcon({ connected }: { connected: boolean }) {
  const label = connected
    ? "Conectado al servicio local de impresión"
    : "Sin conexión al servicio local de impresión";
  if (connected) {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center" title={label} aria-label={label} role="img">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-emerald-600 dark:text-emerald-500">
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path
            d="M8 12.5 10.5 15 16 9.5"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center" title={label} aria-label={label} role="img">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-red-600 dark:text-red-500">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function statusDotClass(visual: PrintAgentVisualStatus): string {
  if (visual === "ok") return "bg-emerald-500";
  if (visual === "degraded") return "bg-amber-500";
  if (visual === "error") return "bg-red-500";
  if (visual === "connecting") return "bg-amber-400 animate-pulse";
  return "bg-neutral-400";
}

function GearGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function PrinterGlyph({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

export function PrintServiceTopBarDropdown({
  connected,
  health,
  visual,
  lastError,
  attemptedWsUrl,
  reconnect: _reconnect,
  notifications,
  unreadCount,
  markNotificationsRead,
  clearNotifications,
  settingsHref = "/settings/local-printing",
  panelVariant = "default",
  renderLocalAgentStatus,
  triggerClassName,
  notificationBadgeVariant = "destructive",
  "data-test-id": dataTestId,
}: PrintServiceDropdownProps) {
  const posMinimal = panelVariant === "pos";
  /** `unreadCount` debería coincidir; por si algo desincroniza el padre, miramos también el listado local. */
  const hasUnreadNotifications = unreadCount > 0 || notifications.some((n) => !n.read);
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  /** Misma geometría vertical y horizontal que `StockAlertsDropdown`: debajo del trigger, ancho fijo, crece hacia la izquierda. */
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = triggerWrapRef.current;
    if (!el) return;

    const place = () => {
      const r = el.getBoundingClientRect();
      const maxW = Math.min(22 * 16, window.innerWidth - 16);
      const left = Math.max(8, r.right - maxW);
      const top = r.bottom + 4;
      setCoords({ top, left, width: maxW });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (triggerWrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** No llamar `markNotificationsRead` dentro del updater de `setOpen`: actualiza el padre (`PosTopBar`) durante el setState del hijo y React lo rechaza. */
  useEffect(() => {
    if (!open) return;
    markNotificationsRead();
  }, [open, markNotificationsRead]);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const connPresentation = connectionIconPresentation(visual);

  const healthLine = !posMinimal
    ? health?.message ??
      (connected
        ? health?.overall === "ok"
          ? "Impresoras OK"
          : "Revisar mapeos en el agente"
        : visual === "connecting"
          ? "Conectando al agente…"
          : "Sin conexión al agente local")
    : "";

  const panelStyle = {
    backgroundColor: "var(--color-background)",
    borderColor: "var(--color-border)",
    color: "var(--color-foreground)",
    zIndex: PANEL_Z,
  } as const;

  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        className="fixed flex max-h-[min(32rem,85vh)] flex-col overflow-hidden rounded-lg border shadow-lg"
        style={{
          ...panelStyle,
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
        role="dialog"
        aria-label="Servicio de impresión"
        data-test-id="pos-print-service-panel"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-sm font-semibold text-foreground">Impresión local</p>
          <div className="flex shrink-0 items-center gap-2">
            <span data-test-id="pos-print-service-connection-status">
              {renderLocalAgentStatus ? (
                renderLocalAgentStatus({ connected })
              ) : (
                <LocalPrintAgentLinkIcon connected={connected} />
              )}
            </span>
            <a
              href={settingsHref}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Configuración de impresión local"
              title="Configuración de impresión local"
              data-test-id="pos-print-service-settings-link"
              onClick={() => setOpen(false)}
            >
              <GearGlyph className="opacity-90" />
            </a>
          </div>
        </div>

        {!posMinimal ? (
          <div className="shrink-0 border-b px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</p>
            <p className="text-sm">{healthLine}</p>
            {attemptedWsUrl ? (
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground" title="URL WebSocket intentada">
                {attemptedWsUrl}
              </p>
            ) : null}
            {!connected && !lastError ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-snug text-muted-foreground">
                <li>
                  La app <strong className="font-medium text-foreground">KaiPrinters</strong> debe estar en ejecución en{" "}
                  <strong className="font-medium text-foreground">esta misma máquina</strong> que el navegador del POS.
                </li>
                <li>El puerto WS en el agente debe coincidir con el de la URL (por defecto 14567).</li>
                <li>
                  Origen permitido: en el agente, «orígenes permitidos» debe incluir{" "}
                  <span className="break-all font-mono text-foreground">{typeof window !== "undefined" ? window.location.origin : "…"}</span>.
                </li>
                <li>
                  Host y puertos:{" "}
                  <a className="text-primary underline" href={settingsHref} onClick={() => setOpen(false)}>
                    configuración de impresión local
                  </a>{" "}
                  (icono arriba a la derecha).
                </li>
              </ul>
            ) : null}
            {lastError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{lastError}</p> : null}
            {lastError?.includes("1006") && attemptedWsUrl && httpsPageFromWebSocketUrl(attemptedWsUrl) ? (
              <div className="mt-2">
                <a
                  href={httpsPageFromWebSocketUrl(attemptedWsUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Confiar certificado del agente (abrir pestaña)
                </a>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  Abrí el enlace, aceptá el aviso de seguridad y volvé acá; luego reconectá desde{" "}
                  <a className="text-primary underline" href={settingsHref} onClick={() => setOpen(false)}>
                    impresión local
                  </a>{" "}
                  si hace falta.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={posMinimal ? "" : "border-b"} style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">Notificaciones</span>
              {notifications.length > 0 ? (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => clearNotifications()}>
                  Limpiar
                </button>
              ) : null}
            </div>
            {notifications.length === 0 ? (
              <p className="px-3 pb-3 text-center text-xs leading-relaxed text-muted-foreground" data-test-id="pos-print-service-no-notifications">
                No hay notificaciones para mostrar.
              </p>
            ) : (
              <ul className="space-y-0 pb-2">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`border-t px-3 py-2 text-xs ${
                      n.level === "error" ? "text-red-600 dark:text-red-400" : n.level === "warn" ? "text-amber-700 dark:text-amber-400" : ""
                    }`}
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="text-muted-foreground">{new Date(n.at).toLocaleTimeString()}</span> — {n.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div
      className="relative z-[100] shrink-0 overflow-visible"
      data-test-id={dataTestId ?? "pos-print-service-dropdown-root"}
    >
      <div ref={triggerWrapRef} className="relative inline-flex shrink-0">
        <button
          type="button"
          onClick={toggle}
          className={
            triggerClassName ??
            "relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-md border border-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          }
          aria-label={
            posMinimal
              ? `${connected ? "Conectado" : "Sin conexión"} al servicio local de impresión${unreadCount > 0 ? `: ${unreadCount} sin leer` : ""}`
              : `Impresión local y notificaciones${unreadCount > 0 ? `: ${unreadCount} sin leer` : ""}`
          }
          aria-expanded={open}
          data-test-id="pos-print-service-trigger"
        >
          <span
            className={`relative inline-flex ${
              posMinimal
                ? connected
                  ? "text-emerald-600 dark:text-emerald-500"
                  : "text-red-600 dark:text-red-500"
                : ""
            }`}
          >
            <PrinterGlyph className="relative shrink-0 text-current" strokeWidth={triggerClassName ? 2.5 : 2} />
            {!posMinimal && !hasUnreadNotifications ? (
              <span
                className={`absolute -right-0.5 -top-0.5 z-[1] h-2 w-2 rounded-full ring-2 ring-background ${statusDotClass(visual)}`}
                title={connPresentation.label}
              />
            ) : null}
          </span>
        </button>
        <TopBarNotificationCountBadge count={unreadCount} variant={notificationBadgeVariant} />
      </div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
