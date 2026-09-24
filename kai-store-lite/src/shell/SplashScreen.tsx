import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLicense } from "@/providers/LicenseProvider";

const MIN_MS = 1100;
const HEALTH_TIMEOUT_MS = 8000;
const HEALTH_POLL_MS = 200;

function removeBootSplash() {
  document.getElementById("boot-splash")?.remove();
  document.documentElement.classList.remove("boot-splash-active");
}

/** Wait until in-process Lite sqlx backend answers (no Node sidecar). */
async function waitForLiteReady(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < HEALTH_TIMEOUT_MS) {
    try {
      const res = await invoke<{ ok: boolean }>("lite_health");
      if (res.ok) return;
    } catch {
      // Vite browser / sin Tauri: no bloquear
      return;
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
}

/**
 * Mantiene el splash HTML (`#boot-splash`) hasta licencia + lite backend + tiempo mínimo.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const { loading: licenseLoading } = useLicense();
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    void (async () => {
      await waitForLiteReady();
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
