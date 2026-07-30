import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { buildCustomerCreditNoteLinkSummary } from '@modules/transactions/application/read-models/customer-credit-note-link.summary';
import type { CustomerCreditNoteLinkSummary } from '@modules/transactions/application/read-models/customer-credit-note-link.summary';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { relatedSalesFromPaymentIn } from '@modules/transactions/application/payment-in-allocations.util';

@QueryHandler(SearchTransactionsQuery)
export class SearchTransactionsQueryHandler implements IQueryHandler<SearchTransactionsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: SearchTransactionsQuery): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.transactionRepository.createQueryBuilder('tx');

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 25), 200);

    // Load relations
    qb.leftJoinAndSelect('tx.branch', 'branch');
    qb.leftJoinAndSelect('tx.user', 'user');
    qb.leftJoinAndSelect('user.person', 'person');
    qb.leftJoinAndSelect('tx.customer', 'customer');
    qb.leftJoinAndSelect('customer.person', 'customerPerson');
    qb.leftJoinAndSelect('tx.supplier', 'supplier');
    qb.leftJoinAndSelect('supplier.person', 'supplierPerson');
    qb.leftJoinAndSelect('tx.shareholder', 'shareholder');
    qb.leftJoinAndSelect('shareholder.person', 'shareholderPerson');
    qb.leftJoinAndSelect('tx.pointOfSale', 'pos');
    qb.leftJoinAndSelect('tx.cashSession', 'cashSession');
    qb.leftJoinAndSelect('tx.relatedTransaction', 'relatedTransaction');

    // Apply filters (lista tiene prioridad sobre type simple)
    const allowedTypes = new Set<string>(Object.values(TransactionType));
    const typeInList = (query.transactionTypes ?? []).filter((t) =>
      allowedTypes.has(t),
    );
    if (typeInList.length > 0) {
      qb.andWhere('tx.transactionType IN (:...typeInList)', { typeInList });
    } else if (query.type) {
      qb.andWhere('tx.transactionType = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.paymentMethod) {
      qb.andWhere('tx.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.branchId) {
      qb.andWhere('tx.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.pointOfSaleId) {
      qb.andWhere('tx.pointOfSaleId = :posId', { posId: query.pointOfSaleId });
    }

    if (query.customerId) {
      qb.andWhere('tx.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.supplierId) {
      qb.andWhere('tx.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }

    if (query.bankAccountKey) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('tx.bankAccountKey = :bankAccountKey', {
              bankAccountKey: query.bankAccountKey,
            })
            .orWhere(
              `(tx.bankAccountKey IS NULL AND tx.transactionType = :payInTreasuryType AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  COALESCE(
                    tx.metadata::jsonb->'payments',
                    tx.metadata::jsonb->'paymentSnapshots',
                    '[]'::jsonb
                  )
                ) AS p
                WHERE NULLIF(TRIM(COALESCE(p->>'bankAccountKey', p->>'bankAccountId')), '') = :bankAccountKey
                  AND UPPER(TRIM(COALESCE(p->>'method', ''))) IN ('TRANSFER', 'CHECK')
              ))`,
              {
                bankAccountKey: query.bankAccountKey,
                payInTreasuryType: TransactionType.PAYMENT_IN,
              },
            );
        }),
      );
    }

    if (query.cashHubId) {
      qb.andWhere('tx.cashHubId = :cashHubId', {
        cashHubId: query.cashHubId,
      });
    }

    // Date filtering
    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom });
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      qb.andWhere('tx.createdAt <= :dateTo', { dateTo });
    }

    // Text search
    if (query.search) {
      qb.andWhere(
        '(tx.documentNumber LIKE :search OR tx.externalReference LIKE :search OR tx.documentFolio LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply pagination
    qb.skip((page - 1) * limit).take(limit);

    // Order by creation date descending
    qb.orderBy('tx.createdAt', 'DESC');

    const results = await qb.getMany();

    const paymentsBySaleId = await this.loadRelatedSalePayments(results);
    const creditNotesByReturnId =
      await this.loadLinkedCreditNotesForSaleReturns(results);

    return {
      data: results.map((tx) =>
        this.toApiListRow(tx, paymentsBySaleId, creditNotesByReturnId),
      ),
      total,
      page,
      limit,
    };
  }

  /** NC (`CUSTOMER_CREDIT_NOTE`) emitida por cada `SALE_RETURN` del listado. */
  private async loadLinkedCreditNotesForSaleReturns(
    results: Transaction[],
  ): Promise<Map<string, CustomerCreditNoteLinkSummary>> {
    const returnIds = results
      .filter((t) => t.transactionType === TransactionType.SALE_RETURN)
      .map((t) => t.id)
      .filter((id) => Boolean(id?.trim()));
    const byReturnId = new Map<string, CustomerCreditNoteLinkSummary>();
    if (returnIds.length === 0) return byReturnId;

    const creditNotes = await this.transactionRepository.find({
      where: {
        relatedTransactionId: In(returnIds),
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
      },
      order: { createdAt: 'DESC' },
    });

    for (const nc of creditNotes) {
      const returnId = nc.relatedTransactionId?.trim();
      if (!returnId || byReturnId.has(returnId)) continue;
      byReturnId.set(returnId, buildCustomerCreditNoteLinkSummary(nc));
    }
    return byReturnId;
  }

  /**
   * Cobros PAYMENT_IN vinculados a ventas del listado.
   * Enlace por `relatedTransactionId`, `metadata.saleTransactionId` (POS)
   * o cualquier fila en `metadata.allocations[]` (cobro AR multi-venta).
   */
  private async loadRelatedSalePayments(
    results: Transaction[],
  ): Promise<Map<string, { id: string; documentNumber: string }[]>> {
    const saleRows = results.filter(
      (t) => t.transactionType === TransactionType.SALE,
    );
    const saleIds = saleRows.map((t) => t.id);
    const bySaleId = new Map<string, { id: string; documentNumber: string }[]>();
    if (saleIds.length === 0) return bySaleId;

    const companyIds = [
      ...new Set(
        saleRows
          .map((t) => t.companyId)
          .filter((id): id is string => Boolean(id?.trim())),
      ),
    ];

    const payQb = this.transactionRepository
      .createQueryBuilder('pay')
      .select([
        'pay.id',
        'pay.documentNumber',
        'pay.relatedTransactionId',
        'pay.metadata',
        'pay.createdAt',
      ])
      .where('pay.transactionType = :payIn', {
        payIn: TransactionType.PAYMENT_IN,
      })
      .andWhere(
        new Brackets((sub) => {
          sub
            .where('pay.relatedTransactionId IN (:...saleIds)', { saleIds })
            .orWhere(
              `pay.metadata->>'saleTransactionId' IN (:...saleIds)`,
              { saleIds },
            )
            .orWhere(
              `EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  COALESCE(pay.metadata::jsonb->'allocations', '[]'::jsonb)
                ) AS alloc
                WHERE alloc->>'saleId' IN (:...saleIds)
              )`,
              { saleIds },
            );
        }),
      )
      .orderBy('pay.createdAt', 'ASC');

    if (companyIds.length > 0) {
      payQb.andWhere('pay.companyId IN (:...companyIds)', { companyIds });
    }

    const payments = await payQb.getMany();

    const pushFolio = (saleId: string, id: string, documentNumber: string) => {
      if (!saleId.trim()) return;
      const folio = documentNumber?.trim() || '—';
      const list = bySaleId.get(saleId) ?? [];
      if (list.some((x) => x.id === id)) return;
      list.push({ id, documentNumber: folio });
      bySaleId.set(saleId, list);
    };

    for (const p of payments) {
      const relatedSales = relatedSalesFromPaymentIn({
        relatedTransactionId: p.relatedTransactionId,
        metadata: (p.metadata ?? {}) as Record<string, unknown>,
      });
      if (relatedSales.length > 0) {
        for (const rs of relatedSales) {
          pushFolio(
            rs.saleId,
            p.id,
            (rs.documentNumber?.trim() || p.documentNumber) ?? '',
          );
        }
        continue;
      }
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const metaSaleId =
        typeof meta.saleTransactionId === 'string'
          ? meta.saleTransactionId.trim()
          : '';
      const saleId = (p.relatedTransactionId?.trim() || metaSaleId) ?? '';
      pushFolio(saleId, p.id, p.documentNumber ?? '');
    }

    return bySaleId;
  }

  /** Serializa la fila incluyendo `relatedSalePayments` (no es columna TypeORM). */
  private toApiListRow(
    tx: Transaction,
    paymentsBySaleId: Map<string, { id: string; documentNumber: string }[]>,
    creditNotesByReturnId: Map<string, CustomerCreditNoteLinkSummary>,
  ): Record<string, unknown> {
    const relatedSalePayments =
      tx.transactionType === TransactionType.SALE
        ? (paymentsBySaleId.get(tx.id) ?? [])
        : [];

    let row: Record<string, unknown>;
    try {
      row = JSON.parse(
        JSON.stringify(tx, (_key, value) =>
          value instanceof Date ? value.toISOString() : value,
        ),
      ) as Record<string, unknown>;
    } catch {
      row = { ...(tx as unknown as Record<string, unknown>) };
    }

    if (tx.transactionType === TransactionType.SALE) {
      row.relatedSalePayments = relatedSalePayments;
    }
    if (tx.transactionType === TransactionType.PAYMENT_IN) {
      row.relatedSales = relatedSalesFromPaymentIn({
        relatedTransactionId: tx.relatedTransactionId,
        documentNumber: tx.documentNumber,
        metadata: (tx.metadata ?? {}) as Record<string, unknown>,
        relatedTransaction: (tx as { relatedTransaction?: unknown })
          .relatedTransaction as {
          id?: string;
          documentNumber?: string;
          transactionType?: string;
        } | null,
      });
    }
    if (tx.transactionType === TransactionType.SALE_RETURN) {
      row.linkedCreditNote = creditNotesByReturnId.get(tx.id) ?? null;
    }
    return row;
  }
}
