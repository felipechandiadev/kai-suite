import type { PosCommandType, PosOfflineFeature } from "../domain/offline-command.types";
import {
  enqueueOfflineCommand,
  listOfflineCommands,
  type EnqueueOfflineCommandInput,
} from "./enqueue-command.usecase";
import { syncOfflineQueueOnce } from "./sync-queue.usecase";
import { isBackendReachable } from "../infrastructure/connectivity";
import { runBootstrapCoordinator } from "./bootstrap-coordinator.usecase";
import { commitOfflineSale, type CommitOfflineSaleInput } from "./commit-offline-sale.usecase";
import { assertCatalogReady } from "./catalog-readiness.usecase";

export type SyncBatchResult = {
  processed: number;
  synced: number;
  failed: number;
};

class PosOfflineEngineImpl {
  async enqueue(input: EnqueueOfflineCommandInput) {
    return enqueueOfflineCommand(input);
  }

  async commitSale(input: CommitOfflineSaleInput) {
    return commitOfflineSale(input);
  }

  async bootstrap(pointOfSaleId: string, priceListId: string) {
    return runBootstrapCoordinator(pointOfSaleId, priceListId);
  }

  async catalogReady(pointOfSaleId: string, priceListId: string) {
    return assertCatalogReady(pointOfSaleId, priceListId);
  }

  async syncOnce(userName: string): Promise<SyncBatchResult> {
    const before = await listOfflineCommands();
    const pendingIds = new Set(
      before.filter((c) => ["PENDING", "FAILED"].includes(c.status)).map((c) => c.id),
    );
    await syncOfflineQueueOnce(userName);
    const after = await listOfflineCommands();
    let synced = 0;
    let failed = 0;
    for (const cmd of after) {
      if (!pendingIds.has(cmd.id)) continue;
      if (cmd.status === "SYNCED") synced += 1;
      if (cmd.status === "FAILED" || cmd.status === "CONFLICT") failed += 1;
    }
    return {
      processed: pendingIds.size,
      synced,
      failed,
    };
  }

  canOperateOffline(feature: PosOfflineFeature): boolean {
    if (!isBackendReachable()) {
      return [
        "sale",
        "cash_movement",
        "hub_deposit",
        "hub_withdrawal",
        "close_session",
      ].includes(feature);
    }
    return true;
  }

  shouldUseOfflineQueue(): boolean {
    return !isBackendReachable();
  }
}

export const posOfflineEngine = new PosOfflineEngineImpl();

export type { PosCommandType };
