import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { allocateOrderDiscount } from "./allocate-order-discount";
import { classifySaleLines } from "./classify-sale-lines";
import { lineGrossAfterLineDiscount } from "./types";

export type DteBoletaCartLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt: boolean;
  unitMeasure: string;
};

export type DteBoletaPreviewLine = DteBoletaCartLine & {
  lineNet: number;
  lineExe: number;
  lineIva: number;
  lineTotal: number;
};

export type DteBoletaTotals = {
  mntNeto: number;
  mntExe: number;
  iva: number;
  mntTotal: number;
};

function splitLineAmounts(
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

function bucketGross(lines: PosCartLine[]): number {
  return lines.reduce((acc, line) => acc + lineGrossAfterLineDiscount(line), 0);
}

function resolveLineExempt(line: PosCartLine): boolean {
  const taxRate = Number(line.unitTaxRate) || 0;
  const unitGross = Number(line.unitPriceWithTax) || 0;
  const taxAmount = Math.round(Math.max(0, unitGross - (Number(line.unitPrice) || 0)));
  return taxRate === 0 && taxAmount === 0;
}

/**
 * Construye líneas y totales de boleta solo-DTE desde carrito POS,
 * aplicando descuentos de línea y prorrateo de descuento de orden (mixto).
 */
export function buildDteBoletaLinesFromCart(input: {
  cartLines: PosCartLine[];
  orderDiscount: number;
  mapLineName: (line: PosCartLine) => string;
}): {
  docLines: DteBoletaCartLine[];
  previewLines: DteBoletaPreviewLine[];
  totals: DteBoletaTotals;
  dteOrderDiscount: number;
} {
  const { dteLines, nonDteLines } = classifySaleLines(input.cartLines);
  const { dteOrderDiscount } = allocateOrderDiscount(
    dteLines,
    nonDteLines,
    input.orderDiscount,
  );

  const dteGrossBucket = bucketGross(dteLines);
  let remainingOrderDisc = dteOrderDiscount;

  const docLines: DteBoletaCartLine[] = [];
  const previewLines: DteBoletaPreviewLine[] = [];

  dteLines.forEach((line, idx) => {
    const qty = Math.max(0, Number(line.quantity) || 0);
    if (qty <= 0) return;

    const lineGross = lineGrossAfterLineDiscount(line);
    let lineOrderDisc = 0;
    if (dteOrderDiscount > 0 && dteGrossBucket > 0) {
      if (idx === dteLines.length - 1) {
        lineOrderDisc = remainingOrderDisc;
      } else {
        lineOrderDisc = Math.round((dteOrderDiscount * lineGross) / dteGrossBucket);
        remainingOrderDisc -= lineOrderDisc;
      }
    }

    const effectiveGross = Math.max(0, lineGross - lineOrderDisc);
    const unitPriceWithIva = Math.max(0, Math.round(effectiveGross / qty));
    const exempt = resolveLineExempt(line);
    const mapped: DteBoletaCartLine = {
      name: input.mapLineName(line).slice(0, 80),
      quantity: qty,
      unitPriceWithIva,
      exempt,
      unitMeasure: "UN",
    };
    const amounts = splitLineAmounts(mapped.quantity, mapped.unitPriceWithIva, mapped.exempt);
    docLines.push(mapped);
    previewLines.push({ ...mapped, ...amounts });
  });

  let mntNeto = 0;
  let mntExe = 0;
  let iva = 0;
  let mntTotal = 0;
  for (const row of previewLines) {
    mntNeto += row.lineNet;
    mntExe += row.lineExe;
    iva += row.lineIva;
    mntTotal += row.lineTotal;
  }

  return {
    docLines,
    previewLines,
    totals: { mntNeto, mntExe, iva, mntTotal },
    dteOrderDiscount,
  };
}
