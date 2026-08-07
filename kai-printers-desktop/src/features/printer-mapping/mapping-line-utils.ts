import type { MappingLineRow, PrinterRow, LinePrinterStatus, MappingLineHealthRow } from "./types";
import { normalizeTicketPrinterType } from "./ticket-printer-type";
import { normalizePaperProfile } from "./paper-profile-options";

export function isTicketLikePurpose(purpose: string): boolean {
  return purpose === "tickets" || purpose === "comandas";
}

export function isTicketNetworkLine(line: Pick<MappingLineRow, "purpose" | "ticketPrinterType">): boolean {
  return isTicketLikePurpose(line.purpose) && normalizeTicketPrinterType(line.ticketPrinterType) === "network";
}

export function linePrinterStatus(
  line: Pick<MappingLineRow, "id" | "purpose" | "systemPrinterName" | "ticketPrinterType" | "ticketNetworkHost">,
  printers: PrinterRow[],
  healthLines?: MappingLineHealthRow[],
): LinePrinterStatus {
  const fromHealth = healthLines?.find((h) => h.id === line.id)?.status;
  if (fromHealth === "online" || fromHealth === "offline" || fromHealth === "unknown") {
    return fromHealth;
  }
  if (isTicketNetworkLine(line)) {
    return "unknown";
  }
  const name = line.systemPrinterName.trim();
  if (!name) return "unknown";
  const p = printers.find((x) => x.name === name);
  if (!p) return "offline";
  return p.online === false ? "offline" : "online";
}

export function mappingLinesEqual(a: MappingLineRow, b: MappingLineRow): boolean {
  return (
    a.purpose === b.purpose &&
    a.systemPrinterName.trim() === b.systemPrinterName.trim() &&
    normalizeTicketPrinterType(a.ticketPrinterType) === normalizeTicketPrinterType(b.ticketPrinterType) &&
    (a.ticketNetworkHost ?? "").trim() === (b.ticketNetworkHost ?? "").trim() &&
    (a.displayLabel ?? "").trim() === (b.displayLabel ?? "").trim() &&
    a.autoCutEnabled !== false === (b.autoCutEnabled !== false) &&
    a.drawerOpenEnabled === true === (b.drawerOpenEnabled === true) &&
    a.ticketLogoEnabled === true === (b.ticketLogoEnabled === true) &&
    normalizePaperProfile(a.purpose, a.paperProfile) ===
      normalizePaperProfile(b.purpose, b.paperProfile)
  );
}

export function isLineDirty(line: MappingLineRow, savedLines: MappingLineRow[]): boolean {
  const saved = savedLines.find((s) => s.id === line.id);
  if (!saved) return true;
  return !mappingLinesEqual(line, saved);
}

export function lineToSavePayload(line: MappingLineRow, sortOrder: number): Record<string, unknown> {
  const network = isTicketNetworkLine(line);
  return {
    id: line.id,
    purpose: line.purpose,
    systemPrinterName: network ? null : line.systemPrinterName.trim() || null,
    sortOrder,
    displayLabel: line.displayLabel!.trim(),
    paperProfile: normalizePaperProfile(line.purpose, line.paperProfile),
    autoCutEnabled: line.autoCutEnabled !== false,
    ...(line.purpose === "tickets"
      ? {
          ticketPrinterType: normalizeTicketPrinterType(line.ticketPrinterType),
          ticketNetworkHost: network ? line.ticketNetworkHost?.trim() || null : null,
          ticketLogoEnabled: line.ticketLogoEnabled === true,
          drawerOpenEnabled: line.drawerOpenEnabled === true,
        }
      : {}),
  };
}
