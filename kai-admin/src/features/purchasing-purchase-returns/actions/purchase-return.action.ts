"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { ReceptionRequest } from "@/features/receptions/infrastructure/reception.request";
import { PurchaseReturnRequest } from "../infrastructure/purchase-return.request";
import type { CreatePurchaseReturnInput, CreatePurchaseReturnResult } from "../types/purchase-return.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Folio interno de recepción (CMP-…) por id, para el listado de devoluciones. */
export async function loadReceptionFoliosByIdsAction(
  receptionIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(receptionIds.filter((id) => UUID_RE.test(id.trim())).map((id) => id.trim()))];
  if (ids.length === 0) {
    return {};
  }
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const rec = await ReceptionRequest.getById(id);
        const folio =
          (rec.folio ?? rec.documentNumber ?? "").trim() || id.slice(0, 8);
        return [id, folio] as const;
      } catch {
        return [id, "—"] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export async function listPurchaseReturnsForPage(
  opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {},
) {
  return PurchaseReturnRequest.list(opts);
}

export async function createPurchaseReturnAction(
  input: CreatePurchaseReturnInput,
): Promise<CreatePurchaseReturnResult> {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, error: "Sesión inválida o usuario no identificado." };
  }
  if (!UUID_RE.test(input.branchId)) {
    return { success: false, error: "Falta sucursal (branch) válida." };
  }
  if (!UUID_RE.test(input.supplierId)) {
    return { success: false, error: "Proveedor inválido." };
  }
  if (!UUID_RE.test(input.storageId)) {
    return { success: false, error: "Almacén inválido." };
  }
  try {
    const data = await PurchaseReturnRequest.create({ ...input, userId });
    const rec = data as Record<string, unknown>;
    const id = typeof rec?.id === "string" && rec.id.trim() ? rec.id.trim() : undefined;
    revalidatePath("/purchasing/transactions/purchase-returns", "layout");
    revalidatePath("/purchasing/purchase-returns");
    revalidatePath("/purchasing/purchase-returns/list");
    revalidatePath("/purchasing/dte/credit-notes");
    return { success: true, data, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la devolución." };
  }
}
