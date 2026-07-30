"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { SupplierReceiptRequest } from "../infrastructure/supplier-receipt.request";
import type { CreateSupplierReceiptInput } from "../types/supplier-receipt.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupplierReceiptsForPage(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
  return SupplierReceiptRequest.list(opts);
}

export async function createSupplierReceiptAction(input: CreateSupplierReceiptInput) {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    throw new Error("Sesión inválida o usuario no identificado.");
  }
  const res = await SupplierReceiptRequest.create({ ...input, userId });
  revalidatePath("/purchasing/dte/receipts");
  revalidatePath("/accounting/accounts-payable", "layout");
  return res;
}
