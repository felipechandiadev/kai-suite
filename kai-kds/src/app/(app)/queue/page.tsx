"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { KdsQueuePanel } from "@/features/dining-kds/ui/KdsQueuePanel";
import { useKdsStation } from "@/features/dining-kds/station/kds-station-context";

export default function QueuePage() {
  const router = useRouter();
  const { session, productionUnitId, unitsLoading } = useKdsStation();

  if (unitsLoading && !productionUnitId) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="kds-queue-loading-unit">
        Cargando estación…
      </p>
    );
  }

  if (!productionUnitId) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        data-test-id="kds-queue-no-unit"
      >
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta estación aún no tiene unidad de producción. Configúrala para ver la cola de cocina.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/settings")}
          data-test-id="kds-queue-go-settings"
        >
          Configurar unidad
        </Button>
      </div>
    );
  }

  return (
    <div data-test-id="kds-queue-page">
      <KdsQueuePanel session={session} productionUnitId={productionUnitId} />
    </div>
  );
}
