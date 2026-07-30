import type { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';

/** Folio DTE enviado por el cliente (`dteNumber` o `metadata.dteNumber`). */
export function normalizeDteNumberFromBody(body: Record<string, unknown> | null | undefined): string {
  if (!body || typeof body !== 'object') {
    return '';
  }
  const direct = body['dteNumber'];
  const meta = body['metadata'] as Record<string, unknown> | undefined;
  const fromMeta = meta?.['dteNumber'];
  const v = direct ?? fromMeta;
  if (v == null) {
    return '';
  }
  const s = String(v).trim();
  return s;
}

export function applyDteNumberToSupplierDocumentDto(
  body: Record<string, unknown>,
  dto: CreateTransactionDto,
): void {
  const dteNumber = normalizeDteNumberFromBody(body);
  if (dteNumber) {
    dto.documentFolio = dteNumber;
  }
}
