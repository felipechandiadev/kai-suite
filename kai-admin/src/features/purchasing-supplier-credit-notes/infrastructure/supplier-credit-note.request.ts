import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreateSupplierCreditNoteInput, SupplierCreditNoteListResult } from "../types/supplier-credit-note.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class SupplierCreditNoteRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-credit-notes?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo listar notas de crédito (HTTP ${res.status})`);
    }
    return (await res.json()) as SupplierCreditNoteListResult;
  }

  static async create(input: CreateSupplierCreditNoteInput & { userId: string }): Promise<unknown> {
    const headers = await authHeaders();
    const dte =
      input.dteNumber != null && String(input.dteNumber).trim() !== ""
        ? String(input.dteNumber).trim()
        : "";
    const res = await fetch(apiUrl("supplier-credit-notes"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        branchId: input.branchId,
        userId: input.userId,
        supplierId: input.supplierId,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        discountAmount: input.discountAmount,
        total: input.total,
        externalReference: input.externalReference,
        notes: input.notes,
        lines: input.lines,
        ...(dte ? { dteNumber: dte } : {}),
        metadata: {
          links: {
            purchaseReturnId: input.purchaseReturnId,
            supplierInvoiceId: input.supplierInvoiceId ?? null,
          },
          ...(dte ? { dteNumber: dte } : {}),
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la nota de crédito");
    }
    return data;
  }
}
