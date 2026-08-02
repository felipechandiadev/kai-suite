"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { KaifoodTipsRequest } from "../infrastructure/kaifood-tips.request";
import type { CompanyTipSettings } from "../types/company-tips.types";

function fail(message: string) {
  return { success: false as const, message };
}

export async function getCompanyTipSettingsAction(companyId?: string) {
  try {
    const session = await getServerSession(authOptions);
    const id =
      companyId?.trim() ||
      ((session?.user as { activeCompanyId?: string })?.activeCompanyId ?? "");
    if (!id) return fail("Empresa no disponible");
    const res = await KaifoodTipsRequest.get(id);
    if (!res.success) return fail(res.error);
    return { success: true as const, tipSettings: res.tipSettings };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error tip-settings");
  }
}

export async function replaceCompanyTipSettingsAction(
  companyId: string,
  tipSettings: CompanyTipSettings,
) {
  try {
    const res = await KaifoodTipsRequest.replace(companyId, tipSettings);
    if (!res.success) return fail(res.error);
    revalidatePath("/kaifood/configuracion", "page");
    revalidatePath("/kaifood/propinas", "layout");
    return { success: true as const, tipSettings: res.tipSettings };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al guardar propinas");
  }
}

export async function listTipLedgerAction(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}) {
  try {
    const data = await KaifoodTipsRequest.listLedger(params);
    return { success: true as const, data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error ledger");
  }
}

export async function getTipSummaryAction(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const data = await KaifoodTipsRequest.summary(params);
    if (!data) return fail("No se pudo cargar el resumen");
    return { success: true as const, data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error resumen");
  }
}

export async function getTipOverdueAction() {
  try {
    const data = await KaifoodTipsRequest.overdue();
    if (!data) return fail("No se pudo cargar vencidos");
    return { success: true as const, data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error vencidos");
  }
}

export async function getTipBalancesAction() {
  try {
    const data = await KaifoodTipsRequest.balances();
    if (!data) return fail("No se pudieron cargar saldos");
    return { success: true as const, data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error saldos");
  }
}

export async function attributeTipsAction(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const res = await KaifoodTipsRequest.attribute(params);
    if (!res.success) return fail(res.error);
    revalidatePath("/kaifood/propinas", "layout");
    return { success: true as const, data: res.data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error atribución");
  }
}

export async function createTipPayoutAction(body: {
  lines: Array<{ employeeId: string; amount?: number }>;
  paymentMethod?: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  cashHubId?: string | null;
  notes?: string | null;
}) {
  try {
    const res = await KaifoodTipsRequest.payout(body);
    if (!res.success) return fail(res.error);
    revalidatePath("/kaifood/propinas", "layout");
    return { success: true as const, data: res.data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error pago propinas");
  }
}
