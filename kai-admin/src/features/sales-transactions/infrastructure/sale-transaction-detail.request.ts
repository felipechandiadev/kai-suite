import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CustomerCreditNoteUsageStatus,
  LinkedCustomerCreditNoteDetail,
  PaymentSnapshotRow,
  SaleTransactionDetail,
  SaleTransactionDetailLine,
} from "../types/sale-transaction-detail.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function personDocument(
  entity: Record<string, unknown> | null | undefined,
): string | null {
  if (!entity || typeof entity !== "object") return null;
  const person = (entity as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  const doc =
    typeof person.documentNumber === "string" ? person.documentNumber.trim() : "";
  return doc || null;
}

function personName(
  entity: Record<string, unknown> | null | undefined,
): string | null {
  if (!entity || typeof entity !== "object") return null;
  const person = (entity as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  const first =
    typeof person.firstName === "string" ? person.firstName.trim() : "";
  const last =
    typeof person.lastName === "string" ? person.lastName.trim() : "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function normalizeLinkedCreditNote(
  raw: unknown,
): LinkedCustomerCreditNoteDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const usage = String(o.usageStatus ?? "available");
  const usageStatus: CustomerCreditNoteUsageStatus =
    usage === "partially_used" || usage === "fully_used" ? usage : "available";
  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : "",
    total: num(o.total),
    consumedAmount: num(o.consumedAmount),
    availableAmount: num(o.availableAmount),
    usageStatus,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : o.createdAt instanceof Date
          ? o.createdAt.toISOString()
          : "",
    status: typeof o.status === "string" ? o.status : "",
  };
}

function normalizePaymentSnapshots(
  meta: Record<string, unknown> | null,
): PaymentSnapshotRow[] {
  if (!meta) return [];
  const rawList =
    (Array.isArray(meta.payments) && meta.payments.length > 0
      ? meta.payments
      : null) ??
    (Array.isArray(meta.paymentSnapshots) && meta.paymentSnapshots.length > 0
      ? meta.paymentSnapshots
      : null) ??
    (Array.isArray(meta.paymentDetails) && meta.paymentDetails.length > 0
      ? meta.paymentDetails
      : null);
  if (!rawList) return [];

  return rawList
    .map((item): PaymentSnapshotRow | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const method = String(
        o.method ?? o.paymentMethod ?? "",
      ).trim();
      const amount = num(o.amount);
      if (!method || amount <= 0) return null;
      return {
        method,
        alias: typeof o.alias === "string" && o.alias.trim() ? o.alias.trim() : null,
        amount,
        reference:
          typeof o.reference === "string" && o.reference.trim()
            ? o.reference.trim()
            : null,
        bankAccountKey:
          typeof o.bankAccountKey === "string" && o.bankAccountKey.trim()
            ? o.bankAccountKey.trim()
            : typeof o.bankAccountId === "string" && o.bankAccountId.trim()
              ? o.bankAccountId.trim()
              : null,
        capturedAt:
          typeof o.capturedAt === "string" && o.capturedAt.trim()
            ? o.capturedAt.trim()
            : null,
      };
    })
    .filter((x): x is PaymentSnapshotRow => x != null);
}

function normalizeLine(raw: unknown): SaleTransactionDetailLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  return {
    id,
    productName:
      typeof o.productName === "string" && o.productName.trim()
        ? o.productName.trim()
        : "—",
    productSku:
      typeof o.productSku === "string" && o.productSku.trim()
        ? o.productSku.trim()
        : null,
    variantName:
      typeof o.variantName === "string" && o.variantName.trim()
        ? o.variantName.trim()
        : null,
    quantity: num(o.quantity),
    unitPrice: num(o.unitPrice),
    discountAmount: num(o.discountAmount),
    taxAmount: num(o.taxAmount),
    subtotal: num(o.subtotal),
    total: num(o.total),
    unitOfMeasure:
      typeof o.unitOfMeasure === "string" && o.unitOfMeasure.trim()
        ? o.unitOfMeasure.trim()
        : null,
  };
}

