import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DotProgress } from "@kai/ui";
import { POS_ROUTES } from "@/config/routes";
import { toUserMessage } from "@/lib/errors";
import { resumeOpenCashSession } from "./lib/resolve-open-session";
import { PosOpeningPage } from "./pages/PosOpeningPage";
import { PosSalePage } from "./pages/PosSalePage";
import { PosPaymentPage } from "./pages/PosPaymentPage";
import { PosClosingPage } from "./pages/PosClosingPage";
import { usePosCartStore } from "./store/pos-cart.store";

/**
 * Bootstrap único al montar el POS: reanuda caja OPEN del servidor si existe.
 * Mientras `sessionBootstrap === "pending"` no se muestra el form de apertura.
 */
function useCashSessionBootstrap() {
  const bootstrap = usePosCartStore((s) => s.sessionBootstrap);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const store = usePosCartStore.getState();
      if (store.sessionOpen && store.cashSessionId) {
        if (store.phase === "opening") store.setPhase("sale");
        store.setSessionBootstrap("ready");
        return;
      }
      // Ya resolviendo desde activatePosSection (click del carro).
      if (store.sessionBootstrap === "pending") {
        return;
      }
      // Login u otro caller ya resolvió.
      if (store.sessionBootstrap === "ready") {
        return;
      }

      try {
        await resumeOpenCashSession({ retries: 3 });
        if (!cancelled) setError(null);
      } catch (e) {
        if (cancelled) return;
        usePosCartStore.getState().setSessionBootstrap("ready");
        setError(toUserMessage(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { waiting: bootstrap === "pending", error };
}

function phaseToPath(phase: string): string {
  if (phase === "opening") return POS_ROUTES.opening;
  if (phase === "payment") return POS_ROUTES.payment;
  if (phase === "closing") return POS_ROUTES.closing;
  return POS_ROUTES.sale;
}

export function PosRoutes() {
  const phase = usePosCartStore((s) => s.phase);
  const location = useLocation();
  const { waiting, error } = useCashSessionBootstrap();
  const target = phaseToPath(phase);

  if (waiting) {
    return (
      <div
        className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center gap-4 px-4"
        data-test-id="pos-session-bootstrap"
      >
        <DotProgress size={14} gap={10} />
        <p className="text-sm text-muted-foreground">Comprobando sesión de caja…</p>
        {error ? <p className="max-w-sm text-center text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  // Phase drives navigation: setPhase alone does not change the URL.
  if (location.pathname !== target) {
    return <Navigate to={target} replace />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <Routes>
        <Route path={POS_ROUTES.opening} element={<PosOpeningPage bootstrapError={error} />} />
        <Route path={POS_ROUTES.sale} element={<PosSalePage />} />
        <Route path={POS_ROUTES.payment} element={<PosPaymentPage />} />
        <Route path={POS_ROUTES.closing} element={<PosClosingPage />} />
        <Route path={POS_ROUTES.login} element={<Navigate to={target} replace />} />
        <Route path="*" element={<Navigate to={target} replace />} />
      </Routes>
    </div>
  );
}
