import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PosCustomerSearchResponse } from "../types/pos-customer.types";
import type {
  CustomerCreditNoteUsageStatus,
  PosCustomerCreditNoteRow,
  PosCustomerDetail,
  PosCustomerDetailBundle,
  PosCustomerBackorderRow,
  PosCustomerInternalCreditDebt,
  PosCustomerOpenCreditRow,
  PosCustomerPaymentRow,
  PosCustomerPurchaseRow,
  PosCustomerQuotaRow,
  PosCustomerReturnRow,
  PosPagedList,
} from "../types/pos-customer-detail.types";
import type { PosCustomerDetailBundlePaging } from "../lib/pos-customer-detail-url";
import {
  emptyPosCustomerDetailBundlePaging,
  POS_CUSTOMER_DETAIL_LIST_DEFAULT_LIMIT,
} from "../lib/pos-customer-detail-url";
import type {
  PosCreateCustomerApiBody,
  PosCreateCustomerResult,
} from "../types/pos-customer-create.types";
import type { CustomerPaymentSourcesResponse } from "../types/customer-payment-sources.types";

export class CustomersPosRequest {
  static async search(input: {
    query?: string;
    page?: number;
    pageSize?: number;
    /** Excluye clientes inactivos (cobro POS). */
    activeOnly?: boolean;
  }): Promise<PosCustomerSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const qs = new URLSearchParams();
    if (input.query?.trim()) qs.set("query", input.query.trim());
    qs.set("page", String(Math.max(1, input.page ?? 1)));
    qs.set("pageSize", String(Math.min(50, Math.max(1, input.pageSize ?? 15))));
    if (input.activeOnly === true) qs.set("activeOnly", "true");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

