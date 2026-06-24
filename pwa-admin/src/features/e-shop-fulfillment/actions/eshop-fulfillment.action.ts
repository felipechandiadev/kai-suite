"use server";

import { revalidatePath } from "next/cache";
import { EShopFulfillmentRequest } from "../infrastructure/eshop-fulfillment.request";
import type {
  EShopFulfillmentMethodRow,
  EShopFulfillmentSettings,
  EShopFulfillmentStatus,
  EShopStockPolicy,
} from "../types/eshop-fulfillment.types";

export async function listFulfillmentMethodsAction() {
  try {
    const rows = await EShopFulfillmentRequest.listMethods();
    return { success: true as const, rows };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createFulfillmentMethodAction(body: Partial<EShopFulfillmentMethodRow>) {
  try {
    await EShopFulfillmentRequest.createMethod(body);
    revalidatePath("/e-shop/fulfillment");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateFulfillmentMethodAction(
  id: string,
  body: Partial<EShopFulfillmentMethodRow>,
) {
  try {
    await EShopFulfillmentRequest.updateMethod(id, body);
    revalidatePath("/e-shop/fulfillment");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteFulfillmentMethodAction(id: string) {
  try {
    await EShopFulfillmentRequest.deleteMethod(id);
    revalidatePath("/e-shop/fulfillment");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getFulfillmentSettingsAction() {
  try {
    const settings = await EShopFulfillmentRequest.getSettings();
    return { success: true as const, settings };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateFulfillmentSettingsAction(body: {
  eShopStockPolicy?: EShopStockPolicy;
  eShopFreeShippingThreshold?: number | null;
  eShopCustomerPortalEnabled?: boolean;
  eShopRegistrationRequireRut?: boolean;
  eShopShowDebtsInPortal?: boolean;
  eShopDefaultBranchId?: string | null;
  eShopDefaultStorageId?: string | null;
  eShopDefaultPriceListId?: string | null;
}) {
  try {
    const settings = await EShopFulfillmentRequest.updateSettings(body);
    revalidatePath("/e-shop/fulfillment");
    return { success: true as const, settings };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listEshopOrdersAction(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  try {
    const result = await EShopFulfillmentRequest.listOrders(params);
    return { success: true as const, ...result };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error",
      data: [],
      total: 0,
      page: 1,
      limit: 25,
    };
  }
}

export async function getEshopOrderAction(id: string) {
  try {
    const order = await EShopFulfillmentRequest.getOrder(id);
    return { success: true as const, order };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateEshopOrderStatusAction(
  id: string,
  status: EShopFulfillmentStatus,
  note?: string,
) {
  try {
    const order = await EShopFulfillmentRequest.updateOrderStatus(id, status, note);
    revalidatePath("/e-shop/fulfillment");
    return { success: true as const, order };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cancelEshopOrderBackorderAction(id: string, reason?: string) {
  try {
    await EShopFulfillmentRequest.cancelOrderBackorder(id, reason);
    revalidatePath("/e-shop/fulfillment");
    revalidatePath("/sales/transactions/backorders");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function convertEshopOrderToSaleAction(id: string) {
  try {
    const result = await EShopFulfillmentRequest.convertOrderToSale(id);
    revalidatePath("/e-shop/fulfillment");
    revalidatePath("/sales/transactions");
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}
