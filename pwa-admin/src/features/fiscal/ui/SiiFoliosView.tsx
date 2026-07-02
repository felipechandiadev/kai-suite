import type { FiscalCafItem, FiscalEmissionRow } from "../types/fiscal.types";
import { SiiFoliosCafSection } from "./SiiFoliosCafSection";
import { FiscalEmissionsDataGrid } from "./FiscalEmissionsDataGrid";

type Props = {
  cafs: FiscalCafItem[];
  initialEmissions: FiscalEmissionRow[];
  initialTotal: number;
};

export function SiiFoliosView({ cafs, initialEmissions, initialTotal }: Props) {
  return (
    <div className="space-y-4">
      <details className="rounded-lg border border-border bg-background">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Archivos CAF ({cafs.length})
        </summary>
        <div className="border-t border-border px-4 pb-4">
          <SiiFoliosCafSection cafs={cafs} />
        </div>
      </details>

      <FiscalEmissionsDataGrid initialItems={initialEmissions} initialTotal={initialTotal} />

      <p className="px-1 text-sm text-muted-foreground">
        El Registro de Compras y Ventas del SII se completa con el reporte de consumo de folios
        (RCOF), próximamente automatizado en Kai.
      </p>
    </div>
  );
}
