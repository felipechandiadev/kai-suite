export type KdsSession = {
  userId: string;
  companyId: string;
  userName: string;
  displayName: string;
  email: string | null;
};

const KEY = "kai-kds-session";

export function loadKdsSession(): KdsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as KdsSession) : null;
  } catch {
    return null;
  }
}

export function saveKdsSession(session: KdsSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearKdsSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export const KDS_UNIT_STORAGE_KEY = "kai-kds-production-unit";

export function loadKdsProductionUnitId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KDS_UNIT_STORAGE_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function saveKdsProductionUnitId(unitId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KDS_UNIT_STORAGE_KEY, unitId);
}
