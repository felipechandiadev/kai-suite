import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { classifySaleLines } from "./classify-sale-lines";
import type { SaleDocumentKind } from "./types";

/**
 * Documento enviado al backend. Si el cajero eligió Boleta pero no hay líneas
 * tributarias, se normaliza a TICKET para no intentar emisión fiscal.
 */
export function resolveEffectiveSaleDocumentKind(
  selectedKind: SaleDocumentKind,
  cartLines: PosCartLine[],
): SaleDocumentKind {
  if (selectedKind !== "BOLETA") return selectedKind;
  const { dteLines } = classifySaleLines(cartLines);
  if (dteLines.length === 0) return "TICKET";
  return "BOLETA";
}

export function boletaReducedToTicketMessage(
  selectedKind: SaleDocumentKind,
  cartLines: PosCartLine[],
): string | null {
  if (selectedKind !== "BOLETA") return null;
  const { dteLines } = classifySaleLines(cartLines);
  if (dteLines.length > 0) return null;
  return "Sin ítems tributarios en el carrito. Se registrará como ticket interno (sin boleta SII).";
}