      const res = await fetch(`${base}/api/customers/search?${qs.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? (data.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg) };
      }

      if (data?.success !== true || !Array.isArray(data?.customers)) {
        return { success: false, message: "Respuesta inválida del servidor" };
      }

      const customers = (data.customers as unknown[]).map((raw) => {
        const c = raw as Record<string, unknown>;
        return {
          customerId: String(c.customerId ?? ""),
          displayName: String(c.displayName ?? ""),
          documentNumber: c.documentNumber != null ? String(c.documentNumber) : null,
          phone: c.phone != null ? String(c.phone) : null,
          email: c.email != null ? String(c.email) : null,
        };
      });

      return {
        success: true,
        page: Number(data.page) || 1,
        pageSize: Number(data.pageSize) || 10,
        total: Number(data.total) || customers.length,
        customers,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  private static emptyInternalCreditDebt(): PosCustomerInternalCreditDebt {
    return {
      scheduled: { totalPending: 0, rows: [] },
      openCredit: { totalPending: 0, rows: [] },
    };
  }

  private static parseScheduledQuotaRow(row: Record<string, unknown>): PosCustomerQuotaRow {
    return {
      id: String(row.id ?? ""),
      transactionId: row.transactionId != null ? String(row.transactionId) : null,
      documentNumber: row.documentNumber != null ? String(row.documentNumber) : null,
      installmentNumber:
        row.installmentNumber != null && row.installmentNumber !== ""
          ? Number(row.installmentNumber)
          : null,
      totalInstallments:
        row.totalInstallments != null && row.totalInstallments !== ""
          ? Number(row.totalInstallments)
          : null,
      amount: Number(row.amount ?? 0),
      dueDate: row.dueDate != null ? String(row.dueDate) : null,
      status: row.status != null ? String(row.status) : null,
      createdAt: row.createdAt != null ? String(row.createdAt) : null,
    };
  }

  private static parseOpenCreditRow(row: Record<string, unknown>): PosCustomerOpenCreditRow {
    const modeRaw = String(row.mode ?? "")
      .trim()
      .toUpperCase();
    return {
      transactionId: String(row.transactionId ?? ""),
      documentNumber: row.documentNumber != null ? String(row.documentNumber) : null,
      saleDate: row.saleDate != null ? String(row.saleDate) : null,
      creditAmount: Number(row.creditAmount ?? 0),
      mode: modeRaw === "CREDIT_LUMP" ? "CREDIT_LUMP" : "UNKNOWN",
    };
  }

  private static parseInternalCreditDebtPayload(
    data: Record<string, unknown>,
  ): PosCustomerInternalCreditDebt {
    const scheduledRaw = data.scheduled;
    const openRaw = data.openCredit;
    const scheduledObj =
      scheduledRaw && typeof scheduledRaw === "object"
        ? (scheduledRaw as Record<string, unknown>)
        : {};
    const openObj =
      openRaw && typeof openRaw === "object" ? (openRaw as Record<string, unknown>) : {};

    const scheduledRows = Array.isArray(scheduledObj.rows)
      ? scheduledObj.rows.map((r) =>
          CustomersPosRequest.parseScheduledQuotaRow(r as Record<string, unknown>),
        )
      : [];
    const openRows = Array.isArray(openObj.rows)
      ? openObj.rows
          .map((r) => CustomersPosRequest.parseOpenCreditRow(r as Record<string, unknown>))
          .filter((r) => r.transactionId)
      : [];

    const scheduledTotal =
      scheduledObj.totalPending != null
        ? Number(scheduledObj.totalPending)
        : scheduledRows.reduce((a, r) => a + r.amount, 0);
    const openTotal =
      openObj.totalPending != null
        ? Number(openObj.totalPending)
        : openRows.reduce((a, r) => a + r.creditAmount, 0);

    return {
      scheduled: { totalPending: scheduledTotal, rows: scheduledRows },
      openCredit: { totalPending: openTotal, rows: openRows },
    };
  }

  private static parsePaymentsPayload(
    pData: Record<string, unknown>,
    fallback: { page: number; pageSize: number },
  ): PosPagedList<PosCustomerPaymentRow> {
    const raw = pData.payments;
    const arr = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as { payments?: unknown }).payments)
        ? ((raw as { payments: unknown[] }).payments)
        : [];
    const rows = arr.map((row) => {
      const p = row as Record<string, unknown>;
      const relatedSales: Array<{
        saleId: string;
        documentNumber: string;
        amount: number;
      }> = [];
      const rawRelated = p.relatedSales;
      if (Array.isArray(rawRelated)) {
        for (const item of rawRelated) {
          if (!item || typeof item !== "object") continue;
          const r = item as Record<string, unknown>;
          const saleId =
            typeof r.saleId === "string"
              ? r.saleId.trim()
              : typeof r.saleTransactionId === "string"
                ? r.saleTransactionId.trim()
                : "";
          if (!saleId) continue;
          relatedSales.push({
            saleId,
            documentNumber:
              typeof r.documentNumber === "string" && r.documentNumber.trim()
                ? r.documentNumber.trim()
                : "",
            amount: Math.round(Number(r.amount) || 0),
          });
        }
      }
      const relatedCreditNotes: Array<{
        creditNoteId: string;
        documentNumber: string;
        amount: number;
      }> = [];
      const rawNc = p.relatedCreditNotes;
      if (Array.isArray(rawNc)) {
        for (const item of rawNc) {
          if (!item || typeof item !== "object") continue;
          const r = item as Record<string, unknown>;
          const creditNoteId =
            typeof r.creditNoteId === "string" ? r.creditNoteId.trim() : "";
          if (!creditNoteId) continue;
          relatedCreditNotes.push({
            creditNoteId,
            documentNumber:
              typeof r.documentNumber === "string" && r.documentNumber.trim()
                ? r.documentNumber.trim()
                : "",
            amount: Math.round(Number(r.amount) || 0),
          });
        }
      }
      return {
        id: String(p.id ?? ""),
        documentNumber: p.documentNumber != null ? String(p.documentNumber) : null,
        type: p.type != null ? String(p.type) : null,
        status: p.status != null ? String(p.status) : null,
        total: Number(p.total ?? 0),
        paymentMethod: p.paymentMethod != null ? String(p.paymentMethod) : null,
        createdAt: p.createdAt != null ? String(p.createdAt) : "",
        relatedSales,
        relatedCreditNotes,
      };
    });
    return {
      rows,
      total: Number(pData.total ?? rows.length),
      page: Number(pData.page ?? fallback.page) || fallback.page,
      pageSize: Number(pData.pageSize ?? fallback.pageSize) || fallback.pageSize,
    };
  }

  private static parsePurchasesPayload(
    data: Record<string, unknown>,
    fallback: { page: number; pageSize: number },
  ): PosPagedList<PosCustomerPurchaseRow> {
    const nested =
      data.purchases &&
      typeof data.purchases === "object" &&
      !Array.isArray(data.purchases) &&
      Array.isArray((data.purchases as { purchases?: unknown }).purchases)
        ? (data.purchases as Record<string, unknown>)
        : null;
    const source = nested ?? data;
    const arr = Array.isArray(source.purchases)
      ? source.purchases
      : Array.isArray(data)
        ? (data as unknown[])
        : [];
    const rows = arr.map((row) => {
      const p = row as Record<string, unknown>;
      const total = Number(p.total ?? 0);
      const amountPaid = Number(p.amountPaid ?? 0);
      const balanceDue =
        Number.isFinite(Number(p.balanceDue)) && Number(p.balanceDue) >= 0
          ? Number(p.balanceDue)
          : Math.max(0, total - amountPaid);
      return {
        id: String(p.id ?? ""),
        documentNumber: p.documentNumber != null ? String(p.documentNumber) : null,
        transactionType: p.transactionType != null ? String(p.transactionType) : null,
        status: p.status != null ? String(p.status) : null,
        total,
        paymentMethod: p.paymentMethod != null ? String(p.paymentMethod) : null,
        paymentStatus: p.paymentStatus != null ? String(p.paymentStatus) : null,
        amountPaid,
        balanceDue,
        createdAt: p.createdAt != null ? String(p.createdAt) : "",
      };
    });
    return {
      rows,
      total: Number(source.total ?? data.total ?? rows.length),
      page: Number(source.page ?? data.page ?? fallback.page) || fallback.page,
      pageSize:
        Number(source.pageSize ?? data.pageSize ?? fallback.pageSize) || fallback.pageSize,
    };
  }

  private static parseBackordersPayload(
    data: unknown,
    fallback: { page: number; pageSize: number },
  ): PosPagedList<PosCustomerBackorderRow> {
    const body = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const arr = Array.isArray(body.data) ? body.data : Array.isArray(body.rows) ? body.rows : [];
    const rows = arr.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        documentNumber: r.documentNumber != null ? String(r.documentNumber) : null,
        status: r.status != null ? String(r.status) : null,
        total: Number(r.total ?? 0),
        createdAt: r.createdAt != null ? String(r.createdAt) : "",
      };
    });
    return {
      rows,
      total: Number(body.total ?? rows.length),
      page: Number(body.page ?? fallback.page) || fallback.page,
      pageSize: Number(body.limit ?? body.pageSize ?? fallback.pageSize) || fallback.pageSize,
    };
  }

  private static parseCreditNoteRow(raw: Record<string, unknown>): PosCustomerCreditNoteRow | null {
    const id = raw.id != null ? String(raw.id) : "";
    if (!id) return null;
    const usage = String(raw.usageStatus ?? "available");
    const usageStatus: CustomerCreditNoteUsageStatus =
      usage === "partially_used" || usage === "fully_used" ? usage : "available";
    return {
      id,
      documentNumber: String(raw.documentNumber ?? ""),
      total: Number(raw.total ?? 0),
      consumedAmount: Number(raw.consumedAmount ?? 0),
      availableAmount: Number(raw.availableAmount ?? 0),
      usageStatus,
      createdAt: String(raw.createdAt ?? ""),
      status: String(raw.status ?? ""),
    };
  }

  private static parseReturnsPayload(
    data: Record<string, unknown>,
    fallback: { page: number; pageSize: number },
  ): PosPagedList<PosCustomerReturnRow> {
    const arr = Array.isArray(data.returns) ? data.returns : [];
    const rows = arr
      .map((row) => {
        const r = row as Record<string, unknown>;
        const id = r.id != null ? String(r.id) : "";
        if (!id) return null;
        const ncRaw = r.linkedCreditNote;
        let linkedCreditNote: PosCustomerCreditNoteRow | null = null;
        if (ncRaw && typeof ncRaw === "object") {
          linkedCreditNote = CustomersPosRequest.parseCreditNoteRow(
            ncRaw as Record<string, unknown>,
          );
        }
        return {
          id,
          documentNumber: String(r.documentNumber ?? ""),
          total: Number(r.total ?? 0),
          status: String(r.status ?? ""),
          createdAt: String(r.createdAt ?? ""),
          refundMode: r.refundMode != null ? String(r.refundMode) : null,
          linkedCreditNote,
        };
      })
      .filter((x): x is PosCustomerReturnRow => x != null);
    return {
      rows,
      total: Number(data.total ?? rows.length),
      page: Number(data.page ?? fallback.page) || fallback.page,
      pageSize: Number(data.pageSize ?? fallback.pageSize) || fallback.pageSize,
    };
  }

  private static parseCreditNotesPayload(
    data: Record<string, unknown>,
    fallback: { page: number; pageSize: number },
  ): PosPagedList<PosCustomerCreditNoteRow> {
    const arr = Array.isArray(data.creditNotes) ? data.creditNotes : [];
    const rows = arr
      .map((row) =>
        CustomersPosRequest.parseCreditNoteRow(row as Record<string, unknown>),
      )
      .filter((x): x is PosCustomerCreditNoteRow => x != null);
    return {
      rows,
      total: Number(data.total ?? rows.length),
      page: Number(data.page ?? fallback.page) || fallback.page,
      pageSize: Number(data.pageSize ?? fallback.pageSize) || fallback.pageSize,
    };
  }

  private static emptyPaged<T>(
    fallback?: { page: number; pageSize: number },
  ): PosPagedList<T> {
    return {
      rows: [],
      total: 0,
      page: fallback?.page ?? 1,
      pageSize: fallback?.pageSize ?? POS_CUSTOMER_DETAIL_LIST_DEFAULT_LIMIT,
    };
  }

  static async getCustomerDetailBundle(
    customerId: string,
    pagingInput?: PosCustomerDetailBundlePaging,
  ): Promise<PosCustomerDetailBundle> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const id = customerId.trim();
    if (!id) {
      return { success: false, message: "Cliente no especificado" };
    }

    const paging = pagingInput ?? emptyPosCustomerDetailBundlePaging();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    const url = (path: string) => `${base}/api${path}`;
    const qs = (page: number, pageSize: number) =>
      `page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(String(pageSize))}&limit=${encodeURIComponent(String(pageSize))}`;

    try {
      const [cRes, pRes, debtRes, purRes, boRes, retRes, ncRes] = await Promise.all([
        fetch(url(`/customers/${encodeURIComponent(id)}`), { headers, cache: "no-store" }),
        fetch(
          url(
            `/customers/${encodeURIComponent(id)}/payments?${qs(paging.payments.page, paging.payments.pageSize)}`,
          ),
          { headers, cache: "no-store" },
        ),
        fetch(url(`/customers/${encodeURIComponent(id)}/internal-credit-debt`), {
          headers,
          cache: "no-store",
        }),
        fetch(
          url(
            `/customers/${encodeURIComponent(id)}/purchases?${qs(paging.purchases.page, paging.purchases.pageSize)}`,
          ),
          { headers, cache: "no-store" },
        ),
        fetch(
          url(
            `/transactions/backorders?customerId=${encodeURIComponent(id)}&${qs(paging.backorders.page, paging.backorders.pageSize)}`,
          ),
          { headers, cache: "no-store" },
        ),
        fetch(
          url(
            `/customers/${encodeURIComponent(id)}/customer-returns?${qs(paging.returns.page, paging.returns.pageSize)}`,
          ),
          { headers, cache: "no-store" },
        ),
        fetch(
          url(
            `/customers/${encodeURIComponent(id)}/customer-credit-notes?${qs(paging.creditNotes.page, paging.creditNotes.pageSize)}`,
          ),
          { headers, cache: "no-store" },
        ),
      ]);

      const cData = (await cRes.json().catch(() => ({}))) as Record<string, unknown>;
      const rawCustomer = cData.customer ?? cData;
      if (
        !cRes.ok ||
        !rawCustomer ||
        typeof rawCustomer !== "object" ||
        !(rawCustomer as Record<string, unknown>).customerId
      ) {
        const msg =
          (typeof cData?.message === "string" && cData.message) ||
          `No se pudo cargar el cliente (${cRes.status})`;
        return { success: false, message: String(msg) };
      }

      const raw = rawCustomer as Record<string, unknown>;
      const customer: PosCustomerDetail = {
        customerId: String(raw.customerId ?? id),
        personId: raw.personId != null ? String(raw.personId) : null,
        displayName: String(raw.displayName ?? ""),
        documentType: raw.documentType != null ? String(raw.documentType) : null,
        documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
        email: raw.email != null ? String(raw.email) : null,
        phone: raw.phone != null ? String(raw.phone) : null,
        address: raw.address != null ? String(raw.address) : null,
        creditLimit: Number(raw.creditLimit ?? 0),
        usedCredit: Number(raw.usedCredit ?? 0),
        availableCredit: Number(raw.availableCredit ?? 0),
        paymentDayOfMonth:
          raw.paymentDayOfMonth != null && raw.paymentDayOfMonth !== ""
            ? Number(raw.paymentDayOfMonth)
            : null,
        isActive: Boolean(raw.isActive),
        notes: raw.notes != null ? String(raw.notes) : null,
        createdAt: raw.createdAt != null ? String(raw.createdAt) : "",
        updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : "",
        personType: raw.personType != null ? String(raw.personType) : null,
        firstName: raw.firstName != null ? String(raw.firstName) : null,
        lastName: raw.lastName != null ? String(raw.lastName) : null,
        businessName: raw.businessName != null ? String(raw.businessName) : null,
      };

      const pData = (await pRes.json().catch(() => ({}))) as Record<string, unknown>;
      const payments = pRes.ok
        ? CustomersPosRequest.parsePaymentsPayload(pData, paging.payments)
        : CustomersPosRequest.emptyPaged<PosCustomerPaymentRow>(paging.payments);

      const debtData = (await debtRes.json().catch(() => ({}))) as Record<string, unknown>;
      const internalCreditDebt = debtRes.ok
        ? CustomersPosRequest.parseInternalCreditDebtPayload(debtData)
        : CustomersPosRequest.emptyInternalCreditDebt();
      const quotas = internalCreditDebt.scheduled.rows;

      const purData = (await purRes.json().catch(() => ({}))) as Record<string, unknown>;
      const purchases = purRes.ok
        ? CustomersPosRequest.parsePurchasesPayload(purData, paging.purchases)
        : CustomersPosRequest.emptyPaged<PosCustomerPurchaseRow>(paging.purchases);

      const boData = await boRes.json().catch(() => ({}));
      const backorders = boRes.ok
        ? CustomersPosRequest.parseBackordersPayload(boData, paging.backorders)
        : CustomersPosRequest.emptyPaged<PosCustomerBackorderRow>(paging.backorders);

      const retData = (await retRes.json().catch(() => ({}))) as Record<string, unknown>;
      const returns = retRes.ok
        ? CustomersPosRequest.parseReturnsPayload(retData, paging.returns)
        : CustomersPosRequest.emptyPaged<PosCustomerReturnRow>(paging.returns);

      const ncData = (await ncRes.json().catch(() => ({}))) as Record<string, unknown>;
      const creditNotes = ncRes.ok
        ? CustomersPosRequest.parseCreditNotesPayload(ncData, paging.creditNotes)
        : CustomersPosRequest.emptyPaged<PosCustomerCreditNoteRow>(paging.creditNotes);

      return {
        success: true,
        customer,
        payments,
        quotas,
        internalCreditDebt,
        purchases,
        backorders,
        returns,
        creditNotes,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async getBackorderDetail(input: {
    transactionId: string;
  }): Promise<
    | {
        success: true;
        transaction: {
          id: string;
          documentNumber: string | null;
          status: string | null;
          total: number;
          createdAt: string;
          lines: Array<{
            id: string;
            productName: string;
            variantName: string | null;
            quantity: number;
            unitOfMeasure: string | null;
          }>;
        };
      }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const id = input.transactionId?.trim();
    if (!id) {
      return { success: false, message: "Transacción inválida" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    try {
      const res = await fetch(`${base}/api/transactions/${encodeURIComponent(id)}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          (typeof json?.message === "string" && json.message) ||
          (Array.isArray(json?.message) ? (json.message as string[]).join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg) };
      }

      const linesRaw = (json as any)?.lines;
      const linesArr = Array.isArray(linesRaw) ? linesRaw : [];
      const lines = linesArr.map((l: any) => ({
        id: String(l?.id ?? ""),
        productName: String(l?.productName ?? l?.product?.name ?? "Ítem"),
        variantName:
          typeof l?.variantName === "string" && l.variantName.trim()
            ? l.variantName.trim()
            : typeof l?.productVariant?.sku === "string"
              ? null
              : null,
        quantity: Number(l?.quantity ?? 0),
        unitOfMeasure: l?.unitOfMeasure != null ? String(l.unitOfMeasure) : null,
      }));

      return {
        success: true,
        transaction: {
          id: String((json as any)?.id ?? id),
          documentNumber: (json as any)?.documentNumber != null ? String((json as any).documentNumber) : null,
          status: (json as any)?.status != null ? String((json as any).status) : null,
          total: Number((json as any)?.total ?? 0),
          createdAt: (json as any)?.createdAt != null ? String((json as any).createdAt) : "",
          lines,
        },
      };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Error de red" };
    }
  }

  static async getPosPaymentSources(customerId: string): Promise<CustomerPaymentSourcesResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const id = customerId.trim();
    if (!id) {
      return { success: false, message: "Cliente no especificado" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

    try {
      const res = await fetch(
        `${base}/api/customers/${encodeURIComponent(id)}/pos-payment-sources`,
        { headers, cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || data.success !== true) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          `No se pudieron cargar fuentes de pago (${res.status})`;
        return { success: false, message: String(msg) };
      }

      const mapCredit = (row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id ?? ""),
          documentNumber: String(r.documentNumber ?? ""),
          total: Number(r.total ?? 0),
          consumedAmount: Number(r.consumedAmount ?? 0),
          availableAmount: Number(r.availableAmount ?? 0),
          createdAt: String(r.createdAt ?? ""),
        };
      };
      const mapAdvance = (row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id ?? ""),
          documentNumber: String(r.documentNumber ?? ""),
          depositAmount: Number(r.depositAmount ?? 0),
          depositConsumedAmount: Number(r.depositConsumedAmount ?? 0),
          availableAmount: Number(r.availableAmount ?? 0),
          createdAt: String(r.createdAt ?? ""),
        };
      };

      return {
        success: true,
        creditNotes: Array.isArray(data.creditNotes)
          ? (data.creditNotes as unknown[]).map(mapCredit)
          : [],
        orderAdvances: Array.isArray(data.orderAdvances)
          ? (data.orderAdvances as unknown[]).map(mapAdvance)
          : [],
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }

  static async create(body: PosCreateCustomerApiBody): Promise<PosCreateCustomerResult> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
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

    try {
      const res = await fetch(`${base}/api/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          personType: body.personType,
          firstName: body.firstName.trim(),
          lastName: body.lastName?.trim() || undefined,
          businessName: body.businessName?.trim() || undefined,
          documentType: body.documentType,
          documentNumber: body.documentNumber.trim(),
          email: body.email?.trim() || undefined,
          phone: body.phone?.trim() || undefined,
          address: body.address?.trim() || undefined,
          creditLimit: body.creditLimit,
          paymentDayOfMonth: body.paymentDayOfMonth,
          notes: body.notes?.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string"
            ? m
            : "No se pudo crear el cliente";
        return { success: false, message: String(msg) };
      }
      const cust = data.customer as Record<string, unknown> | undefined;
      const id = cust?.customerId != null ? String(cust.customerId) : "";
      if (data.success === false || !id) {
        return {
          success: false,
          message: typeof data.error === "string" ? data.error : "No se pudo crear el cliente",
        };
      }
      return { success: true, customerId: id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}
