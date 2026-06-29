/** Tipo de conexión para líneas con propósito «Tickets». */
export type TicketPrinterType = "system" | "network";

export const TICKET_PRINTER_TYPE_OPTIONS: { id: TicketPrinterType; label: string }[] = [
  { id: "system", label: "Impresora del sistema" },
  { id: "network", label: "Impresora en red (IP)" },
];

export function normalizeTicketPrinterType(raw: unknown): TicketPrinterType {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return v === "network" ? "network" : "system";
}

/** Separa `192.168.1.50` o `192.168.1.50:9100` (puerto opcional, default 9100). */
export function parseNetworkHostInput(raw: string): { host: string; port: number } | null {
  const t = raw.trim();
  if (!t) return null;
  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/.exec(t);
  if (withPort) {
    const host = withPort[1];
    const port = Number(withPort[2]);
    if (!isPlausibleIpv4(host) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
    return { host, port };
  }
  if (isPlausibleIpv4(t)) return { host: t, port: 9100 };
  if (/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(t)) return { host: t, port: 9100 };
  return null;
}

function isPlausibleIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return host.split(".").every((oct) => {
    const n = Number(oct);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/** IPv4, hostname o IP:puerto (puerto RAW habitual 9100). */
export function isPlausibleNetworkHost(raw: string): boolean {
  return parseNetworkHostInput(raw) != null;
}
