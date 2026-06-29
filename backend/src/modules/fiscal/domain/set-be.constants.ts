export type SetBeLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt?: boolean;
  unitMeasure?: string;
};

export type SetBeCase = {
  id: string;
  reference: string;
  observation?: string;
  lines: SetBeLine[];
};

/** Montos del Set Prueba BE oficial (precio unitario con IVA). */
export const SET_BE_CASES: SetBeCase[] = [
  {
    id: 'CASO-1',
    reference: 'CASO-1',
    lines: [
      { name: 'Cambio de aceite', quantity: 1, unitPriceWithIva: 19900 },
      { name: 'Alineacion y balanceo', quantity: 1, unitPriceWithIva: 9900 },
    ],
  },
  {
    id: 'CASO-2',
    reference: 'CASO-2',
    lines: [{ name: 'Papel de regalo', quantity: 17, unitPriceWithIva: 120 }],
  },
  {
    id: 'CASO-3',
    reference: 'CASO-3',
    lines: [
      { name: 'Sandwic', quantity: 2, unitPriceWithIva: 1500 },
      { name: 'Bebida', quantity: 2, unitPriceWithIva: 550 },
    ],
  },
  {
    id: 'CASO-4',
    reference: 'CASO-4',
    observation:
      'El item 1 es un servicio afecto. El item 2 es un servicio exento.',
    lines: [
      { name: 'item afecto 1', quantity: 8, unitPriceWithIva: 1590 },
      { name: 'item exento 2', quantity: 2, unitPriceWithIva: 1000, exempt: true },
    ],
  },
  {
    id: 'CASO-5',
    reference: 'CASO-5',
    observation: 'Se debe informar en el XML Unidad de medida en Kg.',
    lines: [{ name: 'Arroz', quantity: 5, unitPriceWithIva: 700, unitMeasure: 'Kg' }],
  },
];

export type BoletaTotals = {
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
};

export function splitLineAmounts(
  quantity: number,
  unitPriceWithIva: number,
  exempt: boolean,
): { lineNet: number; lineExe: number; lineIva: number; lineTotal: number } {
  const lineTotal = quantity * unitPriceWithIva;
  if (exempt) {
    return { lineNet: 0, lineExe: lineTotal, lineIva: 0, lineTotal };
  }
  const lineNet = Math.round(lineTotal / 1.19);
  const lineIva = lineTotal - lineNet;
  return { lineNet, lineExe: 0, lineIva, lineTotal };
}

export function sumCaseTotals(lines: SetBeLine[]): BoletaTotals {
  let mntNeto = 0;
  let mntExe = 0;
  let iva = 0;
  let mntTotal = 0;
  for (const line of lines) {
    const s = splitLineAmounts(line.quantity, line.unitPriceWithIva, !!line.exempt);
    mntNeto += s.lineNet;
    mntExe += s.lineExe;
    iva += s.lineIva;
    mntTotal += s.lineTotal;
  }
  return { mntNeto, mntExe, iva, mntTotal };
}

export type BoletaPreviewRow = {
  caso: string;
  folio: number;
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
  codRef: string;
  razonRef: string;
};

export function buildSetBePreview(startFolio: number): BoletaPreviewRow[] {
  const rows: BoletaPreviewRow[] = [];
  let folio = startFolio;
  for (const caso of SET_BE_CASES) {
    const totals = sumCaseTotals(caso.lines);
    rows.push({
      caso: caso.id,
      folio,
      ...totals,
      codRef: 'SET',
      razonRef: caso.reference,
    });
    folio += 1;
  }
  return rows;
}
