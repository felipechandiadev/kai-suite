import { sumCaseTotals } from './set-be.constants';
import type { SaleBoletaDocument } from './sale-boleta.types';

export function parseTedMntTotal(tedXml: string): number | null {
  const match = tedXml.match(/<MNT>(\d+)<\/MNT>/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeSaleBoletaMntTotal(doc: SaleBoletaDocument): number {
  return sumCaseTotals(doc.lines).mntTotal;
}

/**
 * Rechaza adopción offline si el TED timbrado en cliente no coincide con las
 * líneas DTE efectivas resueltas en servidor (p. ej. Lucky excluido por BD).
 */
export function validateOfflineTedAgainstSaleContext(
  tedXml: string,
  saleDoc: SaleBoletaDocument,
): string | null {
  const tedMnt = parseTedMntTotal(tedXml);
  if (tedMnt == null) return null;

  const expectedMnt = computeSaleBoletaMntTotal(saleDoc);
  if (tedMnt !== expectedMnt) {
    return `Monto TED offline (${tedMnt}) no coincide con líneas DTE del servidor (${expectedMnt})`;
  }
  return null;
}
