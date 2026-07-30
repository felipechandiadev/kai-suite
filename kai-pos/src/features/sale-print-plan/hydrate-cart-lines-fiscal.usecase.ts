import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { lookupOfflineCatalogByVariantIds } from "@/features/pos-offline/application/search-offline-catalog.usecase";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";

function patchLineFromCatalog(
  line: PosCartLine,
  catalog: Pick<PosProductSearchItem, "requiresDte" | "taxCategory" | "taxIds">,
): PosCartLine {
  return {
    ...line,
    requiresDte: catalog.requiresDte,
    taxCategory: catalog.taxCategory,
    taxIds: catalog.taxIds,
  };
}

/**
 * Re-sincroniza flags fiscales del carrito desde catálogo online u offline.
 * Evita que líneas persistidas sin `requiresDte` se traten como tributarias.
 */
export async function hydrateCartLinesFiscalFlags(
  lines: PosCartLine[],
  pointOfSaleId: string,
  priceListId: string,
): Promise<PosCartLine[]> {
  if (lines.length === 0) return lines;
  const posId = pointOfSaleId.trim();
  const listId = priceListId.trim();
  if (!posId || !listId) return lines;

  const variantIds = [...new Set(lines.map((l) => l.variantId?.trim()).filter(Boolean))];
  if (variantIds.length === 0) return lines;

  let catalogByVariantId = new Map<
    string,
    Pick<PosProductSearchItem, "requiresDte" | "taxCategory" | "taxIds">
  >();

  if (shouldUseBackendApi()) {
    const res = await lookupPosVariantsAction({
      pointOfSaleId: posId,
      priceListId: listId,
      variantIds,
    });
    if (res.success) {
      catalogByVariantId = new Map(
        res.products.map((p) => [
          p.variantId,
          { requiresDte: p.requiresDte, taxCategory: p.taxCategory, taxIds: p.taxIds },
        ]),
      );
    }
  } else {
    const products = await lookupOfflineCatalogByVariantIds({
      pointOfSaleId: posId,
      priceListId: listId,
      variantIds,
    });
    catalogByVariantId = new Map(
      products.map((p) => [
        p.variantId,
        { requiresDte: p.requiresDte, taxCategory: p.taxCategory, taxIds: p.taxIds },
      ]),
    );
  }

  if (catalogByVariantId.size === 0) return lines;

  return lines.map((line) => {
    const catalog = catalogByVariantId.get(line.variantId);
    if (!catalog) return line;
    return patchLineFromCatalog(line, catalog);
  });
}
