"use client";

import { usePathname } from "next/navigation";
import PosCartProvider from "@/features/pos-cart/PosCartProvider";
import { CustomerDisplayPublisher } from "@/features/customer-display/ui/CustomerDisplayPublisher";
import { FiscalBoletaBrowserPrintHost } from "@/features/fiscal/print/FiscalBoletaBrowserPrintHost";
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

  if (resultOnly) {
    return (
      <div className="flex h-screen overflow-hidden flex-col bg-background">
        <FiscalBoletaBrowserPrintHost />
        <main className="flex flex-1 flex-col overflow-auto">
          <PosCartProvider>
            <CustomerDisplayPublisher />
            {children}
          </PosCartProvider>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-background">
      <FiscalBoletaBrowserPrintHost />
      {topBar}
      <main
        className={`mt-(--app-topbar-height) flex min-h-0 flex-1 flex-col overflow-auto bg-background pt-4 ${
          compact
            ? "px-4 pb-[calc(var(--app-bottom-nav-height)+1rem+env(safe-area-inset-bottom,0px))]"
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
