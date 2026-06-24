export function getReceptionIdFromTransactionMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const meta = metadata as { origin?: unknown; receptionId?: unknown };
  const receptionId =
    typeof meta.receptionId === 'string' && meta.receptionId.trim()
      ? meta.receptionId.trim()
      : null;
  if (!receptionId) {
    return null;
  }
  const origin = typeof meta.origin === 'string' ? meta.origin.trim().toUpperCase() : '';
  if (origin && origin !== 'RECEPTION') {
    return null;
  }
  return receptionId;
}

type ReceptionLineLike = {
  id: string;
  lineNumber?: number;
  quantity?: number | string | null;
  receivedQuantity?: number | string | null;
};

type TransactionLineLike = {
  id?: string;
  lineNumber?: number;
};

function lineReceivedQty(line: ReceptionLineLike): number {
  return Number(line.receivedQuantity ?? line.quantity ?? 0) || 0;
}

function sortByLineNumber<T extends { lineNumber?: number }>(lines: T[]): T[] {
  return [...lines].sort(
    (a, b) => (Number(a.lineNumber) || 0) - (Number(b.lineNumber) || 0),
  );
}

/**
 * Empareja líneas de transacción PURCHASE con líneas de recepción (mismo orden al crear la compra).
 */
export function mapTransactionLineIdToReceptionLineId(
  receptionLines: ReceptionLineLike[],
  transactionLines: TransactionLineLike[],
): Map<string, string> {
  const result = new Map<string, string>();
  const activeReceptionLines = sortByLineNumber(receptionLines).filter(
    (line) => lineReceivedQty(line) > 0,
  );
  const activeTransactionLines = sortByLineNumber(transactionLines).filter((line) =>
    Boolean(line.id),
  );

  for (let i = 0; i < activeTransactionLines.length; i += 1) {
    const txLine = activeTransactionLines[i];
    const receptionLine = activeReceptionLines[i];
    const txLineId = typeof txLine.id === 'string' ? txLine.id.trim() : '';
    const receptionLineId =
      typeof receptionLine?.id === 'string' ? receptionLine.id.trim() : '';
    if (txLineId && receptionLineId) {
      result.set(txLineId, receptionLineId);
    }
  }

  return result;
}
