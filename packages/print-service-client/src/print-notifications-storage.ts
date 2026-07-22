import type { PrintServiceNotification, PrintServiceNotificationKind } from "./core";
import { dispatchDualPlatformEvent } from "./platform-events";
import {
  getMigratedLocalStorageItem,
  removeMigratedLocalStorageKeys,
  setMigratedLocalStorageItem,
} from "../../../shared/storage-key-migrate";

const LS_PREFIX = "kai:print-service-notifications:";
const LS_PREFIX_LEGACY = "flowstore:print-service-notifications:";
const MAX_STORED = 30;

export function printServiceNotificationsStorageKey(clientId: string): string {
  return `${LS_PREFIX}${clientId || "pwa"}`;
}

export function printServiceNotificationsStorageKeyLegacy(clientId: string): string {
  return `${LS_PREFIX_LEGACY}${clientId || "pwa"}`;
}

function isNotificationKind(value: unknown): value is PrintServiceNotificationKind {
  return value === "disconnected" || value === "job_failed";
}

function parseStoredItem(raw: unknown): PrintServiceNotification | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.at !== "number" || typeof o.message !== "string") {
    return null;
  }
  if (!isNotificationKind(o.kind)) return null;
  return {
    id: o.id,
    at: o.at,
    kind: o.kind,
    level: "error",
    message: o.message,
    read: Boolean(o.read),
  };
}

export function readPrintServiceNotificationsFromStorage(clientId: string): PrintServiceNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getMigratedLocalStorageItem(
      printServiceNotificationsStorageKey(clientId),
      printServiceNotificationsStorageKeyLegacy(clientId),
    );
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseStoredItem)
      .filter((n): n is PrintServiceNotification => n !== null)
      .slice(0, MAX_STORED);
  } catch {
    return [];
  }
}

export function writePrintServiceNotificationsToStorage(
  clientId: string,
  items: PrintServiceNotification[],
): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedLocalStorageItem(
      printServiceNotificationsStorageKey(clientId),
      printServiceNotificationsStorageKeyLegacy(clientId),
      JSON.stringify(items.slice(0, MAX_STORED)),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearPrintServiceNotificationsStorage(clientId: string): void {
  if (typeof window === "undefined") return;
  try {
    removeMigratedLocalStorageKeys(
      printServiceNotificationsStorageKey(clientId),
      printServiceNotificationsStorageKeyLegacy(clientId),
    );
  } catch {
    /* ignore */
  }
}

/** Mensaje fijo para desconexión del agente (único tipo «disconnected»). */
export const PRINT_SERVICE_DISCONNECTED_MESSAGE = "KaiPrinters no está conectado.";

/** Evento para errores síncronos de impresión (encolado rechazado antes de `print_job_failed`). */
export const PRINT_SERVICE_JOB_FAILED_EVENT = "kai:print-service-job-failed";
export const PRINT_SERVICE_JOB_FAILED_EVENT_LEGACY = "flowstore:print-service-job-failed";

const PRINT_AGENT_ERROR_MESSAGES_ES: Record<string, string> = {
  format_printer_mismatch:
    "El formato del ticket no coincide con el ancho de papel de la impresora en Kai Printers.",
  format_purpose_mismatch: "El formato elegido no corresponde al tipo de impresora (tickets o documentos).",
  no_printer_mapped: "No hay impresora asignada para este propósito en Kai Printers.",
  unsupported_print_type: "Tipo de impresión no soportado por el agente.",
  ticket_required: "Faltan datos del ticket para imprimir.",
  payload_required: "Faltan datos del documento para imprimir.",
  not_connected: "KaiPrinters no está conectado.",
  not_started: "No se pudo iniciar la conexión WebSocket con Kai Printers.",
  closed_before_open:
    "Kai Printers cerró la conexión antes de abrir (¿agente detenido o host/puerto incorrectos?).",
  open_timeout: "Tiempo de espera agotado al conectar con Kai Printers.",
  enqueue_rejected: "El agente rechazó el trabajo de impresión.",
  print_failed: "La impresora no pudo completar el trabajo.",
  invalid_ticket_json: "El ticket recibido no tiene un formato válido.",
  print_job_timeout: "Tiempo de espera agotado esperando que Kai Printers termine de imprimir.",
  usb_write_failed: "Error al enviar datos a la impresora USB.",
  stale_print_job_recovered: "Un trabajo de impresión anterior quedó bloqueado y fue cancelado.",
  test_print_failed: "No se pudo imprimir la página de prueba.",
  timeout: "Tiempo de espera agotado al contactar Kai Printers.",
  agent_no_pos_dining_account_ticket:
    "Kai Printers no soporta ticket de cuenta dining. Actualice e inicie de nuevo el agente.",
  agent_no_pos_sale_ticket:
    "Kai Printers no soporta ticket de venta. Actualice e inicie de nuevo el agente.",
};

export function humanizePrintAgentError(error: string): string {
  const raw = (error || "").trim();
  if (!raw) return "error desconocido";
  for (const [code, message] of Object.entries(PRINT_AGENT_ERROR_MESSAGES_ES)) {
    if (raw.toLowerCase().includes(code)) return message;
  }
  return raw;
}

export function formatPrintJobFailedMessage(error: string): string {
  const detail = humanizePrintAgentError(error);
  const short = detail.length > 160 ? `${detail.slice(0, 157)}…` : detail;
  return `Error al imprimir: ${short}`;
}

export function emitPrintServiceJobFailed(error: string): void {
  if (typeof window === "undefined") return;
  dispatchDualPlatformEvent(PRINT_SERVICE_JOB_FAILED_EVENT, { error: (error || "").trim() });
}

/** Errores de configuración/protocolo donde el fallback al navegador no ayuda (p. ej. tablet Android). */
export function isAgentPrintConfigError(error: string): boolean {
  const e = (error || "").toLowerCase();
  if (!e) return false;
  return (
    e.includes("format_printer_mismatch") ||
    e.includes("format_purpose_mismatch") ||
    e.includes("no_printer_mapped") ||
    e.includes("unsupported_print_type") ||
    e.includes("ticket_required") ||
    e.includes("payload_required") ||
    e.includes("enqueue_rejected") ||
    e.includes("not_connected") ||
    e.includes("not_started") ||
    e.includes("closed_before_open") ||
    e.includes("open_timeout") ||
    e.includes("agent_no_pos_sale_ticket") ||
    e.includes("agent_no_pos_dining_account_ticket") ||
    e.includes("print_job_timeout")
  );
}
