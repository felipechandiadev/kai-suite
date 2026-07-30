import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';
import { InstallmentSourceType } from '@modules/installments/domain/installment.entity';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { CustomersService } from './customers.service';
import { buildOpenCreditRowsFromSales } from './internal-credit-debt.util';

export type InternalCreditDebtScheduledRow = {
  id: string;
  transactionId: string | null;
  documentNumber: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  amount: number;
  dueDate: string | null;
  status: string | null;
  createdAt: string | null;
};

export type InternalCreditDebtOpenRow = {
  transactionId: string;
  documentNumber: string | null;
  saleDate: string | null;
  creditAmount: number;
  mode: 'CREDIT_LUMP' | 'UNKNOWN';
};

export type InternalCreditDebtResponse = {
  success: true;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  scheduled: {
    totalPending: number;
    rows: InternalCreditDebtScheduledRow[];
  };
  openCredit: {
    totalPending: number;
    rows: InternalCreditDebtOpenRow[];
  };
};

@Injectable()
export class CustomerInternalCreditDebtService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly installmentService: InstallmentService,
    private readonly installmentRepo: InstallmentRepository,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async getDebt(customerId: string): Promise<InternalCreditDebtResponse> {
    const customer = await this.customersService.findOne(customerId);
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const creditLimit = Math.round(Number(customer.creditLimit) || 0);
    const usedCredit = Math.round(Number(customer.usedCredit) || 0);
    const availableCredit = Math.round(Number(customer.availableCredit) || 0);

    let scheduledRows: InternalCreditDebtScheduledRow[] = [];
    try {
      const ar = await this.installmentService.getAccountsReceivable({
        customerId,
        includePaid: false,
        page: 1,
        pageSize: 200,
      });

      scheduledRows = (ar.rows ?? []).map((row) => ({
        id: row.id,
        transactionId: row.saleTransactionId,
        documentNumber: row.documentNumber,
        installmentNumber: row.installmentNumber ?? null,
        totalInstallments: row.totalInstallments ?? null,
        amount: Math.round(Number(row.pendingAmount ?? row.amount ?? 0)),
        dueDate: row.dueDate,
        status: row.status != null ? String(row.status) : null,
        createdAt: row.createdAt ?? null,
      }));
    } catch {
      // Don't block open-credit ledger if AR query fails for this customer.
      scheduledRows = [];
    }

    const scheduledTotal = scheduledRows.reduce((a, r) => a + r.amount, 0);

    const sales = await this.transactionRepo.find({
      where: {
        customerId,
        transactionType: TransactionType.SALE,
      },
      order: { createdAt: 'DESC' },
      take: 300,
    });

    const saleIds = sales.map((s) => s.id).filter(Boolean);
    const withInstallments = new Set<string>();
    if (saleIds.length > 0) {
      const bySaleId = await this.installmentRepo.find({
        where: [
          {
            sourceType: InstallmentSourceType.SALE,
            sourceTransactionId: In(saleIds),
          },
          {
            sourceType: InstallmentSourceType.SALE,
            saleTransactionId: In(saleIds),
          },
        ],
        select: ['saleTransactionId', 'sourceTransactionId'],
      });
      for (const inst of bySaleId) {
        if (inst.sourceTransactionId) withInstallments.add(inst.sourceTransactionId);
        if (inst.saleTransactionId) withInstallments.add(inst.saleTransactionId);
      }
    }

    const openRows = buildOpenCreditRowsFromSales(
      sales.map((s) => ({
        id: s.id,
        documentNumber: s.documentNumber,
        createdAt: s.createdAt,
        total: s.total,
        paymentMethod: s.paymentMethod,
        metadata: (s.metadata ?? null) as Record<string, unknown> | null,
      })),
      withInstallments,
    );

    const openTotal = openRows.reduce((a, r) => a + r.creditAmount, 0);

    return {
      success: true,
      creditLimit,
      usedCredit,
      availableCredit,
      scheduled: {
        totalPending: scheduledTotal,
        rows: scheduledRows,
      },
      openCredit: {
        totalPending: openTotal,
        rows: openRows,
      },
    };
  }
}
