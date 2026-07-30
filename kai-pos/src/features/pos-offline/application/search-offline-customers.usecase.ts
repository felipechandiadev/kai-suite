import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { PosCustomerSearchRow } from "@/features/customers/types/pos-customer.types";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";

export async function searchOfflineCustomers(query: string, limit = 40): Promise<PosCustomerSearchRow[]> {
  const db = getPosOfflineDb();
  const q = normalizeCatalogSearchText(query.trim());
  if (!q) {
    const recent = await db.customers
      .orderBy("lastUsedAt")
      .reverse()
      .filter((c) => Boolean(c.lastUsedAt))
      .limit(limit)
      .toArray();
    return recent.map(toSearchRow);
  }

  const all = await db.customers.toArray();
  const matches = all
    .filter((c) => c.searchName.includes(q))
    .slice(0, limit);
  return matches.map(toSearchRow);
}

function toSearchRow(c: {
  customerId: string;
  displayName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
}): PosCustomerSearchRow {
  return {
    customerId: c.customerId,
    displayName: c.displayName,
    documentNumber: c.documentNumber,
    phone: c.phone,
    email: c.email,
  };
}
