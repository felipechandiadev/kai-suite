import type { PosSaleTicketCompany } from "./pos-sale-ticket";

/**
 * Boleta electrónica simulada (Set BE) → agente KaiPrinters (`type: "fiscal-boleta-preview"`).
 */

export const FISCAL_BOLETA_PREVIEW_PAYLOAD_VERSION = 1;

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

export type FiscalBoletaPreviewReceptor = {
  rut: string;
  name: string;
};

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
  lines: FiscalBoletaPreviewLine[];
  totals: FiscalBoletaPreviewTotals;
  observation?: string | null;
  timbrePdf417Payload: string;
};

export type FiscalBoletaPreviewPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
  format?: string;
};
