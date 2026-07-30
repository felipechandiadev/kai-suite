import type { CreateSupplierReceiptInput, SupplierReceiptListResult } from "../types/supplier-receipt.types";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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

export class SupplierReceiptRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-receipts?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = "No se pudo listar boletas de proveedor";
      try {
        const data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
        const m = data?.message;
        if (Array.isArray(m)) {
          msg = m.map(String).join("; ");
        } else if (typeof m === "string" && m.trim()) {
          msg = m;
        }
      } catch {
        // keep default msg
      }
      throw new Error(`${msg} (HTTP ${res.status})`);
    }
    return (await res.json()) as SupplierReceiptListResult;
  }

  static async create(input: CreateSupplierReceiptInput) {
    const dte = input.dteNumber != null && String(input.dteNumber).trim() !== "" ? String(input.dteNumber).trim() : "";
    const { links, dteNumber: _d, supplierDocumentPayment, ...rest } = input;
    const payload = {
      ...rest,
      ...(dte ? { dteNumber: dte } : {}),
      metadata: {
        links: links ?? {},
        ...(dte ? { dteNumber: dte } : {}),
      },
      ...(supplierDocumentPayment ? { supplierDocumentPayment } : {}),
    };
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-receipts`), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la boleta");
    }
    return res.json();
  }
}
