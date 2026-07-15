import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import {
  readCreditNoteAvailableAmount,
  readCreditNoteConsumedAmount,
  type TransactionCustomerCreditNoteMetadata,
} from '@modules/transactions/domain/transaction-customer-credit-note.metadata';
import type { TransactionBackorderMetadata } from '@modules/transactions/domain/transaction-backorder.metadata';
import {
  buildCustomerCreditNoteLinkSummary,
  type CustomerCreditNoteLinkSummary,
} from '@modules/transactions/application/read-models/customer-credit-note-link.summary';
import { normalizeCustomerListPage } from './customer-list-pagination.util';

export type CustomerReturnRow = {
  id: string;
  documentNumber: string;
  total: number;
  status: string;
  createdAt: string;
  refundMode: string | null;
  linkedCreditNote: CustomerCreditNoteLinkSummary | null;
};

export type CustomerCreditNoteSourceRow = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  createdAt: string;
};

export type CustomerOrderAdvanceSourceRow = {
  id: string;
  documentNumber: string;
  depositAmount: number;
  depositConsumedAmount: number;
  availableAmount: number;
  createdAt: string;
};

export type CustomerPaymentSourcesPayload = {
  creditNotes: CustomerCreditNoteSourceRow[];
  orderAdvances: CustomerOrderAdvanceSourceRow[];
};

type PaymentToApply = {
  paymentMethod: string;
  amount: number;
  creditNoteTransactionId?: string;
  backorderTransactionId?: string;
};

@Injectable()
export class CustomerPaymentSourcesService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async listForCustomer(customerId: string): Promise<CustomerPaymentSourcesPayload> {
    const cid = customerId?.trim();
    if (!cid) {
      throw new BadRequestException('customerId es obligatorio');
    }

