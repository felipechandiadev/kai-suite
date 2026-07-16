import { QuotationsService } from '@modules/quotations/application/quotations.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

describe('QuotationsService.toRow / effectiveStatus', () => {
  function makeService() {
    return new QuotationsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  function buildTx(
    overrides: Partial<Transaction> & { validUntil?: string } = {},
  ): Transaction {
    const validUntil =
      overrides.validUntil ?? new Date(Date.now() + 86400000).toISOString();
    return {
      id: 't-1',
      companyId: 'co',
      documentNumber: 'COT2600001',
      transactionType: TransactionType.QUOTATION,
      status: TransactionStatus.CONFIRMED,
      total: 1000,
      subtotal: 1000,
      taxAmount: 0,
      discountAmount: 0,
      branchId: 'br',
      pointOfSaleId: null,
      customerId: null,
      notes: null,
      createdAt: new Date(),
      metadata: {
        quotation: {
          issuedAt: new Date().toISOString(),
          validUntil,
          validityDays: 1,
        },
      },
      ...overrides,
    } as Transaction;
  }

  it('ACTIVE when CONFIRMED and validUntil >= now', () => {
    const row = makeService().toRow(buildTx());
    expect(row.effectiveStatus).toBe('ACTIVE');
  });

  it('EXPIRED when CONFIRMED but validUntil < now (derivado al vuelo)', () => {
    const row = makeService().toRow(
      buildTx({ validUntil: new Date(Date.now() - 86400000).toISOString() }),
    );
    expect(row.effectiveStatus).toBe('EXPIRED');
  });

  it('EXPIRED when status materialized as EXPIRED', () => {
    const row = makeService().toRow(
      buildTx({ status: TransactionStatus.EXPIRED }),
    );
    expect(row.effectiveStatus).toBe('EXPIRED');
  });

  it('CONVERTED when COMPLETED', () => {
    const row = makeService().toRow(
      buildTx({ status: TransactionStatus.COMPLETED }),
    );
    expect(row.effectiveStatus).toBe('CONVERTED');
  });

  it('CANCELLED when CANCELLED', () => {
    const row = makeService().toRow(
      buildTx({ status: TransactionStatus.CANCELLED }),
    );
    expect(row.effectiveStatus).toBe('CANCELLED');
  });
});
