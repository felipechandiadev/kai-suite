"use server";

import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { PosPriceListSnapshot } from "../lib/pos-context-storage";

function readPosIdField(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function parsePointOfSaleContextFields(
  pointOfSale: Record<string, unknown>,
): {
  branchId: string | null;
  branchName: string | null;
  storageId: string | null;
  pointOfSaleName: string | null;
} {
  const branch =
    pointOfSale.branch && typeof pointOfSale.branch === "object"
      ? (pointOfSale.branch as Record<string, unknown>)
      : null;
  return {
    branchId: readPosIdField(pointOfSale, "branchId") ?? readPosIdField(branch ?? {}, "id"),
    branchName:
      (branch?.name != null ? String(branch.name).trim() : "") || null,
    storageId: readPosIdField(pointOfSale, "storageId"),
    pointOfSaleName: readPosIdField(pointOfSale, "name"),
  };
}

function normalizePriceLists(raw: unknown): PosPriceListSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: PosPriceListSnapshot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = o.id != null ? String(o.id).trim() : "";
    const name = o.name != null ? String(o.name).trim() : "";
    if (!id) continue;
    if (o.isActive === false) continue;
    out.push({ id, name: name || "Lista de precios" });
  }
  return out;
}

function parsePosKind(raw: Record<string, unknown>): "PRESALE" | "SALE" {
  return raw.kind === "PRESALE" ? "PRESALE" : "SALE";
}

export async function fetchPointOfSalePriceListsAction(pointOfSaleId: string): Promise<
  | {
      success: true;
      priceLists: PosPriceListSnapshot[];
      defaultPriceListId: string | null;
      branchId: string | null;
      branchName: string | null;
      storageId: string | null;
      pointOfSaleName: string | null;
      posKind: "PRESALE" | "SALE";
      acceptsPresaleTickets: boolean;
    }
  | {
      success: false;
      message: string;
      priceLists: [];
      branchId: null;
      branchName: null;
      storageId: null;
      pointOfSaleName: null;
      posKind: "SALE";
      acceptsPresaleTickets: false;
    }
> {
  const id = pointOfSaleId?.trim();
  if (!id) {
    return {
      success: false,
      message: "Sin punto de venta en contexto",
      priceLists: [],
      branchId: null,
      branchName: null,
      storageId: null,
      pointOfSaleName: null,
      posKind: "SALE",
      acceptsPresaleTickets: false,
    };
  }

  const res = await PointOfSaleRequest.findById(id);
  if (!res.success) {
    return {
      success: false,
      message: res.error,
      priceLists: [],
      branchId: null,
      branchName: null,
      storageId: null,
      pointOfSaleName: null,
      posKind: "SALE",
      acceptsPresaleTickets: false,
    };
  }

  const posFields = parsePointOfSaleContextFields(res.pointOfSale);
  const priceLists = normalizePriceLists(res.pointOfSale.priceLists);
  const defaultPriceListId =
    res.pointOfSale.defaultPriceListId != null
      ? String(res.pointOfSale.defaultPriceListId).trim() || null
      : null;

  return {
    success: true,
    priceLists,
    defaultPriceListId,
    posKind: parsePosKind(res.pointOfSale),
    acceptsPresaleTickets: res.pointOfSale.acceptsPresaleTickets === true,
    ...posFields,
  };
}