function normalizeDetail(raw: unknown): SaleTransactionDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;

  const linesRaw = o.lines;
  const linesArr = Array.isArray(linesRaw) ? linesRaw : [];
  const lines = linesArr
    .map(normalizeLine)
    .filter((x): x is SaleTransactionDetailLine => x != null);

  const branch = o.branch as Record<string, unknown> | undefined;
  const pos = o.pointOfSale as Record<string, unknown> | undefined;
  const user = o.user as Record<string, unknown> | undefined;
  const customer = o.customer as Record<string, unknown> | undefined;

  const customerLabel = personName(customer);

  const txType =
    typeof o.transactionType === "string" ? o.transactionType.trim() : "";
  const meta =
    o.metadata && typeof o.metadata === "object"
      ? (o.metadata as Record<string, unknown>)
      : null;
  const bo =
    meta?.backorder && typeof meta.backorder === "object"
      ? (meta.backorder as Record<string, unknown>)
      : null;
  const depositFromMeta = bo ? num(bo.depositAmount) : 0;
  const amountPaid = num(o.amountPaid);
  const total = num(o.total);
  const backorderDepositAmount =
    txType === "BACKORDER"
      ? depositFromMeta > 0
        ? depositFromMeta
        : amountPaid
      : null;
  const backorderDepositPercent =
    bo && Number.isFinite(Number(bo.depositPercent))
      ? Math.round(Number(bo.depositPercent))
      : null;
  const backorderReservationStatus =
    bo && typeof bo.reservationStatus === "string" && bo.reservationStatus.trim()
      ? bo.reservationStatus.trim()
      : null;
  const backorderPendingBalance =
    txType === "BACKORDER" && backorderDepositAmount != null
      ? Math.max(0, total - backorderDepositAmount)
      : null;

  const refundModeRaw =
    meta && typeof meta.refundMode === "string" ? meta.refundMode.trim() : "";
  const saleReturnRefundMode =
    txType === "SALE_RETURN" && refundModeRaw ? refundModeRaw : null;

  const linkedCustomerCreditNote = normalizeLinkedCreditNote(
    (o as { linkedCustomerCreditNote?: unknown }).linkedCustomerCreditNote,
  );

  const arCollectionAllocations: SaleTransactionDetail["arCollectionAllocations"] = [];
  if (meta && Array.isArray(meta.allocations)) {
    for (const row of meta.allocations) {
      if (!row || typeof row !== "object") continue;
      const a = row as Record<string, unknown>;
      const saleId = a.saleId != null ? String(a.saleId).trim() : "";
      if (!saleId) continue;
      arCollectionAllocations.push({
        saleId,
        documentNumber:
          a.documentNumber != null ? String(a.documentNumber) : "",
        amount: num(a.amount),
      });
    }
  }

  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : "",
    transactionType:
      typeof o.transactionType === "string" ? o.transactionType : "",
    createdAt:
      o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : typeof o.createdAt === "string"
          ? o.createdAt
          : "",
    status: typeof o.status === "string" ? o.status : "",
    subtotal: num(o.subtotal),
    taxAmount: num(o.taxAmount),
    discountAmount: num(o.discountAmount),
    total,
    paymentMethod:
      typeof o.paymentMethod === "string" ? o.paymentMethod : "",
    payments: normalizePaymentSnapshots(meta),
    amountPaid,
    changeAmount: o.changeAmount == null ? null : num(o.changeAmount),
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
    externalReference:
      typeof o.externalReference === "string" && o.externalReference.trim()
        ? o.externalReference.trim()
        : null,
    branchName:
      branch && typeof branch.name === "string" && branch.name.trim()
        ? branch.name.trim()
        : null,
    pointOfSaleName:
      pos && typeof pos.name === "string" && pos.name.trim()
        ? pos.name.trim()
        : null,
    userFullName: personName(user),
    userUserName:
      user && typeof user.userName === "string" && user.userName.trim()
        ? user.userName.trim()
        : null,
    customerLabel,
    customerDocument: personDocument(customer),
    lines,
    backorderDepositAmount,
    backorderDepositPercent,
    backorderReservationStatus,
    backorderPendingBalance,
    linkedCustomerCreditNote,
    saleReturnRefundMode,
    arCollectionAllocations,
  };
}

export class SaleTransactionDetailRequest {
  static async getById(
    transactionId: string,
  ): Promise<
    | { success: true; data: SaleTransactionDetail }
    | { success: false; error: string }
  > {
    const id = transactionId?.trim();
    if (!id) {
      return { success: false, error: "Transacción inválida" };
    }
    try {
      const res = await fetch(apiUrl(`transactions/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => (null));
      if (!res.ok) {
        const msg =
          body &&
          typeof body === "object" &&
          typeof (body as { message?: string }).message === "string"
            ? (body as { message: string }).message
            : res.statusText;
        return { success: false, error: msg || "No se pudo cargar la venta" };
      }
      const detail = normalizeDetail(body);
      if (!detail) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, data: detail };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar la venta",
      };
    }
  }
}
