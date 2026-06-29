export type PrinterRow = {
  name: string;
  default?: boolean;
  online?: boolean;
};

import type { TicketPrinterType } from "./ticket-printer-type";

export type MappingLineRow = {
  id: string;
  purpose: string;
  systemPrinterName: string;
  sortOrder: number;
  displayLabel?: string;
  /** Solo propósito tickets: impresora del SO vs IP en red. */
  ticketPrinterType?: TicketPrinterType;
  /** IP/host cuando ticketPrinterType === "network". */
  ticketNetworkHost?: string;
  autoCutEnabled?: boolean;
  /** Solo tickets: pulso ESC p para abrir gaveta tras el ticket (después del corte si aplica). */
  drawerOpenEnabled?: boolean;
  ticketLogoEnabled?: boolean;
  /** Perfil de papel: 58mm | 80mm (tickets) o letter | a4 (documents). */
  paperProfile?: string;
};

export type LinePrinterStatus = "unknown" | "online" | "offline";

/** Estado de reachability por línea (desde `printerHealth.lines` del agente). */
export type MappingLineHealthRow = {
  id?: string;
  status?: LinePrinterStatus;
  reason?: string;
};
