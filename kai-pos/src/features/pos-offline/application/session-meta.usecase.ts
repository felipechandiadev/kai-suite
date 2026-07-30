import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { SessionMetaRow } from "../domain/offline-cache.types";

export async function writeSessionMeta(input: {
  pointOfSaleName?: string | null;
  userRole?: string | null;
  personName?: string | null;
}): Promise<void> {
  const db = getPosOfflineDb();
  const existing = await db.session_meta.get("session");
  const row: SessionMetaRow = {
    id: "session",
    pointOfSaleName: input.pointOfSaleName ?? existing?.pointOfSaleName ?? null,
    userRole: input.userRole ?? existing?.userRole ?? null,
    personName: input.personName ?? existing?.personName ?? null,
    cachedAt: new Date().toISOString(),
  };
  await db.session_meta.put(row);
}

export async function readSessionMeta(): Promise<SessionMetaRow | null> {
  const db = getPosOfflineDb();
  return (await db.session_meta.get("session")) ?? null;
}
