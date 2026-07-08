import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { catalogRowId } from "../lib/catalog-keys";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";

function stripCatalogRow(row: OfflineCatalogRowLike): PosProductSearchItem {
  const {
    id: _id,
    pointOfSaleId: _p,
    priceListId: _l,
    snapshotAt: _s,
    searchName: _n,
    ...item
  } = row;
  return item;
}

type OfflineCatalogRowLike = PosProductSearchItem & {
  id?: string;
  pointOfSaleId: string;
  priceListId: string;
  snapshotAt?: string;
  searchName?: string;
};

async function scopedCatalogRows(pointOfSaleId: string, priceListId: string) {
  const db = getPosOfflineDb();
  return db.catalog
    .where("[pointOfSaleId+priceListId]")
    .equals([pointOfSaleId, priceListId])
    .toArray();
}

export async function searchOfflineCatalog(args: {
  pointOfSaleId: string;
  priceListId: string;
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<{ products: PosProductSearchItem[]; total: number }> {
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, args.pageSize ?? 20));
  const q = args.query.trim();
  const all = await scopedCatalogRows(args.pointOfSaleId, args.priceListId);

  if (!q) {
    const total = all.length;
    const start = (page - 1) * pageSize;
    return { products: all.slice(start, start + pageSize).map(stripCatalogRow), total };
  }

  const exactBarcode = all.filter((row) => row.barcode?.trim() === q);
  if (exactBarcode.length > 0) {
    const total = exactBarcode.length;
    const start = (page - 1) * pageSize;
    return {
      products: exactBarcode.slice(start, start + pageSize).map(stripCatalogRow),
      total,
    };
  }

  const nq = normalizeCatalogSearchText(q);
  const filtered = all.filter((row) => {
    if (row.barcode?.trim() === q) return true;
    if (row.sku?.trim().toLowerCase() === q.toLowerCase()) return true;
    if (row.searchName.startsWith(nq)) return true;
    return row.searchName.includes(nq);
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    products: filtered.slice(start, start + pageSize).map(stripCatalogRow),
    total,
  };
}

export async function lookupOfflineCatalogByVariantIds(args: {
  pointOfSaleId: string;
  priceListId: string;
  variantIds: string[];
}): Promise<PosProductSearchItem[]> {
  const ids = [...new Set(args.variantIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const db = getPosOfflineDb();
  const keys = ids.map((variantId) =>
    catalogRowId(args.pointOfSaleId, args.priceListId, variantId),
  );
  const rows = await db.catalog.bulkGet(keys);
  return rows
    .filter((row): row is OfflineCatalogRowLike => row != null)
    .map(stripCatalogRow);
}

export async function lookupOfflineCatalogByBarcode(args: {
  pointOfSaleId: string;
  priceListId: string;
  barcode: string;
}): Promise<PosProductSearchItem | null> {
  const code = args.barcode.trim();
  if (!code) return null;
  const all = await scopedCatalogRows(args.pointOfSaleId, args.priceListId);
  const hit = all.find((row) => row.barcode?.trim() === code);
  if (!hit) return null;
  return stripCatalogRow(hit);
}
