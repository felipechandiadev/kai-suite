import {
  type DiningAuthContext,
  diningGet,
  diningPost,
} from "@/lib/backend-api";

export type DiningOrderLineDto = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number | string;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenStatus: string;
  sentToKitchenAt?: string | null;
  productVariant?: { name?: string; sku?: string };
  diningOrder?: {
    id: string;
    displayLabel: string;
    kind: string;
    status: string;
    diningTable?: { code?: string; label?: string };
  };
};

export type ProductionUnitDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export class DiningKdsRequest {
  static kitchenQueue(ctx: DiningAuthContext, productionUnitId: string) {
    return diningGet<DiningOrderLineDto[]>("/dining/kitchen-queue", ctx, {
      productionUnitId,
    });
  }

  static markReady(ctx: DiningAuthContext, orderId: string, lineId: string) {
    return diningPost<DiningOrderLineDto>(
      `/dining/orders/${orderId}/items/${lineId}/ready`,
      ctx,
    );
  }

  static listProductionUnits(ctx: DiningAuthContext, branchId?: string) {
    return diningGet<ProductionUnitDto[]>("/production-units", ctx, {
      branchId,
      includeInactive: "false",
    });
  }
}
