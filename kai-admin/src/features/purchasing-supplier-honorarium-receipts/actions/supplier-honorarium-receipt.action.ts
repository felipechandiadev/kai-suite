"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { SupplierHonorariumReceiptRequest } from "../infrastructure/supplier-honorarium-receipt.request";
import type { CreateSupplierHonorariumReceiptInput } from "../types/supplier-honorarium-receipt.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupplierHonorariumReceiptsForPage(
  opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {},
) {
  return SupplierHonorariumReceiptRequest.list(opts);
}

export async function createSupplierHonorariumReceiptAction(input: CreateSupplierHonorariumReceiptInput) {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    throw new Error("Sesión inválida o usuario no identificado.");
  }
  const res = await SupplierHonorariumReceiptRequest.create({ ...input, userId });
  revalidatePath("/purchasing/dte/honorarium-receipts");
  return res;
}
