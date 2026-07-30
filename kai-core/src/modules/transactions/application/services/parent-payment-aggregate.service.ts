import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '../../domain/transaction.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';

const FISCAL_PARENT_TYPES: TransactionType[] = [
  TransactionType.SUPPLIER_INVOICE,
  TransactionType.SUPPLIER_RECEIPT,
  TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
];

function childPaymentTypeForParent(
  parentType: TransactionType,
): TransactionType | null {
  switch (parentType) {
    case TransactionType.SUPPLIER_INVOICE:
    case TransactionType.SUPPLIER_RECEIPT:
    case TransactionType.SUPPLIER_HONORARIUM_RECEIPT:
    case TransactionType.PURCHASE:
      return TransactionType.SUPPLIER_PAYMENT;
    case TransactionType.PAYROLL:
      return TransactionType.PAYROLL_PAYMENT;
    case TransactionType.OPERATING_EXPENSE:
      return TransactionType.EXPENSE_PAYMENT;
    default:
      return null;
  }
}

@Injectable()
export class ParentPaymentAggregateService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(OperationalExpense)
    private readonly operationalExpenseRepo: Repository<OperationalExpense>,
  ) {}

  async recalculateParentPaymentStatus(parentTransactionId: string): Promise<void> {
    const parent = await this.txRepo.findOne({
      where: { id: parentTransactionId },
    });
    if (!parent) {
      throw new BadRequestException('Documento padre no encontrado');
    }

    const childType = childPaymentTypeForParent(parent.transactionType);
    if (!childType) {
      return;
    }

    const children = await this.txRepo.find({
      where: {
        relatedTransactionId: parentTransactionId,
        transactionType: childType,
        status: In([TransactionStatus.DRAFT, TransactionStatus.CONFIRMED]),
      },
    });

    const documentTotal = Number(parent.total || 0);
    const eps = 0.005;

    const sumPaid = children
      .filter((c) => c.status === TransactionStatus.CONFIRMED)
      .reduce((s, c) => s + Number(c.total || 0), 0);

    let paymentStatus = PaymentStatus.PENDING;
    if (documentTotal > 0 && sumPaid + eps >= documentTotal) {
      paymentStatus = PaymentStatus.PAID;
    } else if (sumPaid > eps) {
      paymentStatus = PaymentStatus.PARTIAL;
    } else if (children.length > 0) {
      paymentStatus = PaymentStatus.PENDING;
    }

    await this.txRepo.update(parentTransactionId, {
      amountPaid: sumPaid,
      paymentStatus,
    });

    await this.syncLinkedOperationalExpensePaymentStatus(
      parent,
      paymentStatus,
    );
  }

  private async syncLinkedOperationalExpensePaymentStatus(
    parent: Transaction,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    const meta = parent.metadata as Record<string, unknown> | null | undefined;
    const links =
      meta?.links && typeof meta.links === 'object'
        ? (meta.links as Record<string, unknown>)
        : null;
    const fromLinks = links?.operationalExpenseId;
    const fromMeta = meta?.operationalExpenseId;
    const operationalExpenseId =
      (typeof fromLinks === 'string' && fromLinks.trim()) ||
      (typeof fromMeta === 'string' && fromMeta.trim()) ||
      null;
    if (!operationalExpenseId) {
      return;
    }
    await this.operationalExpenseRepo.update(operationalExpenseId, {
      paymentStatus,
    });
  }

  isFiscalParent(type: TransactionType): boolean {
    return FISCAL_PARENT_TYPES.includes(type);
  }
}
