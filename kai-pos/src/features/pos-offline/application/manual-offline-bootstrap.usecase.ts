import { isBackendReachable } from "../infrastructure/connectivity";
import { runBootstrapCoordinator } from "./bootstrap-coordinator.usecase";
import type { OfflineBootstrapStatus } from "../domain/offline-bootstrap.types";

export type ManualOfflineBootstrapResult =
  | {
      success: true;
      status: OfflineBootstrapStatus;
      catalogTotal: number;
      warnings: string[];
    }
  | { success: false; message: string; status?: OfflineBootstrapStatus };

export async function triggerManualOfflineBootstrap(
  pointOfSaleId: string,
  priceListId: string,
): Promise<ManualOfflineBootstrapResult> {
  if (!isBackendReachable()) {
    return {
      success: false,
      message: "Sin conexión al servidor. Reconecta para sincronizar datos offline.",
    };
  }

  const status = await runBootstrapCoordinator(pointOfSaleId, priceListId);

  if (status.catalog !== "ok") {
    return {
      success: false,
      message: status.catalogMessage ?? "No se pudo sincronizar el catálogo offline.",
      status,
    };
  }

  const warnings: string[] = [];
  if (status.fiscal !== "ok") {
    warnings.push(status.fiscalMessage ?? "Paquete fiscal no actualizado.");
  }
  if (status.customers !== "ok") {
    warnings.push(status.customersMessage ?? "Clientes offline no actualizados.");
  }

  return {
    success: true,
    status,
    catalogTotal: status.catalogTotal ?? 0,
    warnings,
  };
}
