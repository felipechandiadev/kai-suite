import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

export type LicenseStatus =
  | { kind: "licensed"; companyName: string; expiresAt: string | null }
  | { kind: "trial"; daysLeft: number; endsAt: string }
  | { kind: "expired" }
  | { kind: "none" };

type LicenseContextValue = {
  status: LicenseStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Activa esta máquina con un código corto válido. */
  activate: (code: string) => Promise<void>;
  badge: { kind: "trial" | "licensed" | "none"; label: string } | null;
  isAllowed: boolean;
};

const LicenseContext = createContext<LicenseContextValue | null>(null);

function mapBadge(status: LicenseStatus): LicenseContextValue["badge"] {
  // Licenciada: sin badge en la barra (solo trial / sin licencia).
  if (status.kind === "licensed") return null;
  if (status.kind === "trial") {
    return { kind: "trial", label: `Trial · ${status.daysLeft}d` };
  }
  return { kind: "none", label: "Sin licencia" };
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus>({ kind: "none" });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await invoke<LicenseStatus>("license_status");
      setStatus(next);
    } catch {
      // Browser / vite-only: allow local UI with synthetic trial
      const ends = new Date();
      ends.setDate(ends.getDate() + 10);
      setStatus({
        kind: "trial",
        daysLeft: 10,
        endsAt: ends.toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const activate = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        throw new Error("Ingresá un código de activación");
      }
      try {
        await invoke("license_activate_code", { code: trimmed });
        await refresh();
      } catch (e) {
        // Vite-only (sin Tauri): no hay hashes; no fingir éxito.
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "No se pudo activar";
        throw new Error(msg);
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isAllowed = status.kind === "licensed" || status.kind === "trial";

  const value = useMemo(
    () => ({
      status,
      loading,
      refresh,
      activate,
      badge: mapBadge(status),
      isAllowed,
    }),
    [status, loading, refresh, activate, isAllowed],
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense outside LicenseProvider");
  return ctx;
}
