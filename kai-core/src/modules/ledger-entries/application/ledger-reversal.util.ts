import { EntityManager } from 'typeorm';
import { LedgerEntry } from '../domain/ledger-entry.entity';

/** Origen de las transacciones generadas al anular una recepción: no generan asientos por regla. */
export const RECEPTION_VOID_ORIGIN = 'RECEPTION_VOID';
/** Anulación de venta: los asientos se espejan; el reingreso de stock no genera asiento propio. */
export const SALE_VOID_ORIGIN = 'SALE_VOID';
/** Orígenes cuyas transacciones no pasan por las reglas genéricas del motor. */
export const LEDGER_SKIP_ORIGINS: string[] = [RECEPTION_VOID_ORIGIN, SALE_VOID_ORIGIN];

/**
 * Reverso exacto: copia los asientos ya contabilizados de `originalTransactionId`
 * con debe/haber invertidos, ligados a `reversalTransactionId`. El original no se toca.
 * Idempotente por transacción de reverso (borra y recrea sus propios asientos).
 */
export async function reverseLedgerEntries(
  manager: EntityManager,
  opts: {
    originalTransactionId: string;
    reversalTransactionId: string;
    reason: string;
    entryDate?: Date;
  },
): Promise<LedgerEntry[]> {
  const repo = manager.getRepository(LedgerEntry);
  const originals = await repo.find({
    where: { transactionId: opts.originalTransactionId },
  });
  await repo.delete({ transactionId: opts.reversalTransactionId });
  if (originals.length === 0) {
    return [];
  }
  const entryDate = opts.entryDate ?? new Date();
  const reversed = originals.map((e) =>
    repo.create({
      companyId: e.companyId,
      transactionId: opts.reversalTransactionId,
      accountId: e.accountId,
      personId: e.personId ?? null,
      entryDate,
      description: `Anulación: ${e.description}`.slice(0, 255),
      debit: Number(e.credit) || 0,
      credit: Number(e.debit) || 0,
      metadata: {
        ...(e.metadata ?? {}),
        reversalOf: e.id,
        reversalOfTransactionId: opts.originalTransactionId,
        reason: opts.reason,
      },
    }),
  );
  return repo.save(reversed);
}
