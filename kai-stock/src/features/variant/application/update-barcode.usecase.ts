import { updateBarcodeInputSchema } from "../domain/update-barcode.entity";
import { VariantRequest } from "../infrastructure/variant.request";

export async function updateBarcodeUseCase(input: {
  variantId: string;
  barcode: string;
}): Promise<{ ok: true } | { ok: false; error: string; unauthorized?: boolean }> {
  const parsed = updateBarcodeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const res = await VariantRequest.updateBarcode(parsed.data.variantId, parsed.data.barcode);
  if (!res.success) {
    return { ok: false, error: res.error, unauthorized: res.unauthorized };
  }
  return { ok: true };
}
