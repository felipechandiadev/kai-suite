import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OperationalExpensesRepository } from '../infrastructure/operational-expenses.repository';
import { CreateOperationalExpenseDto } from './dto/create-operational-expense.dto';
import { UpdateOperationalExpenseDto } from './dto/update-operational-expense.dto';
import {
  OperationalExpense,
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '../domain/operational-expense.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionType, PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import { SupplierFiscalDocumentCreateService } from '@modules/transactions/application/services/supplier-fiscal-document-create.service';
import { OperatingExpensePaymentPlanService } from '@modules/transactions/application/services/operating-expense-payment-plan.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

const FISCAL_KIND_TO_TX: Record<
  Exclude<OperationalExpenseDocumentKind, OperationalExpenseDocumentKind.OTHER>,
  TransactionType
> = {
  [OperationalExpenseDocumentKind.SUPPLIER_INVOICE]:
    TransactionType.SUPPLIER_INVOICE,
  [OperationalExpenseDocumentKind.SUPPLIER_RECEIPT]:
    TransactionType.SUPPLIER_RECEIPT,
  [OperationalExpenseDocumentKind.SUPPLIER_HONORARIUM_RECEIPT]:
    TransactionType.SUPPLIER_HONORARIUM_RECEIPT,
};

const FISCAL_KIND_TO_PAYMENT_ORIGIN: Record<
  Exclude<OperationalExpenseDocumentKind, OperationalExpenseDocumentKind.OTHER>,
  string
> = {
  [OperationalExpenseDocumentKind.SUPPLIER_INVOICE]: 'SUPPLIER_INVOICE_PAYMENT',
  [OperationalExpenseDocumentKind.SUPPLIER_RECEIPT]: 'SUPPLIER_RECEIPT_PAYMENT',
  [OperationalExpenseDocumentKind.SUPPLIER_HONORARIUM_RECEIPT]:
    'SUPPLIER_HONORARIUM_RECEIPT_PAYMENT',
};

@Injectable()
export class OperationalExpensesService {
  private readonly logger = new Logger(OperationalExpensesService.name);

  constructor(
    private readonly repository: OperationalExpensesRepository,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly supplierFiscalDocumentCreate: SupplierFiscalDocumentCreateService,
    private readonly operatingExpensePaymentPlan: OperatingExpensePaymentPlanService,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findAll(params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    branchId?: string;
    status?: string;
  }): Promise<{ data: OperationalExpense[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      companyId,
      branchId,
      status,
    } = params || {};

    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: [
          'company',
          'branch',
          'resultCenter',
          'category',
          'supplier',
          'employee',
        ],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    const txIds = data
      .map(
        (expense) =>
          expense.supplierFiscalDocumentTransactionId ??
          expense.operatingExpenseTransactionId ??
          expense.metadata?.operatingExpenseTransactionId ??
          null,
      )
      .filter((id): id is string => Boolean(id));
    const uniqueTxIds = [...new Set(txIds)];
    const transactions =
      uniqueTxIds.length > 0
        ? await this.transactionRepo.find({ where: { id: In(uniqueTxIds) } })
        : [];
    const txById = new Map(transactions.map((tx) => [tx.id, tx]));

    const enrichedData = await Promise.all(
      data.map(async (expense) => this.attachMediaAssets(expense, txById)),
    );

    return { data: enrichedData, total };
  }

  async findOne(id: string): Promise<OperationalExpense> {
    const expense = await this.repository.findOne(id);
    if (!expense) {
      throw new NotFoundException(`Operational expense ${id} not found`);
    }
    return this.attachMediaAssets(expense);
  }

  async create(dto: CreateOperationalExpenseDto): Promise<OperationalExpense> {
    this.logger.log(`Creating operational expense: ${dto.referenceNumber}`);

    const branchId = await this.resolveBranchId(dto.companyId, dto.branchId);
    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar sucursal para el gasto operativo',
      );
    }

    const referenceNumber = String(dto.referenceNumber || '').trim();
    if (!referenceNumber) {
      throw new BadRequestException('La referencia del documento es obligatoria.');
    }

    const amounts = dto.fiscalAmounts;
    if (!amounts || amounts.total < 0.01) {
      throw new BadRequestException('El total del gasto debe ser mayor a cero.');
    }

    const { multimediaAssetIds, supplierDocumentPayment, fiscalAmounts, ...expenseData } =
      dto;

    const created = await this.repository.create({
      ...expenseData,
      referenceNumber,
      branchId: dto.branchId ?? branchId,
      status: dto.status ?? OperationalExpenseStatus.APPROVED,
      documentKind: dto.documentKind,
    });

    try {
      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
      let supplierFiscalDocumentTransactionId: string | null = null;
      let operatingExpenseTransactionId: string | null = null;

      if (dto.documentKind === OperationalExpenseDocumentKind.OTHER) {
        const result = await this.operatingExpensePaymentPlan.createWithPaymentPlan({
          companyId: dto.companyId,
          branchId,
          userId: dto.createdBy,
          supplierId: dto.supplierId,
          expenseCategoryId: dto.categoryId,
          operationalExpenseId: created.id,
          documentFolio: referenceNumber,
          operationDate: dto.operationDate,
          subtotal: fiscalAmounts.subtotal,
          taxAmount: fiscalAmounts.taxAmount,
          total: fiscalAmounts.total,
          supplierDocumentPayment,
        });
        operatingExpenseTransactionId = result.operatingExpenseTransactionId;
        paymentStatus = result.paymentStatus;
      } else {
        const txType = FISCAL_KIND_TO_TX[dto.documentKind] as
          | TransactionType.SUPPLIER_INVOICE
          | TransactionType.SUPPLIER_RECEIPT
          | TransactionType.SUPPLIER_HONORARIUM_RECEIPT;
        const paymentOrigin = FISCAL_KIND_TO_PAYMENT_ORIGIN[dto.documentKind];
        const fiscal = await this.supplierFiscalDocumentCreate.create({
          companyId: dto.companyId,
          transactionType: txType,
          branchId,
          userId: dto.createdBy,
          supplierId: dto.supplierId,
          subtotal: fiscalAmounts.subtotal,
          taxAmount: fiscalAmounts.taxAmount,
          total: fiscalAmounts.total,
          dteNumber: referenceNumber,
          supplierDocumentPayment,
          paymentOrigin,
          metadata: {
            links: {
              operationalExpenseId: created.id,
              expenseCategoryId: dto.categoryId,
            },
            expenseCategoryId: dto.categoryId,
            operationalExpenseName: dto.name,
            taxId: fiscalAmounts.taxId ?? null,
          },
        });
        supplierFiscalDocumentTransactionId = fiscal.fiscalDocId;
        paymentStatus = fiscal.paymentStatus;
      }

      await this.repository.update(created.id, {
        paymentStatus,
        supplierFiscalDocumentTransactionId,
        operatingExpenseTransactionId,
      });
    } catch (err) {
      await this.repository.remove(created.id);
      throw err;
    }

    if (multimediaAssetIds?.length) {
      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: created.id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    return this.attachMediaAssets(
      (await this.repository.findOne(created.id)) ?? created,
    );
  }

  async update(
    id: string,
    dto: UpdateOperationalExpenseDto,
  ): Promise<OperationalExpense> {
    await this.findOne(id);
    this.logger.log(`Updating operational expense ${id}`);
    const { multimediaAssetIds, ...expenseData } = dto;
    const updated = await this.repository.update(id, expenseData);

    if (multimediaAssetIds) {
      const existingAssets = await this.multimediaService.listByEntity(
        'operational-expense',
        id,
      );

      await Promise.all(
        existingAssets.map((asset) =>
          this.multimediaService.unlink({
            assetId: asset.id,
            entityType: 'operational-expense',
            entityId: id,
          }),
        ),
      );

      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    return this.attachMediaAssets(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    this.logger.log(`Removing operational expense ${id}`);
    await this.repository.remove(id);
  }

  /** Sincroniza paymentStatus del OE desde la transacción padre vinculada. */
  async syncPaymentStatusFromTransaction(
    operationalExpenseId: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.repository.update(operationalExpenseId, { paymentStatus });
  }

  private async resolveBranchId(
    companyId: string,
    branchId?: string | null,
  ): Promise<string | null> {
    if (branchId) {
      return branchId;
    }
    const branch = await this.branchRepo.findOne({
      where: { companyId },
      order: { name: 'ASC' },
    });
    return branch?.id ?? null;
  }

  private resolveLinkedTransactionId(expense: OperationalExpense): string | null {
    return (
      expense.supplierFiscalDocumentTransactionId ??
      expense.operatingExpenseTransactionId ??
      expense.metadata?.operatingExpenseTransactionId ??
      null
    );
  }

  private applyTransactionEnrichment(
    expense: OperationalExpense,
    tx: Transaction,
  ): void {
    type Enriched = OperationalExpense & {
      netAmount?: number;
      taxAmount?: number;
      totalAmount?: number;
      documentNumber?: string | null;
    };
    const enriched = expense as Enriched;
    enriched.netAmount = Number(tx.subtotal) || 0;
    enriched.taxAmount = Number(tx.taxAmount) || 0;
    enriched.totalAmount = Number(tx.total) || 0;
    const docNum = String(tx.documentNumber ?? '').trim();
    const docFolio = String(tx.documentFolio ?? '').trim();
    enriched.documentNumber = docNum || docFolio || null;
  }

  private async attachMediaAssets(
    expense: OperationalExpense,
    txById?: Map<string, Transaction>,
  ): Promise<OperationalExpense> {
    const assets = await this.multimediaService.listByEntity(
      'operational-expense',
      expense.id,
    );

    expense.mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));

    const txId = this.resolveLinkedTransactionId(expense);

    if (txId) {
      const tx =
        txById?.get(txId) ??
        (await this.transactionRepo.findOne({ where: { id: txId } }));
      if (tx) {
        this.applyTransactionEnrichment(expense, tx);
      }
    } else if (expense.metadata?.linkedTributaryDocument) {
      const linked = expense.metadata.linkedTributaryDocument;
      (expense as OperationalExpense & { netAmount?: number }).netAmount =
        linked.netAmount;
      (expense as OperationalExpense & { taxAmount?: number }).taxAmount =
        linked.taxAmount;
      (expense as OperationalExpense & { totalAmount?: number }).totalAmount =
        linked.totalAmount;
    }

    return expense;
  }
}
