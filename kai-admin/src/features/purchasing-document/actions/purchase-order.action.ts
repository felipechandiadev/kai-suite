"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { PurchaseOrderRequest } from "../infrastructure/purchase-order.request";
import type { CreatePurchaseOrderInput, CreatePurchaseOrderResult } from "../types/purchase-order.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createPurchaseOrderAction(input: CreatePurchaseOrderInput): Promise<CreatePurchaseOrderResult> {
  const session = await getServerSession(authOptions);
  // Prefer accessToken: it is set at login to `data.user.id` from the API. `session.user.id` can differ from `users.id` if the JWT `sub` is not the DB id.
  const userId = String(
    session?.user?.accessToken || session?.user?.id || "",
  ).trim();
  if (!UUID_RE.test(userId)) {
    return { success: false, error: "Sesión inválida o usuario no identificado." };
  }
  if (!UUID_RE.test(input.branchId)) {
    return { success: false, error: "Falta sucursal (branch) válida para la orden." };
  }
  const draft = input.saveAsDraft === true;
  if (!draft && !UUID_RE.test(input.supplierId ?? "")) {
    return { success: false, error: "Debe seleccionar un proveedor." };
  }
  const storageTrim = input.storageId?.trim();
  if (storageTrim !== undefined && storageTrim !== "" && !UUID_RE.test(storageTrim)) {
    return { success: false, error: "Si indica almacén, debe ser un id válido." };
  }
  if (!input.documentDate?.trim()) {
    return { success: false, error: "La fecha del documento es obligatoria." };
  }
  if (!draft && !(input.lines?.length > 0)) {
    return { success: false, error: "Agregue al menos una línea de producto." };
  }

  const result = await PurchaseOrderRequest.create({
    ...input,
    userId,
  });

  if (result.success) {
    revalidatePath("/purchasing/transactions/orders", "page");
    revalidatePath("/purchasing/orders/list", "page");
  }
  return result;
}
