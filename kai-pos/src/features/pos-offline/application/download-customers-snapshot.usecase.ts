import { posOfflineBackendFetch } from "../infrastructure/backend-api-client";
import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { OfflineCustomerRow } from "../domain/offline-cache.types";

type OfflineCustomerSnapshotResponse = {
  success: boolean;
  items?: OfflineCustomerRow[];
  nextCursor?: string | null;
  hasMore?: boolean;
  message?: string;
};

export async function downloadCustomersSnapshot(): Promise<
  { success: true; total: number } | { success: false; message: string }
> {
  const db = getPosOfflineDb();
  let cursor: string | undefined;
  const rows: OfflineCustomerRow[] = [];

  for (;;) {
    const qs = new URLSearchParams();
    if (cursor) qs.set("cursor", cursor);
    qs.set("limit", "500");
    const res = await posOfflineBackendFetch<OfflineCustomerSnapshotResponse>(
      `/api/customers/pos/offline-snapshot?${qs.toString()}`,
    );
    if (!res.ok) {
      return {
        success: false,
        message: res.unreachable
          ? "Sin conexión al servidor"
          : res.message || "No se pudo descargar clientes offline",
      };
    }
    const body = res.data;
    if (!body.success || !body.items) {
      return {
        success: false,
        message: body.message || "No se pudo descargar clientes offline",
      };
    }
    rows.push(...body.items);
    if (!body.hasMore || !body.nextCursor) break;
    cursor = body.nextCursor;
  }

  await db.transaction("rw", db.customers, async () => {
    await db.customers.clear();
    if (rows.length > 0) {
      await db.customers.bulkPut(rows);
    }
  });

  return { success: true, total: rows.length };
}

export async function touchOfflineCustomerUsed(customerId: string): Promise<void> {
  const db = getPosOfflineDb();
  const row = await db.customers.get(customerId);
  if (!row) return;
  await db.customers.update(customerId, { lastUsedAt: new Date().toISOString() });
}
