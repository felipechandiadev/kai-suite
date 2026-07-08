import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";
import { buildCreateSaleLines } from "@/features/session/lib/build-create-sale-payload";

export type OfflineSaleLinePayload = ReturnType<typeof buildCreateSaleLines>[number] & {
  productName: string;
  sku?: string | null;
  unitPriceWithTax: number;
  barcode?: string | null;
};

export function buildOfflineSaleLines(cartLines: PosCartLine[]): OfflineSaleLinePayload[] {
  const baseLines = buildCreateSaleLines(cartLines);
  return cartLines.map((line, index) => {
    const base = baseLines[index];
    const productName =
      formatReceiptLineDisplayName(line.productName ?? "", line.attributes) ||
      line.productName?.trim() ||
      "Item";
    return {
      ...base,
      productName: productName.slice(0, 120),
      sku: line.sku ?? null,
      barcode: line.barcode ?? null,
      unitPriceWithTax: Number(line.unitPriceWithTax) || 0,
    };
  });
}
