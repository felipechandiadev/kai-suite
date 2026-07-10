import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { lineGrossAfterLineDiscount } from "./types";

function bucketGross(lines: PosCartLine[]): number {
  return lines.reduce((acc, line) => acc + lineGrossAfterLineDiscount(line), 0);
}

/**
 * Reparte descuento de orden entre buckets proporcional al bruto neto de línea.
 */
export function allocateOrderDiscount(
  dteLines: PosCartLine[],
  nonDteLines: PosCartLine[],
  orderDiscount: number,
): { dteOrderDiscount: number; nonDteOrderDiscount: number } {
  const totalOrderDiscount = Math.max(0, Math.round(orderDiscount));
  if (totalOrderDiscount === 0) {
    return { dteOrderDiscount: 0, nonDteOrderDiscount: 0 };
  }

  const dteGross = bucketGross(dteLines);
  const nonDteGross = bucketGross(nonDteLines);
  const totalGross = dteGross + nonDteGross;
  if (totalGross <= 0) {
    return { dteOrderDiscount: 0, nonDteOrderDiscount: 0 };
  }

  const dteOrderDiscount = Math.round((totalOrderDiscount * dteGross) / totalGross);
  const nonDteOrderDiscount = totalOrderDiscount - dteOrderDiscount;
  return { dteOrderDiscount, nonDteOrderDiscount };
}

export function bucketSaleTotalAfterDiscounts(
  lines: PosCartLine[],
  orderDiscountShare: number,
): number {
  const linesGross = bucketGross(lines);
  return Math.max(0, linesGross - Math.max(0, Math.round(orderDiscountShare)));
}
