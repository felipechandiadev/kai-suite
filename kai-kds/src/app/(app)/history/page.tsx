"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { KdsHistoryPanel } from "@/features/dining-kds/ui/KdsHistoryPanel";
import { useKdsStation } from "@/features/dining-kds/station/kds-station-context";

export default function HistoryPage() {
  const router = useRouter();
  const { session, productionUnitId, unitsLoading } = useKdsStation();

  if (unitsLoading && !productionUnitId) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-test-id="kds-history-loading-unit"
      >
        Cargando estación…
      </p>
    );
  }

  if (!productionUnitId) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        data-test-id="kds-history-no-unit"
      >
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta estación aún no tiene unidad de producción. Configúrala para ver
          el historial del día.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/settings")}
          data-test-id="kds-history-go-settings"
        >
          Configurar unidad
        </Button>
      </div>
    );
  }

  return (
    <KdsHistoryPanel session={session} productionUnitId={productionUnitId} />
  );
}
