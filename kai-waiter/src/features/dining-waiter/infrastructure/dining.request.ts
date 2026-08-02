import {
  type DiningAuthContext,
  diningGet,
  diningPatch,
  diningPost,
} from "@/lib/backend-api";
import type { WaiterCompanyTipSettings } from "../types/company-tips.types";

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
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
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
  openedByUserId?: string | null;
  lines?: DiningOrderLineDto[];
  diningTable?: { code?: string; label?: string };
};

export type ProductionUnitDto = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type WaiterMenuCategoryDto = {
  id: string;
  name: string;
};

export type DiningNumberingSettingsDto = {
  allowWaiterOpenTable: boolean;
  allowPosOpenTable?: boolean;
  posAccountsMenuCategoryIds?: string[];
  posAccountsMenuCategories?: WaiterMenuCategoryDto[];
};

export type WaiterProductAttributeDto = {
  attributeId: string;
  attributeName: string;
  attributeValue: string;
};

export type WaiterMenuVariantDto = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  barcode?: string | null;
  productType: string;
  unitPrice: number;
  unitPriceWithTax: number;
  attributes: WaiterProductAttributeDto[];
  trackInventory?: boolean;
  availableStock?: number | null;
  saleUnitSymbol?: string | null;
};

export type WaiterMenuSearchResult = {
  products: WaiterMenuVariantDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type WaiterBranchCatalogContextDto = {
  branchId: string;
  priceListId: string | null;
  pointOfSaleId: string | null;
};

export type WaiterCtpResultDto = {
  variantId: string;
  productionUnitId: string | null;
  inputStorageId: string | null;
  producibleQty: number | null;
};

export type WaiterLineProductMeta = {
  name: string;
  attributes?: WaiterProductAttributeDto[];
  unitPrice: number;
  productType?: string | null;
};

type PosListRow = {
  id?: string;
  branchId?: string | null;
  branch?: { id?: string } | null;
  isActive?: boolean;
  defaultPriceListId?: string | null;
};

type PosSearchApiResponse = {
  success?: boolean;
  products?: Array<Record<string, unknown>>;
  pagination?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
};

type PosLookupApiResponse = {
  success?: boolean;
  products?: Array<Record<string, unknown>>;
};

function mapPosProduct(raw: Record<string, unknown>): WaiterMenuVariantDto {
  const attrsRaw = Array.isArray(raw.attributes) ? raw.attributes : [];
  const attributes: WaiterProductAttributeDto[] = attrsRaw
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const row = a as Record<string, unknown>;
      return {
        attributeId: String(row.attributeId ?? ""),
        attributeName: String(row.attributeName ?? ""),
        attributeValue: String(row.attributeValue ?? ""),
      };
    })
    .filter((a): a is WaiterProductAttributeDto => Boolean(a?.attributeId));

  const unitPriceWithTax = Number(raw.unitPriceWithTax ?? raw.unitPrice ?? 0) || 0;
  const unitPrice = Number(raw.unitPrice ?? unitPriceWithTax) || 0;

  return {
    variantId: String(raw.variantId ?? ""),
    productId: String(raw.productId ?? ""),
    productName: String(raw.productName ?? "Producto"),
    variantName: raw.sku != null ? String(raw.sku) : null,
    sku: raw.sku != null ? String(raw.sku) : null,
    barcode: raw.barcode != null ? String(raw.barcode) : null,
    productType: String(raw.productType ?? "").toUpperCase(),
    unitPrice,
    unitPriceWithTax,
    attributes,
    trackInventory: Boolean(raw.trackInventory),
    availableStock:
      raw.availableStock == null ? null : Number(raw.availableStock),
    saleUnitSymbol:
      raw.saleUnitSymbol != null
        ? String(raw.saleUnitSymbol)
        : raw.unitSymbol != null
          ? String(raw.unitSymbol)
          : null,
  };
}

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
    return diningGet<DiningNumberingSettingsDto>(
      `/dining/branches/${encodeURIComponent(branchId)}/numbering-settings`,
      ctx,
    );
  }

  static async resolveBranchCatalogContext(
    ctx: DiningAuthContext,
    branchId: string,
  ): Promise<WaiterBranchCatalogContextDto> {
    const bid = branchId.trim();
    const data = await diningGet<{
      success?: boolean;
      pointsOfSale?: PosListRow[];
    }>("/points-of-sale", ctx, {
      includeInactive: "false",
    });
    const rows = Array.isArray(data?.pointsOfSale) ? data.pointsOfSale : [];
    const forBranch = rows.filter((p) => {
      const posBranchId = String(p.branch?.id ?? p.branchId ?? "").trim();
      return (
        p.isActive !== false &&
        posBranchId === bid &&
        Boolean(String(p.defaultPriceListId ?? "").trim())
      );
    });
    const pick = forBranch[0];
    return {
      branchId: bid,
      priceListId: pick?.defaultPriceListId?.trim() || null,
      pointOfSaleId: pick?.id?.trim() || null,
    };
  }

  static async searchPosMenuProducts(
    ctx: DiningAuthContext,
    input: {
      priceListId: string;
      branchId?: string;
      pointOfSaleId?: string | null;
      query?: string;
      categoryIds?: string[];
      page?: number;
      pageSize?: number;
    },
  ): Promise<WaiterMenuSearchResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.max(1, Math.min(48, input.pageSize ?? 24));
    const query: Record<string, string | undefined> = {
      priceListId: input.priceListId,
      branchId: input.branchId,
      pointOfSaleId: input.pointOfSaleId ?? undefined,
      query: input.query?.trim() || undefined,
      page: String(page),
      pageSize: String(pageSize),
      productTypes: "PREPARADO,PHYSICAL",
    };
    if (input.categoryIds?.length) {
      query.categoryIds = input.categoryIds.join(",");
    }
    const data = await diningGet<PosSearchApiResponse>(
      "/products/pos/search",
      ctx,
      query,
    );
    const products = (data.products ?? [])
      .map((row) => mapPosProduct(row))
      .filter((p) => Boolean(p.variantId));
    return {
      products,
      total: Number(data.pagination?.total ?? products.length) || 0,
      page: Number(data.pagination?.page ?? page) || page,
      pageSize: Number(data.pagination?.pageSize ?? pageSize) || pageSize,
    };
  }

  static async lookupVariants(
    ctx: DiningAuthContext,
    input: {
      variantIds: string[];
      branchId?: string;
      priceListId?: string | null;
      pointOfSaleId?: string | null;
    },
  ): Promise<Record<string, WaiterLineProductMeta>> {
    const ids = [...new Set(input.variantIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};
    const data = await diningGet<PosLookupApiResponse>(
      "/products/pos/variants/lookup",
      ctx,
      {
        variantIds: ids.join(","),
        branchId: input.branchId,
        priceListId: input.priceListId ?? undefined,
        pointOfSaleId: input.pointOfSaleId ?? undefined,
      },
    );
    const map: Record<string, WaiterLineProductMeta> = {};
    for (const raw of data.products ?? []) {
      const mapped = mapPosProduct(raw);
      if (!mapped.variantId) continue;
      map[mapped.variantId] = {
        name: mapped.productName,
        attributes: mapped.attributes,
        unitPrice: mapped.unitPriceWithTax || mapped.unitPrice,
        productType: mapped.productType || null,
      };
    }
    return map;
  }

  static async batchCtp(
    ctx: DiningAuthContext,
    input: { branchId: string; variantIds: string[] },
  ): Promise<WaiterCtpResultDto[]> {
    const items = input.variantIds
      .map((id) => id.trim())
      .filter(Boolean)
      .map((variantId) => ({ variantId }));
    if (items.length === 0) return [];
    const data = await diningPost<{
      results?: Array<Record<string, unknown>>;
      success?: boolean;
    }>("/recipes/ctp/batch", ctx, {
      branchId: input.branchId,
      items,
    });
    return (data.results ?? []).map((r) => ({
      variantId: String(r.variantId ?? ""),
      productionUnitId:
        r.productionUnitId == null ? null : String(r.productionUnitId),
      inputStorageId:
        r.inputStorageId == null ? null : String(r.inputStorageId),
      producibleQty:
        r.producibleQty == null
          ? null
          : Number.isFinite(Number(r.producibleQty))
            ? Number(r.producibleQty)
            : null,
    }));
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

  static cancelOrderItem(
    ctx: DiningAuthContext,
    orderId: string,
    lineId: string,
  ) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/items/${lineId}/cancel`,
      ctx,
    );
  }

  static updateOrderLineNotes(
    ctx: DiningAuthContext,
    orderId: string,
    lineId: string,
    notes: string | null,
  ) {
    return diningPatch<DiningOrderDto>(
      `/dining/orders/${orderId}/lines/${lineId}`,
      ctx,
      { notes },
    );
  }

  static requestBill(ctx: DiningAuthContext, orderId: string) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/request-bill`,
      ctx,
    );
  }

  static reopenOrder(ctx: DiningAuthContext, orderId: string) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/reopen`,
      ctx,
    );
  }

  static getTipSettings(ctx: DiningAuthContext) {
    return diningGet<{ tipSettings?: WaiterCompanyTipSettings }>(
      "/company/tip-settings",
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

  static markFireDelivered(
    ctx: DiningAuthContext,
    orderId: string,
    fireId: string,
  ) {
    return diningPost<DiningOrderDto>(
      `/dining/orders/${orderId}/fires/${fireId}/delivered`,
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
