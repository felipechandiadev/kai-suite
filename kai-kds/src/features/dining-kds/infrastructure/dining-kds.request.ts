import {
  type DiningAuthContext,
  diningGet,
  diningPost,
} from "@/lib/backend-api";

export type KitchenLineAttribute = {
  attributeValue: string;
};

/** Shape returned by GET /dining/production-unit-queue (same as WS snapshot line). */
export type DiningKitchenQueueLineDto = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number | string;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
  kitchenStatus: string;
  sentToKitchenAt?: string | null;
  displayLabel?: string;
  diningTableId?: string | null;
  diningTableCode?: string | null;
  productVariant?: {
    id?: string;
    name?: string;
    attributes?: KitchenLineAttribute[];
  } | null;
};

/** Normalized line used by KDS UI. */
export type DiningOrderLineDto = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number | string;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
  kitchenStatus: string;
  sentToKitchenAt?: string | null;
  productVariant?: {
    name?: string;
    attributes?: KitchenLineAttribute[];
  };
  diningOrder?: {
    id: string;
    displayLabel: string;
    kind: string;
    status: string;
    diningTable?: { code?: string; label?: string };
  };
};

export type ProductionUnitHistoryItemDto = {
  id: string;
  quantity: number;
  notes: string | null;
  kitchenStatus: string;
  sentToKitchenAt: string | null;
  readyAt: string | null;
  prepDurationMs: number | null;
  productVariant: {
    id: string;
    name: string;
    attributes: KitchenLineAttribute[];
  };
};

export type ProductionUnitHistoryOrderDto = {
  id: string;
  sequenceNumber: number;
  periodKey: string;
  status: string;
  sentAt: string;
  completedAt: string | null;
  diningOrderId: string;
  displayLabel: string;
  diningTableCode: string | null;
  prepDurationMs: number | null;
  items: ProductionUnitHistoryItemDto[];
};

export function normalizeKitchenQueueLine(
  line: DiningKitchenQueueLineDto,
): DiningOrderLineDto {
  return {
    id: line.id,
    diningOrderId: line.diningOrderId,
    productVariantId: line.productVariantId,
    quantity: line.quantity,
    notes: line.notes ?? null,
    productionUnitId: line.productionUnitId ?? null,
    kitchenFireId: line.kitchenFireId ?? null,
    kitchenFireNumber: line.kitchenFireNumber ?? null,
    kitchenStatus: line.kitchenStatus,
    sentToKitchenAt: line.sentToKitchenAt ?? null,
    productVariant: line.productVariant
      ? {
          name: line.productVariant.name,
          attributes: line.productVariant.attributes ?? [],
        }
      : undefined,
    diningOrder: {
      id: line.diningOrderId,
      displayLabel: line.displayLabel ?? "Cuenta",
      kind: "",
      status: "",
      diningTable: line.diningTableCode
        ? { code: line.diningTableCode }
        : undefined,
    },
  };
}

export type ProductionUnitDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  purpose?: string;
  scope?: string;
  inventoryMode?: string;
  branchId?: string | null;
  branch?: { id: string; name: string; code?: string | null } | null;
  defaultInputStorage?: { id: string; name: string } | null;
  defaultOutputStorage?: { id: string; name: string } | null;
};

export class DiningKdsRequest {
  static async productionUnitQueue(
    ctx: DiningAuthContext,
    productionUnitId: string,
  ) {
    const raw = await diningGet<DiningKitchenQueueLineDto[]>(
      "/dining/production-unit-queue",
      ctx,
      { productionUnitId },
    );
    return (raw ?? []).map(normalizeKitchenQueueLine);
  }

  /** @deprecated Prefer productionUnitQueue */
  static kitchenQueue(ctx: DiningAuthContext, productionUnitId: string) {
    return this.productionUnitQueue(ctx, productionUnitId);
  }

  static productionUnitHistory(
    ctx: DiningAuthContext,
    productionUnitId: string,
  ) {
    return diningGet<ProductionUnitHistoryOrderDto[]>(
      "/dining/production-unit-history",
      ctx,
      { productionUnitId },
    );
  }

  static markReady(ctx: DiningAuthContext, orderId: string, lineId: string) {
    return diningPost<DiningOrderLineDto>(
      `/dining/orders/${orderId}/items/${lineId}/ready`,
      ctx,
    );
  }

  static markLinesReady(
    ctx: DiningAuthContext,
    orderId: string,
    lineIds: string[],
    productionUnitId: string,
  ) {
    return diningPost<unknown>(
      `/dining/orders/${orderId}/kitchen-ready-lines`,
      ctx,
      { lineIds, productionUnitId },
    );
  }

  static markFireReady(
    ctx: DiningAuthContext,
    orderId: string,
    fireId: string,
    productionUnitId: string,
  ) {
    return diningPost<unknown>(
      `/dining/orders/${orderId}/fires/${fireId}/ready`,
      ctx,
      { productionUnitId },
    );
  }

  static listProductionUnits(ctx: DiningAuthContext, branchId?: string) {
    return diningGet<ProductionUnitDto[]>("/production-units", ctx, {
      branchId,
      includeInactive: "false",
      // Cocina + batch (pastelería / taller) pueden recibir cola KDS.
    });
  }
}
