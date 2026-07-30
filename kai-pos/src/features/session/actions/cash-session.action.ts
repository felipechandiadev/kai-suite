"use server";

import { FindMyOpenCashSessionUseCase } from "../application/find-my-open-cash-session.usecase";
import { ListOpenCashSessionsUseCase } from "../application/list-open-cash-sessions.usecase";
import { ValidatePosEntryUseCase } from "../application/validate-pos-entry.usecase";
import type { PosKind } from "../lib/pos-context-storage";

export async function findMyOpenCashSessionAction() {
  return FindMyOpenCashSessionUseCase.execute();
}

export async function listOpenCashSessionsAction() {
  return ListOpenCashSessionsUseCase.execute();
}

export async function validatePosEntryAction(input: {
  pointOfSaleId: string;
  cashSessionId?: string | null;
  posKind?: PosKind | null;
}) {
  return ValidatePosEntryUseCase.execute(input);
}

