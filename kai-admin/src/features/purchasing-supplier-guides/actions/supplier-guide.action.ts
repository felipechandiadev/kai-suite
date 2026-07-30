"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { SupplierGuideRequest } from "../infrastructure/supplier-guide.request";
import type { CreateSupplierGuideInput } from "../types/supplier-guide.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupplierGuidesForPage(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
  return SupplierGuideRequest.list(opts);
}

export async function createSupplierGuideAction(input: CreateSupplierGuideInput) {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    throw new Error("Sesión inválida o usuario no identificado.");
  }
  const res = await SupplierGuideRequest.create({ ...input, userId });
  revalidatePath("/purchasing/dte/guides");
  return res;
}
