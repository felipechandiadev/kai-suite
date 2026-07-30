import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { searchOfflineCatalog, lookupOfflineCatalogByBarcode } from "../application/search-offline-catalog.usecase";
import type { OfflineCatalogRow } from "../domain/offline-catalog.types";
import { catalogRowId } from "../lib/catalog-keys";

function row(partial: Partial<OfflineCatalogRow> & Pick<OfflineCatalogRow, "variantId">): OfflineCatalogRow {
  const pointOfSaleId = partial.pointOfSaleId ?? "pos-1";
  const priceListId = partial.priceListId ?? "pl-1";
  const variantId = partial.variantId;
  return {
    id: catalogRowId(pointOfSaleId, priceListId, variantId),
    productId: "p1",
    productName: partial.productName ?? "Producto",
    productDescription: null,
    productImageUrl: null,
    sku: partial.sku ?? null,
    barcode: partial.barcode ?? null,
    unitSymbol: "UN",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 19,
    unitTaxAmount: 190,
    unitPriceWithTax: 1190,
    trackInventory: true,
    availableStock: partial.availableStock ?? 5,
    availableStockBase: partial.availableStock ?? 5,
    attributes: [],
    metadata: null,
    taxCategory: "TAX_STANDARD",
    requiresDte: true,
    taxIds: [],
    pointOfSaleId: "pos-1",
    priceListId: "pl-1",
    snapshotAt: new Date().toISOString(),
    searchName: partial.searchName ?? (partial.productName ?? "producto").toLowerCase(),
    ...partial,
  };
}

describe("search-offline-catalog", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("encuentra por barcode exacto", async () => {
    await getPosOfflineDb().catalog.bulkPut([
      row({ variantId: "v1", barcode: "780123", productName: "Agua" }),
      row({ variantId: "v2", barcode: "780999", productName: "Jugo" }),
    ]);

    const hit = await lookupOfflineCatalogByBarcode({
      pointOfSaleId: "pos-1",
      priceListId: "pl-1",
      barcode: "780123",
    });
    expect(hit?.variantId).toBe("v1");
  });

  it("busca por nombre normalizado", async () => {
    await getPosOfflineDb().catalog.bulkPut([
      row({ variantId: "v1", productName: "Café molido", searchName: "cafe molido" }),
    ]);

    const res = await searchOfflineCatalog({
      pointOfSaleId: "pos-1",
      priceListId: "pl-1",
      query: "cafe",
      page: 1,
      pageSize: 20,
    });
    expect(res.total).toBe(1);
    expect(res.products[0]?.productName).toBe("Café molido");
  });

  it("persiste requiresDte en búsqueda offline", async () => {
    await getPosOfflineDb().catalog.bulkPut([
      row({ variantId: "v-dte", productName: "Con DTE", requiresDte: true }),
      row({ variantId: "v-no", productName: "Sin DTE", requiresDte: false }),
    ]);

    const res = await searchOfflineCatalog({
      pointOfSaleId: "pos-1",
      priceListId: "pl-1",
      query: "",
      page: 1,
      pageSize: 20,
    });
    const byId = new Map(res.products.map((p) => [p.variantId, p]));
    expect(byId.get("v-dte")?.requiresDte).toBe(true);
    expect(byId.get("v-no")?.requiresDte).toBe(false);
  });
});
