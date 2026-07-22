import {
  type DiningAuthContext,
  diningGet,
  diningPost,
} from "@/lib/backend-api";

export type DiningTableDto = {
  id: string;
  diningRoomId: string;
  code: string;
  label: string;
  capacity: number;
  shape: "RECT" | "CIRCLE";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type DiningRoomDto = {
  id: string;
  branchId: string;
  name: string;
  isActive: boolean;
  floorPlan?: Record<string, unknown> | null;
  tables?: DiningTableDto[];
};

export type DiningOrderLineDto = {
  id: string;
  diningOrderId: string;
  productVariantId: string;
  quantity: number | string;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenStatus: string;
  productVariant?: { name?: string; sku?: string };
};

export type DiningOrderDto = {
  id: string;
  branchId: string;
  kind: string;
  diningTableId?: string | null;
  displayLabel: string;
  diningRoomId?: string | null;
  status: string;
  openedAt: string;
  lines?: DiningOrderLineDto[];
  diningTable?: { code?: string; label?: string };
};

export type ProductionUnitDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type WaiterMenuVariantDto = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  productType: string;
};

type CatalogProductSearchRow = {
  id: string;
  name: string;
  productType?: string;
  variants?: Array<{
    id: string;
    name?: string | null;
    sku?: string | null;
  }>;
};

const DINING_MENU_TYPES = new Set(["PREPARADO", "PHYSICAL"]);

export class DiningRequest {
  static listRooms(ctx: DiningAuthContext) {
    return diningGet<DiningRoomDto[]>("/dining/rooms", ctx);
  }

  static getRoom(ctx: DiningAuthContext, roomId: string) {
    return diningGet<DiningRoomDto>(`/dining/rooms/${roomId}`, ctx);
  }

  static listActiveOrders(ctx: DiningAuthContext, branchId?: string) {
    return diningGet<DiningOrderDto[]>("/dining/orders", ctx, { branchId });
  }

  static getOrder(ctx: DiningAuthContext, orderId: string) {
    return diningGet<DiningOrderDto>(`/dining/orders/${orderId}`, ctx);
  }

  static openTable(
    ctx: DiningAuthContext,
    body: { branchId: string; diningTableId: string },
  ) {
    return diningPost<DiningOrderDto>("/dining/orders/open-table", ctx, {
      ...body,
      openedFrom: "WAITER",
    });
  }

  static getNumberingSettings(ctx: DiningAuthContext, branchId: string) {
    return diningGet<{
      allowWaiterOpenTable: boolean;
      allowPosOpenTable: boolean;
    }>(
      `/dining/branches/${encodeURIComponent(branchId)}/numbering-settings`,
      ctx,
    );
  }

  static addItems(
    ctx: DiningAuthContext,
    orderId: string,
    items: Array<{ productVariantId: string; quantity: number; notes?: string }>,
  ) {
    return diningPost<DiningOrderDto>(`/dining/orders/${orderId}/items`, ctx, {
      items,
    });
  }

  static sendToKitchen(
    ctx: DiningAuthContext,
    orderId: string,
    lineIds?: string[],
  ) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/send-to-kitchen`,
      ctx,
      lineIds?.length ? { lineIds } : {},
    );
  }

  static async searchMenuProducts(
    ctx: DiningAuthContext,
    query: string,
  ): Promise<WaiterMenuVariantDto[]> {
    const rows = await diningGet<CatalogProductSearchRow[]>(
      "/products/search",
      ctx,
      {
        query,
        page: "1",
        pageSize: "24",
      },
    );
    const items: WaiterMenuVariantDto[] = [];
    for (const product of rows ?? []) {
      const productType = (product.productType ?? "").toUpperCase();
      if (!DINING_MENU_TYPES.has(productType)) continue;
      for (const variant of product.variants ?? []) {
        if (!variant?.id) continue;
        items.push({
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantName: variant.name ?? null,
          sku: variant.sku ?? null,
          productType,
        });
      }
    }
    return items;
  }

  static requestBill(ctx: DiningAuthContext, orderId: string) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/request-bill`,
      ctx,
    );
  }

  static kitchenQueue(ctx: DiningAuthContext, productionUnitId: string) {
    return diningGet<DiningOrderLineDto[]>(
      "/dining/production-unit-queue",
      ctx,
      {
        productionUnitId,
      },
    );
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
