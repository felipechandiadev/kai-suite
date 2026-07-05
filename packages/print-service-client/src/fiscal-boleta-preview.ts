import type { PosSaleTicketCompany } from "./pos-sale-ticket";

/**
 * Boleta electrónica simulada (Set BE) → agente KaiPrinters (`type: "fiscal-boleta-preview"`).
 */

export const FISCAL_BOLETA_PREVIEW_PAYLOAD_VERSION = 1;

/** Ancho timbre PDF417: 100% del ticket (≈ {@link PRINT_FORMAT_PRESETS} `contentWidthMm` 70 en 80 mm). */
export const FISCAL_PDF417_USE_FULL_RECEIPT_WIDTH = true;

/** Factor de altura extra del timbre (preview SVG + raster ESC/POS). */
export const FISCAL_PDF417_HEIGHT_SCALE = 1.5;

/** Escala bwip-js PDF417 para preview HTML (módulos más grandes = más alto y legible). */
export function fiscalPdf417PreviewScale(format: "ticket_58mm" | "ticket_80mm"): number {
  return format === "ticket_58mm" ? 4 : 5;
}

export type FiscalBoletaPreviewEmisor = {
  rut: string | null;
  legalName: string | null;
  businessActivity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  resolutionNumber: string | null;
  resolutionDate: string | null;
};

/** RUT genérico SII cuando la venta no tiene cliente identificado (DTE sí lo lleva; ticket impreso no). */
export const GENERIC_BOLETA_RECEPTOR_RUT = "66666666-6";

export type FiscalBoletaPreviewReceptor = {
  rut: string;
  name: string;
};

/** Normaliza RUT para comparar con {@link GENERIC_BOLETA_RECEPTOR_RUT}. */
export function normalizeBoletaReceptorRut(rut: string): string {
  return rut.replace(/\./g, "").trim().toUpperCase();
}

/** Venta anónima / sin RUT válido → no mostrar bloque Receptor en ticket impreso. */
export function shouldShowReceptorOnFiscalBoletaTicket(receptor: {
  rut: string;
}): boolean {
  return normalizeBoletaReceptorRut(receptor.rut) !== GENERIC_BOLETA_RECEPTOR_RUT;
}

export type FiscalBoletaPreviewLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt?: boolean;
  unitMeasure?: string | null;
  lineTotal: number;
};

export type FiscalBoletaPreviewTotals = {
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
};

export type FiscalBoletaPreviewPayload = {
  version: number;
  caso: string;
  folio: number;
  issuedAt: string;
  tipoDte: 39;
  isSimulated: boolean;
  emisor: FiscalBoletaPreviewEmisor;
  company: PosSaleTicketCompany;
  receptor: FiscalBoletaPreviewReceptor;
  /** Si false, ESC/POS/HTML omiten bloque Receptor. Default: derivado de {@link shouldShowReceptorOnFiscalBoletaTicket}. */
  showReceptorOnTicket?: boolean;
  lines: FiscalBoletaPreviewLine[];
  totals: FiscalBoletaPreviewTotals;
  observation?: string | null;
  timbrePdf417Payload: string;
  operatorName?: string | null;
};

export type FiscalBoletaPreviewPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
  format?: string;
};
