import { ReceptionRequest } from "../infrastructure/reception.request";
import type { VoidReceptionResult } from "../types/reception.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function voidReceptionUseCase(input: {
  receptionId: string;
  reason: string;
  acknowledgePmpNotRestored?: boolean;
}): Promise<VoidReceptionResult> {
  const receptionId = input.receptionId.trim();
  const reason = input.reason.trim();
  if (!UUID_RE.test(receptionId)) {
    return { success: false, error: "Recepción inválida." };
  }
  if (reason.length < 3) {
    return { success: false, error: "Indique un motivo de anulación (mín. 3 caracteres)." };
  }
  try {
    const { warnings } = await ReceptionRequest.voidReception(
      receptionId,
      reason,
      input.acknowledgePmpNotRestored === true,
    );
    return { success: true, warnings };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo anular la recepción.",
    };
  }
}
