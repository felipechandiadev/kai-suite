import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";

export async function searchOfflineCatalog(args: {
  pointOfSaleId: string;
  priceListId: string;
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<{ products: PosProductSearchItem[]; total: number }> {
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, args.pageSize ?? 20));
  const db = getPosOfflineDb();
  const q = args.query.trim();
  const all = await db.catalog
    .where({ pointOfSaleId: args.pointOfSaleId, priceListId: args.priceListId })
    .toArray();

  let filtered = all;
  if (q) {
    const nq = normalizeCatalogSearchText(q);
    const exactBarcode = all.filter((row) => row.barcode?.trim() === q);
    if (exactBarcode.length > 0) {
      filtered = exactBarcode;
    } else {
      filtered = all.filter((row) => {
        if (row.barcode?.trim() === q) return true;
        if (row.sku?.trim().toLowerCase() === q.toLowerCase()) return true;
        return row.searchName.includes(nq);
      });
    }
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const products: PosProductSearchItem[] = slice.map(
    ({ pointOfSaleId: _p, priceListId: _l, snapshotAt: _s, searchName: _n, ...item }) => item,
  );
  return { products, total };
}

export async function lookupOfflineCatalogByBarcode(args: {
  pointOfSaleId: string;
  priceListId: string;
  barcode: string;
}): Promise<PosProductSearchItem | null> {
  const code = args.barcode.trim();
  if (!code) return null;
  const db = getPosOfflineDb();
  const hit = await db.catalog
    .where({ pointOfSaleId: args.pointOfSaleId, priceListId: args.priceListId })
    .filter((row) => row.barcode?.trim() === code)
    .first();
  if (!hit) return null;
  const { pointOfSaleId: _p, priceListId: _l, snapshotAt: _s, searchName: _n, ...item } = hit;
  return item;
}
