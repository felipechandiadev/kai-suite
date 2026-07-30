import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosKind, PosPriceListSnapshot } from "../lib/pos-context-storage";
import { ListPointsOfSaleUseCase } from "./list-points-of-sale.usecase";
import { ListOpenCashSessionsUseCase } from "./list-open-cash-sessions.usecase";
import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import { evaluatePosEntry } from "../domain/evaluate-pos-entry";

export type ValidatePosEntryInput = {
  pointOfSaleId: string;
  cashSessionId?: string | null;
  posKind?: PosKind | null;
};

export type ValidatePosEntryResult =
  | {
      valid: true;
      snapshot: {
        branchId: string | null;
        branchName: string | null;
        storageId: string | null;
        pointOfSaleName: string | null;
        posKind: PosKind;
        acceptsPresaleTickets: boolean;
        deferredPaymentEnabled: boolean;
        priceLists: PosPriceListSnapshot[];
        defaultPriceListId: string | null;
      };
    }
  | { valid: false; reason: string };

function parsePosKind(raw: Record<string, unknown>): PosKind {
  return raw.kind === "PRESALE" ? "PRESALE" : "SALE";
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

export class ValidatePosEntryUseCase {
  static async execute(input: ValidatePosEntryInput): Promise<ValidatePosEntryResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const posList = await ListPointsOfSaleUseCase.execute();
    const assignedPointOfSaleIds =
      posList.success ? posList.pointsOfSale.map((p) => p.id) : [];

    const posId = input.pointOfSaleId?.trim() ?? "";
    let posKind = input.posKind ?? null;

    if (posId) {
      const posRes = await PointOfSaleRequest.findById(posId);
      if (posRes.success) {
        posKind = parsePosKind(posRes.pointOfSale);
      }
    }

    const openList = await ListOpenCashSessionsUseCase.execute();
    const openSessionForPos =
      openList.success && posId
        ? (openList.items.find((s) => s.pointOfSaleId === posId) ?? null)
        : null;

    const evaluation = evaluatePosEntry({
      userId,
      pointOfSaleId: posId || null,
      cashSessionId: input.cashSessionId ?? null,
      posKind,
      assignedPointOfSaleIds,
      openSessionForPos: openSessionForPos
        ? {
            id: openSessionForPos.id,
            status: openSessionForPos.status,
            openedById: openSessionForPos.openedById,
            pointOfSaleId: openSessionForPos.pointOfSaleId,
          }
        : null,
    });

    if (!evaluation.valid) {
      return evaluation;
    }

    const posRes = await PointOfSaleRequest.findById(posId);
    if (!posRes.success) {
      return { valid: false, reason: posRes.error };
    }

    const pos = posRes.pointOfSale;
    const branch =
      pos.branch && typeof pos.branch === "object"
        ? (pos.branch as Record<string, unknown>)
        : null;
    const priceLists = normalizePriceLists(pos.priceLists);
    const defaultPriceListId =
      pos.defaultPriceListId != null ? String(pos.defaultPriceListId).trim() || null : null;

    return {
      valid: true,
      snapshot: {
        branchId:
          (pos.branchId != null ? String(pos.branchId).trim() : "") ||
          (branch?.id != null ? String(branch.id).trim() : "") ||
          null,
        branchName: branch?.name != null ? String(branch.name).trim() || null : null,
        storageId: pos.storageId != null ? String(pos.storageId).trim() || null : null,
        pointOfSaleName: pos.name != null ? String(pos.name).trim() || null : null,
        posKind: parsePosKind(pos),
        acceptsPresaleTickets: pos.acceptsPresaleTickets === true,
        deferredPaymentEnabled: pos.deferredPaymentEnabled === true,
        priceLists,
        defaultPriceListId,
      },
    };
  }
}
