"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import PosAmbientBackground from "@/shared/components/PosAmbientBackground/PosAmbientBackground";
import PosCartProvider from "@/features/pos-cart/PosCartProvider";
import { CustomerDisplayPublisher } from "@/features/customer-display/ui/CustomerDisplayPublisher";
import { FiscalBoletaBrowserPrintHost } from "@/features/fiscal/print/FiscalBoletaBrowserPrintHost";
import { PosOfflineBanner } from "@/features/pos-offline/ui/PosOfflineBanner";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";
import { usePosTabletDensity } from "@/shared/hooks/usePosTabletDensity";

type Props = {
  children: React.ReactNode;
  topBar: React.ReactNode;
};

/** Resultado del arqueo: pantalla aislada sin TopBar (tras cerrar la caja). */
function isCashClosingResultPath(pathname: string | null): boolean {
  return pathname === "/cash/closing/result";
}

export default function PosLayoutChrome({ children, topBar }: Props) {
  const pathname = usePathname();
  const resultOnly = isCashClosingResultPath(pathname);
  const compact = usePosCompactLayout();
  usePosTabletDensity();
  const { lastSyncedDocument, clearLastSyncedDocument, authExpiredMessage } = usePosOffline();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (resultOnly) {
    return (
      <div className="relative flex h-screen overflow-hidden flex-col">
        <PosAmbientBackground />
        <FiscalBoletaBrowserPrintHost />
        <main className="relative z-10 flex flex-1 flex-col overflow-auto">
          <PosCartProvider>
            <CustomerDisplayPublisher />
            {children}
          </PosCartProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden flex-col">
      <PosAmbientBackground />
      <FiscalBoletaBrowserPrintHost />
      {topBar}
      <PosOfflineBanner />
      {hydrated && lastSyncedDocument ? (
        <div className="relative z-10 shrink-0 border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-950 dark:text-emerald-100 flex items-center justify-center gap-3">
          <span>Venta sincronizada: {lastSyncedDocument}</span>
          <button
            type="button"
            className="underline text-xs"
            onClick={() => clearLastSyncedDocument()}
          >
            Cerrar
          </button>
        </div>
      ) : null}
      {hydrated && authExpiredMessage ? (
        <div className="relative z-10 shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {authExpiredMessage}
        </div>
      ) : null}
      <main
        className={`relative z-10 mt-(--app-topbar-height) flex min-h-0 flex-1 flex-col overflow-auto pt-4 ${
          compact
            ? "pl-[calc(var(--app-sidebar-width)+1rem)] pr-4 py-4"
            : "px-6 pb-6 md:px-10"
        }`}
      >
        <PosCartProvider>
          <CustomerDisplayPublisher />
          {children}
        </PosCartProvider>
      </main>
    </div>
  );
}
