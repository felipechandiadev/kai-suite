import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from '../transactions.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import {
  PaymentStatus,
  TransactionType,
} from '../../domain/transaction.entity';
import {
  SupplierDocumentPaymentPlanService,
  SupplierDocumentPaymentPlanInput,
} from './supplier-document-payment-plan.service';
import { SupplierDocumentFolioGuardService } from './supplier-document-folio-guard.service';
import { Branch } from '@modules/branches/domain/branch.entity';
import { normalizeDteNumberFromBody } from '../../presentation/helpers/supplier-dte-create.helper';
import {
  buildSummaryFiscalLineFromAmounts,
  shouldSynthesizeOperationalExpenseFiscalLine,
} from '../helpers/operational-expense-fiscal-line.util';

export type CreateSupplierFiscalDocumentInput = {
  companyId?: string;
  transactionType:
    | TransactionType.SUPPLIER_INVOICE
    | TransactionType.SUPPLIER_RECEIPT
    | TransactionType.SUPPLIER_HONORARIUM_RECEIPT;
  branchId: string;
  userId: string;
  supplierId: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  dteNumber: string;
  supplierDocumentPayment: unknown;
  paymentOrigin: string;
  metadata?: Record<string, unknown>;
  lines?: unknown[];
  notes?: string;
  storageId?: string;
  skipFolioCheck?: boolean;
};

export type CreateSupplierFiscalDocumentResult = {
  fiscalDocId: string;
  paymentStatus: PaymentStatus;
  transaction: Awaited<ReturnType<TransactionsService['createTransaction']>>;
};