    const [creditNoteTxs, backorderTxs] = await Promise.all([
      this.txRepo.find({
        where: {
          customerId: cid,
          transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
          status: TransactionStatus.CONFIRMED,
        },
        order: { createdAt: 'DESC' },
      }),
      this.txRepo.find({
        where: {
          customerId: cid,
          transactionType: TransactionType.BACKORDER,
          status: TransactionStatus.CONFIRMED,
        },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const creditNotes: CustomerCreditNoteSourceRow[] = [];
    for (const tx of creditNoteTxs) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const available = readCreditNoteAvailableAmount(Number(tx.total), meta);
      if (available < 0.01) continue;
      creditNotes.push({
        id: tx.id,
        documentNumber: String(tx.documentNumber ?? tx.documentFolio ?? tx.id),
        total: Math.round(Number(tx.total) || 0),
        consumedAmount: readCreditNoteConsumedAmount(meta),
        availableAmount: available,
        createdAt: tx.createdAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }

    const orderAdvances: CustomerOrderAdvanceSourceRow[] = [];
    for (const tx of backorderTxs) {
      const bo = (tx.metadata?.backorder ?? {}) as TransactionBackorderMetadata;
      const status = String(bo.reservationStatus ?? 'OPEN').toUpperCase();
      if (status !== 'OPEN') continue;
      const deposit = Math.round(Number(bo.depositAmount ?? tx.total) || 0);
      const consumed = Math.round(Number(bo.depositConsumedAmount ?? 0) || 0);
      const available = Math.max(0, deposit - consumed);
      if (available < 0.01) continue;
      orderAdvances.push({
        id: tx.id,
        documentNumber: String(tx.documentNumber ?? tx.documentFolio ?? tx.id),
        depositAmount: deposit,
        depositConsumedAmount: consumed,
        availableAmount: available,
        createdAt: tx.createdAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }

    return { creditNotes, orderAdvances };
  }

  async validatePaymentsForCustomer(
    customerId: string,
    payments: PaymentToApply[],
  ): Promise<void> {
    const cid = customerId?.trim();
    if (!cid) return;

    const sources = await this.listForCustomer(cid);
    const ncById = new Map(sources.creditNotes.map((r) => [r.id, r]));
    const boById = new Map(sources.orderAdvances.map((r) => [r.id, r]));

    const ncUse = new Map<string, number>();
    const boUse = new Map<string, number>();

    for (const p of payments) {
      const amount = Math.round(Number(p.amount) || 0);
      if (amount < 1) continue;

      if (p.paymentMethod === PaymentMethod.CUSTOMER_CREDIT_NOTE) {
        const ncId = p.creditNoteTransactionId?.trim();
        if (!ncId) {
          throw new BadRequestException(
            'Seleccione la nota de crédito a aplicar.',
          );
        }
        const row = ncById.get(ncId);
        if (!row) {
          throw new BadRequestException(
            'La nota de crédito no está disponible para este cliente.',
          );
        }
        const next = (ncUse.get(ncId) ?? 0) + amount;
        if (next > row.availableAmount + 0.01) {
          throw new BadRequestException(
            `Monto supera el saldo de la nota de crédito ${row.documentNumber} (disponible: ${row.availableAmount}).`,
          );
        }
        ncUse.set(ncId, next);
      }

      if (p.paymentMethod === PaymentMethod.ORDER_ADVANCE) {
        const boId = p.backorderTransactionId?.trim();
        if (!boId) {
          throw new BadRequestException(
            'Seleccione el abono de encargo a aplicar.',
          );
        }
        const row = boById.get(boId);
        if (!row) {
          throw new BadRequestException(
            'El abono de encargo no está disponible para este cliente.',
          );
        }
        const next = (boUse.get(boId) ?? 0) + amount;
        if (next > row.availableAmount + 0.01) {
          throw new BadRequestException(
            `Monto supera el saldo del encargo ${row.documentNumber} (disponible: ${row.availableAmount}).`,
          );
        }
        boUse.set(boId, next);
      }
    }
  }

  async applyPaymentsToSources(
    customerId: string,
    payments: PaymentToApply[],
    saleTransactionId: string,
  ): Promise<void> {
    const cid = customerId?.trim();
    const saleId = saleTransactionId?.trim();
    if (!cid || !saleId) return;

    await this.validatePaymentsForCustomer(cid, payments);

    for (const p of payments) {
      const amount = Math.round(Number(p.amount) || 0);
      if (amount < 1) continue;

      if (
        p.paymentMethod === PaymentMethod.CUSTOMER_CREDIT_NOTE &&
        p.creditNoteTransactionId?.trim()
      ) {
        await this.consumeCreditNote(p.creditNoteTransactionId.trim(), amount, saleId, cid);
      }

      if (
        p.paymentMethod === PaymentMethod.ORDER_ADVANCE &&
        p.backorderTransactionId?.trim()
      ) {
        await this.consumeBackorder(
          p.backorderTransactionId.trim(),
          amount,
          saleId,
          cid,
        );
      }
    }
  }

  private async consumeCreditNote(
    creditNoteId: string,
    amount: number,
    saleTransactionId: string,
    customerId: string,
  ): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: {
        id: creditNoteId,
        customerId,
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
      },
    });
    if (!tx) {
      throw new NotFoundException('Nota de crédito no encontrada.');
    }
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const available = readCreditNoteAvailableAmount(Number(tx.total), meta);
    if (amount > available + 0.01) {
      throw new BadRequestException(
        'La nota de crédito ya no tiene saldo suficiente.',
      );
    }
    const prevBlock = (meta.creditNote ?? {}) as TransactionCustomerCreditNoteMetadata;
    const prevConsumed = readCreditNoteConsumedAmount(meta);
    const applications = Array.isArray(prevBlock.applications)
      ? [...prevBlock.applications]
      : [];
    applications.push({
      saleTransactionId,
      amount,
      appliedAt: new Date().toISOString(),
    });
    meta.creditNote = {
      ...prevBlock,
      consumedAmount: prevConsumed + amount,
      applications,
    };
    tx.metadata = meta;
    await this.txRepo.save(tx);
  }

  async consumeCreditNoteForPayout(
    creditNoteId: string,
    amount: number,
    payoutTransactionId: string,
    customerId: string,
  ): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: {
        id: creditNoteId,
        customerId,
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
      },
    });
    if (!tx) {
      throw new NotFoundException('Nota de crédito no encontrada.');
    }
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const available = readCreditNoteAvailableAmount(Number(tx.total), meta);
    if (amount > available + 0.01) {
      throw new BadRequestException(
        'La nota de crédito ya no tiene saldo suficiente.',
      );
    }
    const prevBlock = (meta.creditNote ?? {}) as TransactionCustomerCreditNoteMetadata;
    const prevConsumed = readCreditNoteConsumedAmount(meta);
    const applications = Array.isArray(prevBlock.applications)
      ? [...prevBlock.applications]
      : [];
    applications.push({
      payoutTransactionId,
      amount,
      appliedAt: new Date().toISOString(),
    });
    meta.creditNote = {
      ...prevBlock,
      consumedAmount: prevConsumed + amount,
      applications,
    };
    tx.metadata = meta;
    await this.txRepo.save(tx);
  }

