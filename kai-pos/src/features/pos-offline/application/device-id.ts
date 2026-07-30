import { getPosOfflineDb } from "../infrastructure/pos-offline-db";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const db = getPosOfflineDb();
  const existing = await db.device.get("device");
  if (existing?.deviceId) return existing.deviceId;
  const deviceId = randomUuid();
  await db.device.put({ id: "device", deviceId });
  return deviceId;
}

export async function nextLocalDocumentNumber(): Promise<string> {
  const db = getPosOfflineDb();
  const deviceId = await getOrCreateDeviceId();
  const short = deviceId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const meta = (await db.meta.get("meta")) ?? { id: "meta" as const, localFolioSeq: 0 };
  const seq = meta.localFolioSeq + 1;
  await db.meta.put({ id: "meta", localFolioSeq: seq });
  return `OFF${short}${String(seq).padStart(5, "0")}`;
}
