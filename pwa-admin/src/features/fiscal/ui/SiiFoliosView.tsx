"use client";

import type { FiscalCafPackage, FiscalEmissionRow } from "../types/fiscal.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import { SiiFoliosCafSection } from "./SiiFoliosCafSection";
import { FiscalEmissionsDataGrid } from "./FiscalEmissionsDataGrid";
import { FolioPackageCard } from "./FolioPackageCard";

type Props = {
  dteType: number;
  documentLabel: string;
  showPosAllocations?: boolean;
  showEmissions?: boolean;
  packages: FiscalCafPackage[];
  pointsOfSale: PointOfSaleListItem[];
  highlightPackageId?: string | null;
  initialEmissions: FiscalEmissionRow[];
  initialTotal: number;
};

export function SiiFoliosView({
  dteType,
  documentLabel,
  showPosAllocations = true,
  showEmissions = true,
  packages = [],
  pointsOfSale = [],
  highlightPackageId,
  initialEmissions,
  initialTotal,
}: Props) {
  const safePackages = packages ?? [];
  const productionPackages = safePackages.filter((p) => p.environment === "production");

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="mb-3 text-sm font-medium">Subir CAF — {documentLabel}</h2>
        <SiiFoliosCafSection expectedDteType={dteType} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-medium">Paquetes de folios</h2>
          <p className="text-xs text-muted-foreground">
            {productionPackages.length} paquete{productionPackages.length === 1 ? "" : "s"} en
            producción (tipo {dteType})
          </p>
        </div>

        {productionPackages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Suba un CAF de producción tipo {dteType} para crear el primer paquete.
            {showPosAllocations
              ? " Luego asigne rangos a cada punto de venta como sub-paquetes."
              : ""}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {productionPackages.map((pkg) => (
              <FolioPackageCard
                key={pkg.id}
                pkg={pkg}
                pointsOfSale={pointsOfSale}
                highlight={highlightPackageId === pkg.id}
                allowPosAssignment={showPosAllocations}
              />
            ))}
          </div>
        )}

        {safePackages.some((p) => p.environment !== "production") ? (
          <details className="rounded-lg border border-border bg-background">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
              Paquetes de certificación (
              {safePackages.filter((p) => p.environment !== "production").length})
            </summary>
            <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
              {safePackages
                .filter((p) => p.environment !== "production")
                .map((pkg) => (
                  <FolioPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    pointsOfSale={pointsOfSale}
                    allowPosAssignment={showPosAllocations}
                  />
                ))}
            </div>
          </details>
        ) : null}
      </section>

      {showEmissions ? (
        <details className="rounded-lg border border-border bg-background">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            Emisiones globales ({initialTotal})
          </summary>
          <div className="border-t border-border px-2 pb-4 pt-2">
            <FiscalEmissionsDataGrid initialItems={initialEmissions} initialTotal={initialTotal} />
          </div>
        </details>
      ) : null}

      {showPosAllocations ? (
        <p className="px-1 text-sm text-muted-foreground">
          Asigne folios a cada POS desde las cards de paquete. El POS solo muestra sus sub-paquetes
          en modo lectura. El RCOF diario al SII queda fuera de alcance en esta versión.
        </p>
      ) : null}
    </div>
  );
}
