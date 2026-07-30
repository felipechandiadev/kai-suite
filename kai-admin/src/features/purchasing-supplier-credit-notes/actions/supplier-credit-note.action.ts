"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { SupplierCreditNoteRequest } from "../infrastructure/supplier-credit-note.request";
import type { CreateSupplierCreditNoteInput } from "../types/supplier-credit-note.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupplierCreditNotesForPage(
  opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {},
) {
  return SupplierCreditNoteRequest.list(opts);
}

export async function createSupplierCreditNoteAction(
  input: CreateSupplierCreditNoteInput,
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
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
  if (!UUID_RE.test(input.purchaseReturnId)) {
    return { success: false, error: "Debe indicar el UUID de la devolución (PURCHASE_RETURN)." };
  }
  try {
    const data = await SupplierCreditNoteRequest.create({ ...input, userId });
    revalidatePath("/purchasing/dte/credit-notes");
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al crear la nota de crédito." };
  }
}
