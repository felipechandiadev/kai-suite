import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { CompanyCacheRow } from "../domain/offline-cache.types";

export async function writeCompanyCache(input: {
  tradeName: string | null;
  legalName?: string | null;
}): Promise<void> {
  const db = getPosOfflineDb();
  const row: CompanyCacheRow = {
    id: "company",
    tradeName: input.tradeName,
    legalName: input.legalName ?? null,
    cachedAt: new Date().toISOString(),
  };
  await db.company_cache.put(row);
}

export async function readCompanyCache(): Promise<CompanyCacheRow | null> {
  const db = getPosOfflineDb();
  return (await db.company_cache.get("company")) ?? null;
}
