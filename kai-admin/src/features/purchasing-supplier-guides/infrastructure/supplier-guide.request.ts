import type { CreateSupplierGuideInput, SupplierGuideListResult } from "../types/supplier-guide.types";

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

export class SupplierGuideRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-guides?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = "No se pudo listar guías de despacho de proveedor";
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
    return (await res.json()) as SupplierGuideListResult;
  }

  static async create(input: CreateSupplierGuideInput) {
    const dte = input.dteNumber != null && String(input.dteNumber).trim() !== "" ? String(input.dteNumber).trim() : "";
    const { links, dteNumber: _d, ...rest } = input;
    const payload = {
      ...rest,
      ...(dte ? { dteNumber: dte } : {}),
      metadata: {
        links: links ?? {},
        ...(dte ? { dteNumber: dte } : {}),
      },
    };
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`supplier-guides`), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la guía de despacho");
    }
    return res.json();
  }
}
