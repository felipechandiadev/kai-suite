export type FiscalBoletaPrintPreviewLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt: boolean;
  unitMeasure: string | null;
  lineNet: number;
  lineExe: number;
  lineIva: number;
  lineTotal: number;
};

export type FiscalBoletaPrintPreviewTotals = {
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
};

export type FiscalBoletaPrintPreview = {
  caso: string;
  folio: number;
  issuedAt: string;
  tipoDte: 39;
  isSimulated: boolean;
  timbrePdf417Payload: string;
  emisor: {
    rut: string | null;
    legalName: string | null;
    businessActivity: string | null;
    address: string | null;
    commune: string | null;
    city: string | null;
    resolutionNumber: string | null;
    resolutionDate: string | null;
  };
  emisorComplete: boolean;
  receptor: { rut: string; name: string };
  lines: FiscalBoletaPrintPreviewLine[];
  totals: FiscalBoletaPrintPreviewTotals;
  observation: string | null;
  operatorName?: string | null;
};

export type FiscalEmissionResponse = {
  status: "PENDING" | "SENT" | "EPR" | "FAILED" | "SKIPPED";
  emissionId?: string;
  folio?: number;
  trackId?: string | null;
  error?: string;
  printPreview?: FiscalBoletaPrintPreview;
  siiPending?: boolean;
};
