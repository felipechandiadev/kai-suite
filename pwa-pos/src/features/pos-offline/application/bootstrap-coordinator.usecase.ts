import { downloadFiscalPackForPos } from "./download-fiscal-pack.usecase";
import { downloadCatalogSnapshotForPos } from "./download-catalog-snapshot.usecase";
import { downloadCustomersSnapshot } from "./download-customers-snapshot.usecase";
import type { OfflineBootstrapStatus } from "../domain/offline-bootstrap.types";
import { logOfflineTelemetry } from "../lib/offline-telemetry";

type BootstrapProgress = (status: OfflineBootstrapStatus) => void;

let bootstrapInFlight: Promise<OfflineBootstrapStatus> | null = null;
let bootstrapKey: string | null = null;

export async function runBootstrapCoordinator(
  pointOfSaleId: string,
  priceListId: string,
  onProgress?: BootstrapProgress,
): Promise<OfflineBootstrapStatus> {
  const key = `${pointOfSaleId}:${priceListId}`;
  if (bootstrapInFlight && bootstrapKey === key) {
    return bootstrapInFlight;
  }

  const startedAt = Date.now();
  bootstrapKey = key;
  bootstrapInFlight = (async () => {
    onProgress?.({ fiscal: "loading", catalog: "loading", customers: "loading" });

    const [fiscalRes, catalogRes, customersRes] = await Promise.all([
      downloadFiscalPackForPos(pointOfSaleId),
      downloadCatalogSnapshotForPos(pointOfSaleId, priceListId, (progress) => {
        onProgress?.({
          fiscal: "loading",
          catalog: "loading",
          customers: "loading",
          catalogTotal: progress.total || progress.downloaded,
        });
      }),
      downloadCustomersSnapshot(),
    ]);

    const status: OfflineBootstrapStatus = {
      fiscal: fiscalRes.success ? "ok" : "error",
      catalog: catalogRes.success ? "ok" : "error",
      customers: customersRes.success ? "ok" : "error",
      fiscalMessage: fiscalRes.success ? undefined : fiscalRes.message,
      catalogMessage: catalogRes.success ? undefined : catalogRes.message,
      customersMessage: customersRes.success ? undefined : customersRes.message,
      catalogTotal: catalogRes.success ? catalogRes.total : undefined,
      customersTotal: customersRes.success ? customersRes.total : undefined,
    };

    logOfflineTelemetry("offline_bootstrap_complete", {
      pointOfSaleId,
      priceListId,
      durationMs: Date.now() - startedAt,
      fiscalOk: fiscalRes.success,
      catalogOk: catalogRes.success,
      catalogTotal: catalogRes.success ? catalogRes.total : 0,
      customersOk: customersRes.success,
    });

    onProgress?.(status);
    return status;
  })();

  try {
    return await bootstrapInFlight;
  } finally {
    bootstrapInFlight = null;
    bootstrapKey = null;
  }
}
