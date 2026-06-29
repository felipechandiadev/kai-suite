import {
  SET_BE_CASES,
  splitLineAmounts,
  sumCaseTotals,
  type SetBeCase,
} from './set-be.constants';

export const CERTIFICATION_RECEPTOR = {
  rut: '66666666-6',
  name: 'Cliente Certificacion',
} as const;

export type FiscalBoletaPrintPreviewEmisor = {
  rut: string | null;
  legalName: string | null;
  businessActivity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  resolutionNumber: string | null;
  resolutionDate: string | null;
};

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

export type FiscalBoletaPrintPreviewCafAdvisory = {
  hasActiveCaf: boolean;
  nextFolio: number | null;
  sufficientForSet: boolean;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSimulatedTedPdf417Payload(input: {
  emisorRut: string | null;
  tipoDte: number;
  folio: number;
  issuedAt: string;
  receptorRut: string;
  receptorName: string;
  mntTotal: number;
  firstItemName: string;
  caso: string;
}): string {
  const rutEmisor = (input.emisorRut ?? '00000000-0').replace(/\./g, '').trim();
  const it1 = escapeXml(input.firstItemName.slice(0, 40));
  const rsr = escapeXml(input.receptorName.slice(0, 40));
  const ts = `${input.issuedAt}T12:00:00`;
  return `<TED version="1.0"><DD><RE>${rutEmisor}</RE><TD>${input.tipoDte}</TD><F>${input.folio}</F><FE>${input.issuedAt}</FE><RR>${input.receptorRut}</RR><RSR>${rsr}</RSR><MNT>${input.mntTotal}</MNT><IT1>${it1}</IT1><TSTED>${ts}</TSTED></DD><FRMT algoritmo="SHA1withRSA">SIMULACION-${escapeXml(input.caso)}</FRMT></TED>`;
}

export type FiscalBoletaPrintPreview = {
  caso: string;
  folio: number;
  issuedAt: string;
  tipoDte: 39;
  isSimulated: true;
  timbrePdf417Payload: string;
  emisor: FiscalBoletaPrintPreviewEmisor;
  emisorComplete: boolean;
  receptor: { rut: string; name: string };
  lines: FiscalBoletaPrintPreviewLine[];
  totals: FiscalBoletaPrintPreviewTotals;
  observation: string | null;
  cafAdvisory: FiscalBoletaPrintPreviewCafAdvisory;
};

export function isEmisorComplete(emisor: FiscalBoletaPrintPreviewEmisor): boolean {
  return !!(
    emisor.rut &&
    emisor.legalName &&
    emisor.businessActivity &&
    emisor.address &&
    emisor.commune &&
    emisor.city &&
    emisor.resolutionNumber &&
    emisor.resolutionDate
  );
}

export function resolveSetBeCase(casoId?: string): SetBeCase {
  const id = (casoId?.trim() || 'CASO-1').toUpperCase();
  const found = SET_BE_CASES.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Caso inválido: ${casoId}`);
  }
  return found;
}

export function folioForCaseIndex(startFolio: number, caseIndex: number): number {
  return startFolio + caseIndex;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildBoletaPrintPreview(params: {
  casoId?: string;
  startFolio: number;
  emisor: FiscalBoletaPrintPreviewEmisor;
  cafAdvisory: FiscalBoletaPrintPreviewCafAdvisory;
  issuedAt?: string;
}): FiscalBoletaPrintPreview {
  const caso = resolveSetBeCase(params.casoId);
  const caseIndex = SET_BE_CASES.findIndex((c) => c.id === caso.id);
  const folio = folioForCaseIndex(params.startFolio, caseIndex);
  const totals = sumCaseTotals(caso.lines);
  const lines: FiscalBoletaPrintPreviewLine[] = caso.lines.map((line) => {
    const amounts = splitLineAmounts(line.quantity, line.unitPriceWithIva, !!line.exempt);
    return {
      name: line.name,
      quantity: line.quantity,
      unitPriceWithIva: line.unitPriceWithIva,
      exempt: !!line.exempt,
      unitMeasure: line.unitMeasure ?? null,
      lineNet: amounts.lineNet,
      lineExe: amounts.lineExe,
      lineIva: amounts.lineIva,
      lineTotal: amounts.lineTotal,
    };
  });

  return {
    caso: caso.id,
    folio,
    issuedAt: params.issuedAt ?? todayIso(),
    tipoDte: 39,
    isSimulated: true,
    timbrePdf417Payload: buildSimulatedTedPdf417Payload({
      emisorRut: params.emisor.rut,
      tipoDte: 39,
      folio,
      issuedAt: params.issuedAt ?? todayIso(),
      receptorRut: CERTIFICATION_RECEPTOR.rut,
      receptorName: CERTIFICATION_RECEPTOR.name,
      mntTotal: totals.mntTotal,
      firstItemName: caso.lines[0]?.name ?? 'Item',
      caso: caso.id,
    }),
    emisor: params.emisor,
    emisorComplete: isEmisorComplete(params.emisor),
    receptor: { ...CERTIFICATION_RECEPTOR },
    lines,
    totals,
    observation: caso.observation ?? null,
    cafAdvisory: params.cafAdvisory,
  };
}
