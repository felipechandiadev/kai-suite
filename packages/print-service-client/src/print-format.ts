export type PrintAgentPurpose = "tickets" | "documents";
export type PrintFormat =
  | "ticket_58mm"
  | "ticket_80mm"
  | "document_letter"
  | "document_a4";

/** Perfil físico de impresora en el agente Kai Printers. */
export type PrinterPaperProfile = "58mm" | "80mm" | "letter" | "a4";

/** @deprecated Usar PrintFormat */
export type PosDocumentPrintMode = "ticket" | "document";

export type AdminDocumentPrintMode = PosDocumentPrintMode;

export const PRINT_FORMATS: PrintFormat[] = [
  "ticket_58mm",
  "ticket_80mm",
  "document_letter",
  "document_a4",
];

export function isTicketPrintFormat(format: PrintFormat): boolean {
  return format === "ticket_58mm" || format === "ticket_80mm";
}

export function isDocumentPrintFormat(format: PrintFormat): boolean {
  return format === "document_letter" || format === "document_a4";
}

export function printFormatToPurpose(format: PrintFormat): PrintAgentPurpose {
  return isTicketPrintFormat(format) ? "tickets" : "documents";
}

/** Jobs de cocina usan purpose `comandas` con formatos ticket 58/80 mm. */
export function formatCompatibleWithPurpose(
  format: PrintFormat,
  purpose: string,
): boolean {
  const p = purpose.trim();
  if (p === "comandas") return isTicketPrintFormat(format);
  return printFormatToPurpose(format) === p;
}

export function printFormatToPaperProfile(format: PrintFormat): PrinterPaperProfile {
  switch (format) {
    case "ticket_58mm":
      return "58mm";
    case "ticket_80mm":
      return "80mm";
    case "document_letter":
      return "letter";
    case "document_a4":
      return "a4";
  }
}

export function paperProfileToDefaultFormat(profile: PrinterPaperProfile): PrintFormat {
  switch (profile) {
    case "58mm":
      return "ticket_58mm";
    case "80mm":
      return "ticket_80mm";
    case "letter":
      return "document_letter";
    case "a4":
      return "document_a4";
  }
}

export function migrateLegacyPrintMode(mode: PosDocumentPrintMode): PrintFormat {
  return mode === "document" ? "document_a4" : "ticket_80mm";
}

export function printFormatToLegacyMode(format: PrintFormat): PosDocumentPrintMode {
  return isDocumentPrintFormat(format) ? "document" : "ticket";
}

export function parsePrintFormat(raw: string | null | undefined): PrintFormat | null {
  const v = (raw || "").trim().toLowerCase();
  if (v === "ticket") return "ticket_80mm";
  if (v === "document") return "document_a4";
  if (PRINT_FORMATS.includes(v as PrintFormat)) return v as PrintFormat;
  return null;
}

export function describePrintFormat(format: PrintFormat): string {
  switch (format) {
    case "ticket_58mm":
      return "ticket (58 mm)";
    case "ticket_80mm":
      return "ticket (80 mm)";
    case "document_letter":
      return "documento (carta)";
    case "document_a4":
      return "documento (A4)";
  }
}

export function resolvePrintFormat(
  format: PrintFormat | undefined | null,
  legacyMode?: PosDocumentPrintMode | null,
): PrintFormat {
  if (format) return format;
  if (legacyMode) return migrateLegacyPrintMode(legacyMode);
  return "ticket_80mm";
}

export function formatsMatchProfile(format: PrintFormat, profile: PrinterPaperProfile): boolean {
  return printFormatToPaperProfile(format) === profile;
}

export const TICKET_PRINT_FORMATS: PrintFormat[] = ["ticket_58mm", "ticket_80mm"];
export const DOCUMENT_PRINT_FORMATS: PrintFormat[] = ["document_letter", "document_a4"];
