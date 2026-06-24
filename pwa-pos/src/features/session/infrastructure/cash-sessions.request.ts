import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ListCashSessionsResponse } from "../types/cash-session.types";
import type { CashSessionMovementRow } from "../types/cash-session-movement.types";
import type { CashHubDepositCandidate } from "../types/cash-hub-deposit.types";
import type { CreateSaleApiBody } from "../lib/build-create-sale-payload";
import type { CreateBackorderApiBody } from "../lib/build-create-backorder-payload";

const BACKEND_CONNECTION_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.";

/** Evita que un ECONNREFUSED en SSR rompa la página del POS. */
async function backendFetch(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { cache: "no-store", ...init });
  } catch {
    return null;
  }
}

export class CashSessionsRequest {
  static async listOpen(): Promise<ListCashSessionsResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions?status=OPEN`, {
      method: "GET",
      headers,
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    return res.json();
  }

  static async open(input: {
    pointOfSaleId: string;
    openingAmount: number;
    cashHubId?: string;
  }): Promise<
    | { success: true; cashSession: { id: string } }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const userId = session?.user?.id;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token || !userId) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        pointOfSaleId: input.pointOfSaleId,
        openingAmount: input.openingAmount,
        ...(input.cashHubId?.trim() ? { cashHubId: input.cashHubId.trim() } : {}),
      }),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
        data?.error ||
        res.statusText ||
        "No se pudo abrir la sesión de caja";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success && data?.cashSession?.id) {
      return { success: true, cashSession: { id: data.cashSession.id } };
    }

    return { success: false, message: "Respuesta inesperada al abrir sesión" };
  }

  static async createSale(
    body: CreateSaleApiBody,
  ): Promise<
    | { success: true; transaction: { id: string; documentNumber: string } }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar la venta";
      return { success: false, message: msg, statusCode: res.status };
    }

    const tx = data?.transaction as { id?: string; documentNumber?: string } | undefined;
    if (data?.success === true && tx?.id && tx?.documentNumber) {
      return {
        success: true,
        transaction: { id: String(tx.id), documentNumber: String(tx.documentNumber) },
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar la venta" };
  }

  static async collectPendingSales(
    body: import("../lib/build-collect-pending-sales-payload").CollectPendingSalesApiBody,
  ): Promise<
    | {
        success: true;
        paymentIn: { id: string; documentNumber: string };
        allocations: Array<{ saleId: string; documentNumber: string; amount: number }>;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/collect-pending-sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar el cobro";
      return { success: false, message: msg, statusCode: res.status };
    }

    const paymentIn = data?.paymentIn as { id?: string; documentNumber?: string } | undefined;
    const allocations = Array.isArray(data?.allocations) ? data.allocations : [];
    if (data?.success === true && paymentIn?.id && paymentIn?.documentNumber) {
      return {
        success: true,
        paymentIn: {
          id: String(paymentIn.id),
          documentNumber: String(paymentIn.documentNumber),
        },
        allocations: allocations.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            saleId: String(r.saleId ?? ""),
            documentNumber: String(r.documentNumber ?? ""),
            amount: Number(r.amount ?? 0),
          };
        }),
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el cobro" };
  }

  static async collectPendingQuotas(
    body: import("../lib/build-collect-pending-quotas-payload").CollectPendingQuotasApiBody,
  ): Promise<
    | {
        success: true;
        paymentIn: { id: string; documentNumber: string };
        allocations: Array<{
          installmentId: string;
          saleTransactionId: string;
          documentNumber: string;
          amount: number;
        }>;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/collect-pending-quotas`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar el cobro de cuotas";
      return { success: false, message: msg, statusCode: res.status };
    }

    const paymentIn = data?.paymentIn as { id?: string; documentNumber?: string } | undefined;
    const allocations = Array.isArray(data?.allocations) ? data.allocations : [];
    if (data?.success === true && paymentIn?.id && paymentIn?.documentNumber) {
      return {
        success: true,
        paymentIn: {
          id: String(paymentIn.id),
          documentNumber: String(paymentIn.documentNumber),
        },
        allocations: allocations.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            installmentId: String(r.installmentId ?? ""),
            saleTransactionId: String(r.saleTransactionId ?? ""),
            documentNumber: String(r.documentNumber ?? ""),
            amount: Number(r.amount ?? 0),
          };
        }),
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el cobro de cuotas" };
  }

  static async payoutCustomerCreditNotes(
    body: import("../lib/build-payout-customer-credit-notes-payload").PayoutCustomerCreditNotesApiBody,
  ): Promise<
    | {
        success: true;
        payout: { id: string; documentNumber: string };
        allocations: Array<{
          creditNoteId: string;
          documentNumber: string;
          amount: number;
        }>;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL is not set" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/payout-customer-credit-notes`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar la devolución";
      return { success: false, message: msg, statusCode: res.status };
    }

    const payout = data?.payout as { id?: string; documentNumber?: string } | undefined;
    const allocations = Array.isArray(data?.allocations) ? data.allocations : [];
    if (data?.success === true && payout?.id && payout?.documentNumber) {
      return {
        success: true,
        payout: {
          id: String(payout.id),
          documentNumber: String(payout.documentNumber),
        },
        allocations: allocations.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            creditNoteId: String(r.creditNoteId ?? ""),
            documentNumber: String(r.documentNumber ?? ""),
            amount: Number(r.amount ?? 0),
          };
        }),
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar la devolución" };
  }

  static async confirmCustomerReturnDocument(
    body: import("../lib/build-create-sale-return-payload").ConfirmCustomerReturnDocumentApiBody,
  ): Promise<
    | {
        success: true;
        originalSale: { id: string; documentNumber: string };
        saleReturn: {
          id: string;
          documentNumber: string;
          total: number;
          subtotal: number;
          taxAmount: number;
          discountAmount: number;
        };
        creditNote: { id: string; documentNumber: string; total: number };
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/customer-returns/confirm-document`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar la devolución";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success !== true) {
      return { success: false, message: "Respuesta inesperada al registrar la devolución" };
    }

    const originalSale = data.originalSale as Record<string, unknown> | undefined;
    const saleReturn = data.saleReturn as Record<string, unknown> | undefined;
    const creditNote = data.creditNote as Record<string, unknown> | undefined;

    if (
      originalSale?.id &&
      originalSale?.documentNumber &&
      saleReturn?.id &&
      saleReturn?.documentNumber &&
      creditNote?.id &&
      creditNote?.documentNumber
    ) {
      return {
        success: true,
        originalSale: {
          id: String(originalSale.id),
          documentNumber: String(originalSale.documentNumber),
        },
        saleReturn: {
          id: String(saleReturn.id),
          documentNumber: String(saleReturn.documentNumber),
          total: Number(saleReturn.total) || 0,
          subtotal: Number(saleReturn.subtotal) || 0,
          taxAmount: Number(saleReturn.taxAmount) || 0,
          discountAmount: Number(saleReturn.discountAmount) || 0,
        },
        creditNote: {
          id: String(creditNote.id),
          documentNumber: String(creditNote.documentNumber),
          total: Number(creditNote.total) || 0,
        },
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar la devolución" };
  }

  static async confirmCustomerReturnRefund(
    body: import("../lib/build-create-sale-return-payload").ConfirmCustomerReturnRefundApiBody,
  ): Promise<
    | {
        success: true;
        originalSale: { id: string; documentNumber: string };
        saleReturn: {
          id: string;
          documentNumber: string;
          total: number;
          subtotal: number;
          taxAmount: number;
          discountAmount: number;
        };
        creditNote: { id: string; documentNumber: string; total: number };
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/customer-returns/confirm-refund`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar el reembolso";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success !== true) {
      return { success: false, message: "Respuesta inesperada al registrar el reembolso" };
    }

    const originalSale = data.originalSale as Record<string, unknown> | undefined;
    const saleReturn = data.saleReturn as Record<string, unknown> | undefined;
    const creditNote = data.creditNote as Record<string, unknown> | undefined;

    if (
      originalSale?.id &&
      originalSale?.documentNumber &&
      saleReturn?.id &&
      saleReturn?.documentNumber &&
      creditNote?.id &&
      creditNote?.documentNumber
    ) {
      return {
        success: true,
        originalSale: {
          id: String(originalSale.id),
          documentNumber: String(originalSale.documentNumber),
        },
        saleReturn: {
          id: String(saleReturn.id),
          documentNumber: String(saleReturn.documentNumber),
          total: Number(saleReturn.total) || 0,
          subtotal: Number(saleReturn.subtotal) || 0,
          taxAmount: Number(saleReturn.taxAmount) || 0,
          discountAmount: Number(saleReturn.discountAmount) || 0,
        },
        creditNote: {
          id: String(creditNote.id),
          documentNumber: String(creditNote.documentNumber),
          total: Number(creditNote.total) || 0,
        },
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el reembolso" };
  }

  static async createBackorder(
    body: CreateBackorderApiBody,
  ): Promise<
    | { success: true; transaction: { id: string; documentNumber: string } }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(`${base}/api/cash-sessions/backorders`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "Error al registrar el encargo";
      return { success: false, message: msg, statusCode: res.status };
    }

    const tx = data?.transaction as { id?: string; documentNumber?: string } | undefined;
    if (data?.success === true && tx?.id && tx?.documentNumber) {
      return {
        success: true,
        transaction: { id: String(tx.id), documentNumber: String(tx.documentNumber) },
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el encargo" };
  }

  static async listMovements(cashSessionId: string): Promise<
    | { success: true; movements: CashSessionMovementRow[] }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(
      `${base}/api/cash-sessions/${encodeURIComponent(cashSessionId)}/movements`,
      {
        method: "GET",
        headers,
      },
    );
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    if (res.status === 404) {
      return { success: false, message: "Sesión de caja no encontrada", statusCode: 404 };
    }

    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      const rawMsg = obj.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof obj.error === "string"
              ? obj.error
              : res.statusText || "No se pudieron cargar los movimientos";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (!Array.isArray(data)) {
      return { success: false, message: "Respuesta inesperada del servidor" };
    }

    return { success: true, movements: data as CashSessionMovementRow[] };
  }

  static async listCashHubsForPointOfSale(pointOfSaleId: string): Promise<
    | { success: true; hubs: CashHubDepositCandidate[] }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const q = new URLSearchParams({ pointOfSaleId: pointOfSaleId.trim() });
    const res = await backendFetch(`${base}/api/cash-sessions/cash-hubs-by-pos?${q.toString()}`, {
      method: "GET",
      headers,
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.join(", ")
            : res.statusText || "No se pudieron cargar los centros de efectivo";
      return { success: false, message: msg, statusCode: res.status };
    }

    const hubs = Array.isArray(data?.hubs) ? (data.hubs as CashHubDepositCandidate[]) : [];
    return { success: true, hubs };
  }

  static async listCashHubsForDeposit(cashSessionId: string): Promise<
    | { success: true; hubs: CashHubDepositCandidate[] }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(
      `${base}/api/cash-sessions/${encodeURIComponent(cashSessionId)}/cash-hubs-for-deposit`,
      { method: "GET", headers },
    );
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "No se pudieron cargar los centros de acopio";
      return { success: false, message: msg, statusCode: res.status };
    }

    const hubs = data?.hubs;
    if (data?.success !== true || !Array.isArray(hubs)) {
      return { success: false, message: "Respuesta inesperada del servidor" };
    }

    return { success: true, hubs: hubs as CashHubDepositCandidate[] };
  }

  static async depositCashFromHub(
    cashSessionId: string,
    body: { cashHubId: string; amount: number; userId: string; reason?: string },
  ): Promise<
    | {
        success: true;
        transaction: { id: string; documentNumber: string; total: number };
        expectedAmount: number;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(
      `${base}/api/cash-sessions/${encodeURIComponent(cashSessionId)}/cash-deposits-from-hub`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          cashHubId: body.cashHubId,
          amount: body.amount,
          userId: body.userId,
          reason: body.reason?.trim() || undefined,
        }),
      },
    );
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "No se pudo registrar el ingreso";
      return { success: false, message: msg, statusCode: res.status };
    }

    const tx = data?.transaction as { id?: string; documentNumber?: string; total?: number } | undefined;
    if (data?.success === true && tx?.id && tx?.documentNumber != null) {
      return {
        success: true,
        transaction: {
          id: String(tx.id),
          documentNumber: String(tx.documentNumber),
          total: Number(tx.total ?? body.amount),
        },
        expectedAmount: Number(data?.expectedAmount ?? 0),
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el ingreso" };
  }

  static async getAvailableCashForSession(cashSessionId: string): Promise<
    | { success: true; availableCash: number }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(
      `${base}/api/cash-sessions/${encodeURIComponent(cashSessionId)}/available-cash`,
      { method: "GET", headers },
    );
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "No se pudo obtener el efectivo disponible";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success !== true || typeof data?.availableCash !== "number") {
      return { success: false, message: "Respuesta inesperada del servidor" };
    }

    return { success: true, availableCash: Number(data.availableCash) };
  }

  static async withdrawCashSessionToHub(
    cashSessionId: string,
    body: { cashHubId: string; amount: number; userId: string; reason?: string },
  ): Promise<
    | {
        success: true;
        transaction: { id: string; documentNumber: string; total: number };
        expectedAmount: number;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const res = await backendFetch(
      `${base}/api/cash-sessions/${encodeURIComponent(cashSessionId)}/cash-withdrawals-to-hub`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          cashHubId: body.cashHubId,
          amount: body.amount,
          userId: body.userId,
          reason: body.reason?.trim() || undefined,
        }),
      },
    );
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "No se pudo registrar el traslado";
      return { success: false, message: msg, statusCode: res.status };
    }

    const tx = data?.transaction as { id?: string; documentNumber?: string; total?: number } | undefined;
    if (data?.success === true && tx?.id && tx?.documentNumber != null) {
      return {
        success: true,
        transaction: {
          id: String(tx.id),
          documentNumber: String(tx.documentNumber),
          total: Number(tx.total ?? body.amount),
        },
        expectedAmount: Number(data?.expectedAmount ?? 0),
      };
    }

    return { success: false, message: "Respuesta inesperada al registrar el traslado" };
  }

  static async close(input: {
    cashSessionId: string;
    userId: string;
    notes?: string;
    cashHubId?: string;
    counted?: {
      cash: number;
      debitCard: number;
      creditCard: number;
      transfer: number;
      check: number;
      other: number;
    };
  }): Promise<
    | {
        success: true;
        message?: string;
        sessionId?: string;
        closingTransactionId?: string | null;
        hubTransferTransactionId?: string | null;
        expectedAmount?: number;
        salesTotal?: number;
        systemCashExpected?: number;
        usedBlindCount?: boolean;
        countedGrand?: number;
        counted?: Record<string, number>;
        difference?: number;
      }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const cashSessionId = typeof input.cashSessionId === "string" ? input.cashSessionId.trim() : "";
    const userId = typeof input.userId === "string" ? input.userId.trim() : "";
    if (!cashSessionId || !userId) {
      return { success: false, message: "Sesión o usuario no válidos" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const body: Record<string, unknown> = {
      sessionId: cashSessionId,
      userId,
      notes: input.notes?.trim() || undefined,
      cashHubId: input.cashHubId?.trim() || undefined,
    };
    if (input.counted) {
      body.counted = input.counted;
    }

    const res = await backendFetch(`${base}/api/cash-sessions/close`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const rawMsg = data?.message;
      const msg =
        typeof rawMsg === "string"
          ? rawMsg
          : Array.isArray(rawMsg)
            ? rawMsg.map(String).join(", ")
            : typeof data?.error === "string"
              ? data.error
              : res.statusText || "No se pudo cerrar la sesión de caja";
      return { success: false, message: msg, statusCode: res.status };
    }

    if (data?.success === true) {
      return data as {
        success: true;
        message?: string;
        sessionId?: string;
        closingTransactionId?: string | null;
        hubTransferTransactionId?: string | null;
        expectedAmount?: number;
        salesTotal?: number;
        systemCashExpected?: number;
        usedBlindCount?: boolean;
        countedGrand?: number;
        counted?: Record<string, number>;
        difference?: number;
      };
    }

    return { success: false, message: "Respuesta inesperada al cerrar sesión" };
  }
}

