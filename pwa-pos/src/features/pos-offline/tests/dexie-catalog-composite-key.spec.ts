import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { catalogRowId } from "../lib/catalog-keys";
import type { OfflineCatalogRow } from "../domain/offline-catalog.types";

describe("dexie catalog composite keys", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("no colisiona entre listas de precio distintas", async () => {
    const db = getPosOfflineDb();
    const base = {
      productId: "p1",
      productName: "Item A",
      productDescription: null,
      productImageUrl: null,
      sku: "SKU-A",
      barcode: null,
      unitSymbol: "UN",
      unitId: null,
      unitAllowDecimals: false,
      unitPrice: 1000,
      unitTaxRate: 19,
      unitTaxAmount: 190,
      unitPriceWithTax: 1190,
      trackInventory: true,
      availableStock: 5,
      availableStockBase: 5,
      attributes: [],
      metadata: null,
      taxCategory: "TAX_STANDARD",
      requiresDte: true,
      taxIds: [],
      snapshotAt: new Date().toISOString(),
      searchName: "item a",
    } satisfies Omit<OfflineCatalogRow, "id" | "variantId" | "pointOfSaleId" | "priceListId">;

    const rowPl1: OfflineCatalogRow = {
      ...base,
      id: catalogRowId("pos-1", "pl-1", "v1"),
      variantId: "v1",
      pointOfSaleId: "pos-1",
      priceListId: "pl-1",
      unitPriceWithTax: 1190,
    };
    const rowPl2: OfflineCatalogRow = {
      ...base,
      id: catalogRowId("pos-1", "pl-2", "v1"),
      variantId: "v1",
      pointOfSaleId: "pos-1",
      priceListId: "pl-2",
      unitPriceWithTax: 2490,
    };

    await db.catalog.bulkPut([rowPl1, rowPl2]);

    const hitPl1 = await db.catalog.get(catalogRowId("pos-1", "pl-1", "v1"));
    const hitPl2 = await db.catalog.get(catalogRowId("pos-1", "pl-2", "v1"));
    expect(hitPl1?.unitPriceWithTax).toBe(1190);
    expect(hitPl2?.unitPriceWithTax).toBe(2490);
  });
});
