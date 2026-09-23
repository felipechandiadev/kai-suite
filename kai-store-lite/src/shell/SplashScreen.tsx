import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLicense } from "@/providers/LicenseProvider";

const MIN_MS = 1100;
const SIDECAR_TIMEOUT_MS = 8000;
const SIDECAR_POLL_MS = 400;

function removeBootSplash() {
  document.getElementById("boot-splash")?.remove();
  document.documentElement.classList.remove("boot-splash-active");
}

async function waitForSidecarReady(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < SIDECAR_TIMEOUT_MS) {
    try {
      const res = await invoke<{ ok: boolean }>("sidecar_health");
      if (res.ok) return;
    } catch {
      // Vite / sin Tauri: no bloquear
      return;
    }
    await new Promise((r) => setTimeout(r, SIDECAR_POLL_MS));
  }
}

/**
 * Mantiene el splash HTML (`#boot-splash`) hasta licencia + sidecar + tiempo mínimo.
 * No pinta un segundo splash React.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const { loading: licenseLoading } = useLicense();
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    void (async () => {
      await waitForSidecarReady();
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, MIN_MS - elapsed);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
      if (!cancelled) setBootDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bootDone && !licenseLoading) {
      removeBootSplash();
    }
  }, [bootDone, licenseLoading]);

  if (!bootDone || licenseLoading) {
    return null;
  }

  return <>{children}</>;
}
