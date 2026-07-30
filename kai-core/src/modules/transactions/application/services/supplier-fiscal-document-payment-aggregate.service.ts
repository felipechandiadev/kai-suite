import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';

export type SupplierDocumentPaymentAggregateStatus =
  | 'NONE'
  | 'SCHEDULED'
  | 'PARTIAL'
  | 'PAID';

export interface ChildSupplierPaymentRow {
  id: string;
  documentNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  paymentStatus?: string | null;
}

export interface SupplierFiscalDocumentPaymentAggregate {
  documentTransactionId: string;
  documentType: TransactionType;
  documentTotal: number;
  aggregateStatus: SupplierDocumentPaymentAggregateStatus;
  childPayments: ChildSupplierPaymentRow[];
  sumConfirmed: number;
  sumDraft: number;
}

const FISCAL_PARENT_TYPES: TransactionType[] = [
  TransactionType.SUPPLIER_INVOICE,
  TransactionType.SUPPLIER_RECEIPT,
  TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
];

@Injectable()
export class SupplierFiscalDocumentPaymentAggregateService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async getAggregate(
    documentTransactionId: string,
  ): Promise<SupplierFiscalDocumentPaymentAggregate> {
    const doc = await this.txRepo.findOne({
      where: { id: documentTransactionId },
    });
    if (!doc) {
      throw new BadRequestException('Documento no encontrado');
    }
    if (!FISCAL_PARENT_TYPES.includes(doc.transactionType)) {
      throw new BadRequestException(
        'Solo aplica a factura o boleta de proveedor (SUPPLIER_INVOICE, SUPPLIER_RECEIPT, SUPPLIER_HONORARIUM_RECEIPT)',
      );
    }

    const children = await this.txRepo.find({
      where: {
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        relatedTransactionId: documentTransactionId,
      },
      order: { createdAt: 'ASC' },
    });

    const documentTotal = Number(doc.total || 0);
    const childPayments: ChildSupplierPaymentRow[] = children.map((c) => ({
      id: c.id,
      documentNumber: c.documentNumber,
      status: c.status,
      total: Number(c.total || 0),
      amountPaid: Number(c.amountPaid || 0),
      paymentMethod: String(c.paymentMethod),
      paymentStatus: c.paymentStatus ?? null,
    }));

    const sumDraft = children
      .filter((c) => c.status === TransactionStatus.DRAFT)
      .reduce((s, c) => s + Number(c.total || 0), 0);
    const sumConfirmed = children
      .filter((c) => c.status === TransactionStatus.CONFIRMED)
      .reduce((s, c) => s + Number(c.total || 0), 0);

    const eps = 0.005;
    let aggregateStatus: SupplierDocumentPaymentAggregateStatus = 'NONE';
    if (children.length === 0) {
      aggregateStatus = 'NONE';
    } else if (documentTotal > 0 && sumConfirmed + eps >= documentTotal) {
      aggregateStatus = 'PAID';
    } else if (sumConfirmed > eps) {
      aggregateStatus = 'PARTIAL';
    } else if (
      sumDraft > eps ||
      children.some((c) => c.status === TransactionStatus.DRAFT)
    ) {
      aggregateStatus = 'SCHEDULED';
    } else {
      aggregateStatus = 'PARTIAL';
    }

    return {
      documentTransactionId,
      documentType: doc.transactionType,
      documentTotal,
      aggregateStatus,
      childPayments,
      sumConfirmed,
      sumDraft,
    };
  }
}
