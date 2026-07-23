"use server";

import { SignalsRequest } from "../infrastructure/signals.request";
import type { SignalEvidenceDto, SignalsBoard } from "../types/signal.types";

export async function getSignalsBoardAction(opts?: {
  branchId?: string;
}): Promise<SignalsBoard> {
  return SignalsRequest.getBoard(opts);
}

export async function getSignalEvidenceAction(input: {
  signalId: string;
  branchId?: string;
}): Promise<
  { success: true; data: SignalEvidenceDto } | { success: false; error: string }
> {
  const signalId = input.signalId?.trim() ?? "";
  if (!signalId) {
    return { success: false, error: "Señal no válida." };
  }
  try {
    const data = await SignalsRequest.getEvidence(signalId, {
      branchId: input.branchId,
    });
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al cargar la evidencia",
    };
  }
}
