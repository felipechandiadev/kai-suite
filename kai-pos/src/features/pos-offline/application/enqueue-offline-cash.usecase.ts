import {
  enqueueOfflineCommand,
  getLastCommandIdForCashSession,
} from "./enqueue-command.usecase";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export async function enqueueOfflineCashMovement(input: {
  direction: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  reason?: string;
}) {
  const ctx = readPosContextClient();
  if (!ctx?.cashSessionId || !ctx.pointOfSaleId) {
    throw new Error("Sin sesión de caja activa");
  }
  return enqueueOfflineCommand({
    commandType: "CASH_MOVEMENT",
    payload: {
      pointOfSaleId: ctx.pointOfSaleId,
      cashSessionId: ctx.cashSessionId,
      direction: input.direction,
      amount: input.amount,
      reason: input.reason ?? null,
    },
  });
}

export async function enqueueOfflineHubDeposit(input: {
  cashHubId: string;
  amount: number;
  reason?: string;
}) {
  const ctx = readPosContextClient();
  if (!ctx?.cashSessionId || !ctx.pointOfSaleId) {
    throw new Error("Sin sesión de caja activa");
  }
  return enqueueOfflineCommand({
    commandType: "HUB_DEPOSIT",
    payload: {
      pointOfSaleId: ctx.pointOfSaleId,
      cashSessionId: ctx.cashSessionId,
      cashHubId: input.cashHubId,
      amount: input.amount,
      reason: input.reason ?? null,
    },
  });
}

export async function enqueueOfflineHubWithdrawal(input: {
  cashHubId: string;
  amount: number;
  reason?: string;
}) {
  const ctx = readPosContextClient();
  if (!ctx?.cashSessionId || !ctx.pointOfSaleId) {
    throw new Error("Sin sesión de caja activa");
  }
  return enqueueOfflineCommand({
    commandType: "HUB_WITHDRAWAL",
    payload: {
      pointOfSaleId: ctx.pointOfSaleId,
      cashSessionId: ctx.cashSessionId,
      cashHubId: input.cashHubId,
      amount: input.amount,
      reason: input.reason ?? null,
    },
  });
}

export async function enqueueOfflineCloseSession(input: {
  cashHubId?: string;
  notes?: string;
  counted?: Record<string, number>;
  dependsOnLastCommand?: boolean;
}) {
  const ctx = readPosContextClient();
  if (!ctx?.cashSessionId || !ctx.pointOfSaleId) {
    throw new Error("Sin sesión de caja activa");
  }
  let dependsOn: string | null = null;
  if (input.dependsOnLastCommand !== false) {
    dependsOn = await getLastCommandIdForCashSession(ctx.cashSessionId);
  }

  return enqueueOfflineCommand({
    commandType: "CLOSE_SESSION",
    payload: {
      pointOfSaleId: ctx.pointOfSaleId,
      cashSessionId: ctx.cashSessionId,
      cashHubId: input.cashHubId ?? null,
      notes: input.notes ?? null,
      counted: input.counted ?? null,
    },
    dependsOn,
  });
}
