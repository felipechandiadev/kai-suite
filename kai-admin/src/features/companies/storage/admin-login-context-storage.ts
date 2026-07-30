/** Preferencia de contexto en login admin (localStorage). Doc §6. */
export type AdminLoginContextPreference =
  | { kind: "company"; companyId: string }
  | { kind: "multi" };

const STORAGE_KEY = "kai-admin-login-context";

export function readAdminLoginContext(): AdminLoginContextPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.kind === "multi") return { kind: "multi" };
    if (
      parsed.kind === "company" &&
      typeof parsed.companyId === "string" &&
      parsed.companyId.trim()
    ) {
      return { kind: "company", companyId: parsed.companyId.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAdminLoginContext(
  value: AdminLoginContextPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function clearAdminLoginContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