  private async consumeBackorder(
    backorderId: string,
    amount: number,
    saleTransactionId: string,
    customerId: string,
  ): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: {
        id: backorderId,
        customerId,
        transactionType: TransactionType.BACKORDER,
      },
    });
    if (!tx) {
      throw new NotFoundException('Encargo no encontrado.');
    }
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const bo = { ...((meta.backorder ?? {}) as TransactionBackorderMetadata) };
    const status = String(bo.reservationStatus ?? 'OPEN').toUpperCase();
    if (status !== 'OPEN') {
      throw new BadRequestException('El encargo ya no está disponible.');
    }
    const deposit = Math.round(Number(bo.depositAmount ?? tx.total) || 0);
    const consumed = Math.round(Number(bo.depositConsumedAmount ?? 0) || 0);
    const available = Math.max(0, deposit - consumed);
    if (amount > available + 0.01) {
      throw new BadRequestException('El abono del encargo ya no tiene saldo suficiente.');
    }
    bo.depositConsumedAmount = consumed + amount;
    meta.backorder = bo;
    tx.metadata = meta;
    await this.txRepo.save(tx);
  }

  /** Todas las NC del cliente (historial), con estado de uso. */
  async listAllCreditNotesForCustomer(
    customerId: string,
    paging?: { page?: number; pageSize?: number },
  ): Promise<{
    success: true;
    creditNotes: CustomerCreditNoteLinkSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const cid = customerId?.trim();
    if (!cid) {
      throw new BadRequestException('customerId es obligatorio');
    }
    const pageOpts = normalizeCustomerListPage(paging);
    const [rows, total] = await this.txRepo.findAndCount({
      where: {
        customerId: cid,
        transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
      },
      order: { createdAt: 'DESC' },
      skip: pageOpts.skip,
      take: pageOpts.pageSize,
    });
    return {
      success: true,
      creditNotes: rows.map((tx) => buildCustomerCreditNoteLinkSummary(tx)),
      total,
      page: pageOpts.page,
      pageSize: pageOpts.pageSize,
    };
  }

  /** Devoluciones del cliente con NC vinculada y modo de reembolso. */
  async listReturnsForCustomer(
    customerId: string,
    paging?: { page?: number; pageSize?: number },
  ): Promise<{
    success: true;
    returns: CustomerReturnRow[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const cid = customerId?.trim();
    if (!cid) {
      throw new BadRequestException('customerId es obligatorio');
    }
    const pageOpts = normalizeCustomerListPage(paging);
    const [returns, total] = await this.txRepo.findAndCount({
      where: {
        customerId: cid,
        transactionType: TransactionType.SALE_RETURN,
      },
      order: { createdAt: 'DESC' },
      skip: pageOpts.skip,
      take: pageOpts.pageSize,
    });

    const result: CustomerReturnRow[] = [];
    for (const sr of returns) {
      const creditNote = await this.txRepo.findOne({
        where: {
          relatedTransactionId: sr.id,
          transactionType: TransactionType.CUSTOMER_CREDIT_NOTE,
        },
        order: { createdAt: 'DESC' },
      });
      const meta = (sr.metadata ?? {}) as Record<string, unknown>;
      const refundMode =
        typeof meta.refundMode === 'string' ? meta.refundMode.trim() : null;
      result.push({
        id: sr.id,
        documentNumber: String(sr.documentNumber ?? sr.id),
        total: Math.round(Number(sr.total) || 0),
        status: String(sr.status ?? ''),
        createdAt: sr.createdAt?.toISOString?.() ?? new Date().toISOString(),
        refundMode,
        linkedCreditNote: creditNote
          ? buildCustomerCreditNoteLinkSummary(creditNote)
          : null,
      });
    }
    return {
      success: true,
      returns: result,
      total,
      page: pageOpts.page,
      pageSize: pageOpts.pageSize,
    };
  }
}
