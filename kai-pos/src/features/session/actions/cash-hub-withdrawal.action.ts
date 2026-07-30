"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export async function getAvailableCashForSessionAction(cashSessionId: string) {
  const id = typeof cashSessionId === "string" ? cashSessionId.trim() : "";
  if (!id) {
    return { success: false as const, message: "Sesión de caja no especificada" };
  }
  return CashSessionsRequest.getAvailableCashForSession(id);
}

export async function withdrawCashSessionToHubAction(input: {
  cashSessionId: string;
  cashHubId: string;
  amount: number;
  reason?: string;
}) {
  const cashSessionId =
    typeof input.cashSessionId === "string" ? input.cashSessionId.trim() : "";
  const cashHubId = typeof input.cashHubId === "string" ? input.cashHubId.trim() : "";
  if (!cashSessionId || !cashHubId) {
    return { success: false as const, message: "Datos incompletos" };
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { success: false as const, message: "Monto inválido" };
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false as const, message: "No autenticado" };
  }

  return CashSessionsRequest.withdrawCashSessionToHub(cashSessionId, {
    cashHubId,
    amount,
    userId,
    reason: input.reason,
  });
}
