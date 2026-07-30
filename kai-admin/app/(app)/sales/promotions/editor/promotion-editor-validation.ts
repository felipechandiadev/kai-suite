import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";

/** Validación mínima antes de enviar al backend (independiente del paso activo). */
export function validatePromotionEditorInput(input: CreatePromotionInput): string | null {
  if (!input.name.trim()) {
    return "Indica un nombre para la promoción.";
  }
  if (input.type === "BUY_X_GET_Y") {
    const b = Number(input.buyQuantity);
    const g = Number(input.getQuantity);
    if (!Number.isFinite(b) || b < 1 || !Number.isFinite(g) || g < 1) {
      return "Para «Lleva X paga Y» indica cantidades válidas (mayores que cero).";
    }
  }
  if (input.activation === "CODE_ENTRY" && !String(input.redemptionCode ?? "").trim()) {
    return "Indica el código del cupón.";
  }
  return null;
}

/** Validación al pulsar «Siguiente» en un paso concreto del asistente. */
export function validatePromotionWizardStep(
  stepIndex: number,
  input: CreatePromotionInput,
): string | null {
  switch (stepIndex) {
    case 0:
      return null;
    case 1: {
      if (!input.name.trim()) {
        return "Indica un nombre para la promoción.";
      }
      if (input.type === "BUY_X_GET_Y") {
        const b = Number(input.buyQuantity);
        const g = Number(input.getQuantity);
        if (!Number.isFinite(b) || b < 1 || !Number.isFinite(g) || g < 1) {
          return "Para «Lleva X paga Y» indica cantidades válidas (mayores que cero).";
        }
      }
      return null;
    }
    case 2: {
      if (input.activation === "CODE_ENTRY" && !String(input.redemptionCode ?? "").trim()) {
        return "Indica el código del cupón.";
      }
      return null;
    }
    default:
      return null;
  }
}
