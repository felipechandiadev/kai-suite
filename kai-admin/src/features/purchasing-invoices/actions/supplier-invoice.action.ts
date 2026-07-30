"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { SupplierInvoiceRequest } from "../infrastructure/supplier-invoice.request";
import type { CreateSupplierInvoiceInput } from "../types/supplier-invoice.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listSupplierInvoicesForPage(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
  return SupplierInvoiceRequest.list(opts);
}

export async function createSupplierInvoiceAction(input: CreateSupplierInvoiceInput) {
  const session = await getServerSession(authOptions);
  const userId = String(session?.user?.accessToken || session?.user?.id || "").trim();
  if (!UUID_RE.test(userId)) {
    throw new Error("Sesión inválida o usuario no identificado.");
  }
  const res = await SupplierInvoiceRequest.create({ ...input, userId });
  revalidatePath("/purchasing/dte/invoices");
  revalidatePath("/accounting/accounts-payable", "layout");
  return res;
}
