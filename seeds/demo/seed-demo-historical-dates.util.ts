import type { INestApplicationContext } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { AccountingPeriodsService } from '@modules/accounting-periods/application/accounting-periods.service';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
/** Fecha ISO (YYYY-MM-DD) relativa a hoy. */
export function seedHistoricalDateFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function toHistoricalTimestamp(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

/** Parchea createdAt / período contable / asientos tras crear vía servicios (occurredOn solo en metadata). */
export async function patchTransactionHistoricalDate(
  app: INestApplicationContext,
  dataSource: DataSource,
  opts: {
    companyId: string;
    transactionId: string;
    occurredOn: string;
    receptionId?: string | null;
  },
): Promise<void> {
  const occurredAt = toHistoricalTimestamp(opts.occurredOn);
  const accountingPeriods = app.get(AccountingPeriodsService);
  const period = await accountingPeriods.ensurePeriod(opts.occurredOn, opts.companyId);

  const txRepo = dataSource.getRepository(Transaction);
  const tx = await txRepo.findOne({ where: { id: opts.transactionId } });
  if (tx) {
    const metadata =
      tx.metadata && typeof tx.metadata === 'object'
        ? { ...(tx.metadata as Record<string, unknown>) }
        : {};
    metadata.occurredOn = opts.occurredOn;
    await txRepo.update(opts.transactionId, {
      createdAt: occurredAt,
      accountingPeriodId: period.id,
      metadata,
    } as Record<string, unknown>);
  }

  await dataSource.getRepository(LedgerEntry).update(
    { transactionId: opts.transactionId },
    { entryDate: occurredAt },
  );

  if (opts.receptionId) {
    await dataSource.getRepository(Reception).update(opts.receptionId, {
      createdAt: occurredAt,
      updatedAt: occurredAt,
    } as Record<string, unknown>);
  }
}

/** Parchea factura proveedor y cuotas/pagos vinculados a una recepción seed. */
export async function patchReceptionFiscalHistoricalDates(
  app: INestApplicationContext,
  dataSource: DataSource,
  opts: {
    companyId: string;
    receptionId: string;
    occurredOn: string;
  },
): Promise<{ fiscalDocId: string | null; paymentCount: number }> {
  const txRepo = dataSource.getRepository(Transaction);
  const fiscalDoc = await txRepo
    .createQueryBuilder('tx')
    .where('tx.transactionType IN (:...types)', {
      types: [TransactionType.SUPPLIER_INVOICE, TransactionType.SUPPLIER_RECEIPT],
    })
    .andWhere(`(tx.metadata::jsonb #>> '{links,receptionId}') = :receptionId`, {
      receptionId: opts.receptionId,
    })
    .orderBy('tx.createdAt', 'DESC')
    .getOne();

  if (!fiscalDoc?.id) {
    return { fiscalDocId: null, paymentCount: 0 };
  }

  await patchTransactionHistoricalDate(app, dataSource, {
    companyId: opts.companyId,
    transactionId: fiscalDoc.id,
    occurredOn: opts.occurredOn,
  });

  const paymentRows = await txRepo.find({
    where: {
      relatedTransactionId: fiscalDoc.id,
      transactionType: TransactionType.SUPPLIER_PAYMENT,
    },
    order: { createdAt: 'ASC' },
  });

  for (const payment of paymentRows) {
    const dueRaw = payment.paymentDueDate
      ? payment.paymentDueDate.toISOString().slice(0, 10)
      : opts.occurredOn;
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId: opts.companyId,
      transactionId: payment.id,
      occurredOn: dueRaw,
    });
  }

  return { fiscalDocId: fiscalDoc.id, paymentCount: paymentRows.length };
}