@Injectable()
export class SupplierFiscalDocumentCreateService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly supplierDocumentPaymentPlan: SupplierDocumentPaymentPlanService,
    private readonly folioGuard: SupplierDocumentFolioGuardService,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async create(
    input: CreateSupplierFiscalDocumentInput,
  ): Promise<CreateSupplierFiscalDocumentResult> {
    const totalDoc = Math.round(Number(input.total) || 0);
    if (totalDoc <= 0) {
      throw new BadRequestException('El total del documento debe ser mayor a cero.');
    }

    const dteNumber = String(input.dteNumber || '').trim();
    if (!dteNumber) {
      throw new BadRequestException('El folio DTE es obligatorio.');
    }

    if (!input.skipFolioCheck) {
      const companyId = await this.resolveCompanyId(input.branchId, input.companyId);
      await this.folioGuard.assertUniqueFolio({
        companyId,
        supplierId: input.supplierId,
        documentFolio: dteNumber,
        transactionTypes: this.folioGuard.allFolioTypesForOperationalExpense(),
      });
    }

    const payment = this.supplierDocumentPaymentPlan.normalize(
      input.supplierDocumentPayment ?? null,
    );
    const planErr = this.supplierDocumentPaymentPlan.validate(payment, totalDoc);
    if (planErr) {
      throw new BadRequestException(planErr);
    }

    const parentFields = this.supplierDocumentPaymentPlan.resolveFiscalParentFields(
      payment,
      totalDoc,
    );

    const linksRaw =
      input.metadata?.links && typeof input.metadata.links === 'object'
        ? (input.metadata.links as Record<string, unknown>)
        : {};

    const dto = new CreateTransactionDto();
    dto.transactionType = input.transactionType;
    dto.branchId = input.branchId;
    dto.userId = input.userId;
    dto.supplierId = input.supplierId;
    dto.storageId = input.storageId ?? undefined;
    dto.subtotal = Math.round(Number(input.subtotal) || 0);
    dto.taxAmount = Math.round(Number(input.taxAmount) || 0);
    dto.discountAmount = 0;
    dto.total = totalDoc;
    if (parentFields.paymentMethod) {
      dto.paymentMethod = parentFields.paymentMethod;
    }
    dto.paymentStatus = parentFields.paymentStatus;
    dto.amountPaid = parentFields.amountPaid;
    dto.notes = input.notes ?? undefined;
    dto.documentFolio = dteNumber;
    dto.metadata = {
      ...(input.metadata ?? {}),
      origin: input.transactionType,
      dteNumber,
      links: {
        purchaseOrderId: linksRaw.purchaseOrderId ?? null,
        receptionId: linksRaw.receptionId ?? null,
        stockInTransactionId: linksRaw.stockInTransactionId ?? null,
        operationalExpenseId: linksRaw.operationalExpenseId ?? null,
        expenseCategoryId: linksRaw.expenseCategoryId ?? null,
      },
      plannedPayments: parentFields.plannedPayments,
      supplierDocumentPayment: payment,
    };
    dto.lines = this.resolveFiscalLines(input) as CreateTransactionDto['lines'];

    const created = await this.transactionsService.createTransaction(dto);
    const fiscalId = created?.id;
    if (!fiscalId) {
      throw new BadRequestException('No se obtuvo id del documento fiscal creado.');
    }

    await this.supplierDocumentPaymentPlan.createPaymentChildren({
      host: {
        branchId: input.branchId,
        userId: input.userId,
        supplierId: input.supplierId,
      },
      fiscalDocId: fiscalId,
      payment,
      paymentOrigin: input.paymentOrigin,
    });

    return {
      fiscalDocId: fiscalId,
      paymentStatus: parentFields.paymentStatus,
      transaction: created,
    };
  }

  normalizePayment(raw: unknown): SupplierDocumentPaymentPlanInput {
    return this.supplierDocumentPaymentPlan.normalize(raw);
  }

  validatePayment(
    payment: SupplierDocumentPaymentPlanInput,
    docTotal: number,
  ): string | null {
    return this.supplierDocumentPaymentPlan.validate(payment, docTotal);
  }

  /** Crea desde body HTTP de factura/boleta/honorarios (controllers). */
  async createFromHttpBody(body: {
    branchId: string;
    userId: string;
    supplierId: string;
    subtotal?: number;
    taxAmount?: number;
    total?: number;
    supplierDocumentPayment?: unknown;
    metadata?: Record<string, unknown>;
    lines?: unknown[];
    notes?: string;
    storageId?: string;
    dteNumber?: string;
    transactionType: TransactionType;
    paymentOrigin: string;
  }) {
    const dteNumber =
      normalizeDteNumberFromBody(body) ||
      String(body.dteNumber || '').trim();
    const result = await this.create({
      branchId: body.branchId,
      userId: body.userId,
      supplierId: body.supplierId,
      subtotal: Number(body.subtotal ?? 0) || 0,
      taxAmount: Number(body.taxAmount ?? 0) || 0,
      total: Number(body.total ?? 0) || 0,
      dteNumber,
      supplierDocumentPayment: body.supplierDocumentPayment,
      paymentOrigin: body.paymentOrigin,
      metadata: body.metadata,
      lines: body.lines,
      notes: body.notes,
      storageId: body.storageId,
      transactionType: body.transactionType as CreateSupplierFiscalDocumentInput['transactionType'],
    });
    return result.transaction;
  }

  private resolveFiscalLines(input: CreateSupplierFiscalDocumentInput): unknown[] {
    const provided = Array.isArray(input.lines) ? input.lines : [];
    if (!shouldSynthesizeOperationalExpenseFiscalLine(provided, input.metadata)) {
      return provided;
    }
    const expenseName = String(input.metadata?.operationalExpenseName || '').trim();
    const taxId =
      typeof input.metadata?.taxId === 'string' ? input.metadata.taxId : null;
    return [
      buildSummaryFiscalLineFromAmounts({
        productName: expenseName,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        total: input.total,
        taxId,
      }),
    ];
  }

  private async resolveCompanyId(
    branchId: string,
    companyId?: string,
  ): Promise<string> {
    if (companyId?.trim()) {
      return companyId.trim();
    }
    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch?.companyId) {
      throw new BadRequestException('No se pudo determinar la empresa de la sucursal.');
    }
    return branch.companyId;
  }
}
