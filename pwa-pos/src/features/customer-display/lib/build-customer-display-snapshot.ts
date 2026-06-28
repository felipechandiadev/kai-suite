import type { CustomerDisplaySnapshot } from "@kai/customer-display-client";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";

export type BuildCustomerDisplaySnapshotInput = {
  lines: PosCartLine[];
  orderDiscount: number;
  ctx: Pick<PosContextV1, "pointOfSaleId" | "pointOfSaleName" | "branchName"> | null;
  /** Force display state (e.g. thank_you). Default derived from lines. */
  stateOverride?: CustomerDisplaySnapshot["state"];
};

function formatLineName(line: PosCartLine): string {
  const name = String(line.productName ?? "").trim();
  const attrs = (line.attributes ?? [])
    .map((a) => String(a.attributeValue ?? "").trim())
    .filter(Boolean);
  if (!attrs.length) return name || "Producto";
  return [name, ...attrs].filter(Boolean).join(" / ");
}

function lineGross(line: PosCartLine): number {
  const q = Number(line.quantity) || 0;
  return (Number(line.unitPriceWithTax) || 0) * q;
}

function lineNetTotal(line: PosCartLine): number {
  const gross = lineGross(line);
  const discount = line.discount?.discountAmount ?? 0;
  return Math.max(0, gross - discount);
}

function lineUnitPriceForDisplay(line: PosCartLine): number {
  const q = Number(line.quantity) || 0;
  if (q <= 0) return Number(line.unitPriceWithTax) || 0;
  return lineNetTotal(line) / q;
}

export function buildCustomerDisplaySnapshot(
  input: BuildCustomerDisplaySnapshotInput,
): CustomerDisplaySnapshot | null {
  const pointOfSaleId = input.ctx?.pointOfSaleId?.trim();
  if (!pointOfSaleId) return null;

  const storeName =
    input.ctx?.pointOfSaleName?.trim() ||
    input.ctx?.branchName?.trim() ||
    undefined;

  const displayLines = input.lines.map((line) => {
    const quantity = Number(line.quantity) || 0;
    const lineTotal = lineNetTotal(line);
    return {
      lineId: String(line.variantId),
      name: formatLineName(line),
      quantity,
      unitPrice: lineUnitPriceForDisplay(line),
      lineTotal,
    };
  });

  const gross = input.lines.reduce((acc, l) => acc + lineGross(l), 0);
  const lineDiscountsTotal = input.lines.reduce(
    (acc, l) => acc + (l.discount?.discountAmount ?? 0),
    0,
  );
  const total = Math.max(0, gross - lineDiscountsTotal - (input.orderDiscount ?? 0));
  const itemCount = input.lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);

  const state =
    input.stateOverride ??
    (input.lines.length > 0 ? "active_sale" : "idle");

  return {
    state,
    pointOfSaleId,
    storeName,
    currency: "CLP",
    lines: displayLines,
    total,
    itemCount,
    updatedAt: new Date().toISOString(),
  };
}

export function computeCustomerDisplaySaleTotal(
  lines: PosCartLine[],
  orderDiscount: number,
): number {
  const gross = lines.reduce((acc, l) => acc + lineGross(l), 0);
  const lineDiscountsTotal = lines.reduce(
    (acc, l) => acc + (l.discount?.discountAmount ?? 0),
    0,
  );
  return Math.max(0, gross - lineDiscountsTotal - (orderDiscount ?? 0));
}
