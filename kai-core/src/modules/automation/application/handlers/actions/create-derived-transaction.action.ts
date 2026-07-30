import { Injectable, Logger } from '@nestjs/common';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

@Injectable()
export class CreateDerivedTransactionActionHandler {
  private readonly logger = new Logger(CreateDerivedTransactionActionHandler.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any, action: any) {
    const event = ctx.payload;
    const sourceTx = event?.transaction;
    if (!sourceTx?.id) {
      return;
    }

    const params = (action?.params ?? {}) as any;
    const derivedType = String(params.transactionType ?? '').trim();
    if (!derivedType) {
      this.logger.warn(`Missing params.transactionType for CREATE_DERIVED_TRANSACTION ruleId=${rule?.id}`);
      return;
    }

    const linkMode = String(params.linkMode ?? 'relatedTransactionId');
    const lineStrategy = String(params.lineStrategy ?? 'none');
    const totalFrom = String(params.totalFrom ?? 'sourceTotal'); // sourceTotal | amountPaid | costTotal

    const dto = new CreateTransactionDto();
    dto.transactionType = derivedType as TransactionType;
    dto.branchId = sourceTx.branchId;
    dto.userId = sourceTx.userId;
    dto.pointOfSaleId = sourceTx.pointOfSaleId ?? undefined;
    dto.cashSessionId = sourceTx.cashSessionId ?? undefined;
    dto.storageId = sourceTx.storageId ?? undefined;
    dto.targetStorageId = sourceTx.targetStorageId ?? undefined;
    dto.customerId = sourceTx.customerId ?? undefined;
    dto.supplierId = sourceTx.supplierId ?? undefined;
    dto.shareholderId = sourceTx.shareholderId ?? undefined;
    dto.employeeId = sourceTx.employeeId ?? undefined;
    dto.expenseCategoryId = sourceTx.expenseCategoryId ?? undefined;
    dto.resultCenterId = sourceTx.resultCenterId ?? undefined;

    // Amounts: by default use source amounts (overridable).
    dto.subtotal = Number(sourceTx.subtotal ?? sourceTx.total ?? 0);
    dto.taxAmount = Number(sourceTx.taxAmount ?? 0);
    dto.discountAmount = Number(sourceTx.discountAmount ?? 0);
    dto.total = Number(sourceTx.total ?? 0);
    dto.paymentMethod = sourceTx.paymentMethod;
    dto.paymentStatus = sourceTx.paymentStatus ?? undefined;
    dto.amountPaid = sourceTx.amountPaid ?? undefined;
    dto.changeAmount = sourceTx.changeAmount ?? undefined;

    // CreateTransactionDto supports linking via relatedTransactionId today.
    // parentTransactionId exists in the entity, but is not exposed in the create DTO yet.
    if (linkMode && linkMode !== 'relatedTransactionId') {
      this.logger.warn(
        `linkMode=${linkMode} is not supported by CreateTransactionDto; using relatedTransactionId. ruleId=${rule?.id}`,
      );
    }
    dto.relatedTransactionId = sourceTx.id;

    const setFields = params.setFields && typeof params.setFields === 'object' ? params.setFields : null;
    if (setFields) {
      for (const [k, v] of Object.entries(setFields)) {
        (dto as any)[k] = v as any;
      }
    }

    const copyFields = Array.isArray(params.copyFields) ? params.copyFields.map(String) : [];
    for (const key of copyFields) {
      if ((dto as any)[key] === undefined && (sourceTx as any)[key] !== undefined) {
        (dto as any)[key] = (sourceTx as any)[key];
      }
    }

    // Lines strategy: none | copy | transform_cost
    const srcLines = Array.isArray(sourceTx.lines) ? sourceTx.lines : [];
    if (lineStrategy === 'copy') {
      dto.lines = srcLines.map((l: any) => ({
        productId: l.productId,
        productVariantId: l.productVariantId,
        unitId: l.unitId,
        taxId: l.taxId,
        productName: l.productName,
        productSku: l.productSku,
        variantName: l.variantName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unitCost: l.unitCost,
        discountPercentage: l.discountPercentage,
        discountAmount: l.discountAmount,
        taxRate: l.taxRate,
        taxAmount: l.taxAmount,
        subtotal: l.subtotal,
        total: l.total,
        notes: l.notes,
      }));
    } else if (lineStrategy === 'transform_cost') {
      dto.lines = srcLines.map((l: any) => {
        const qty = Number(l.quantity ?? 0) || 0;
        const unitCost = Number(l.unitCost ?? 0) || 0;
        const lineTotal = Number((qty * unitCost).toFixed(2));
        return {
          productId: l.productId,
          productVariantId: l.productVariantId,
          unitId: l.unitId,
          taxId: undefined,
          productName: l.productName,
          productSku: l.productSku,
          variantName: l.variantName,
          quantity: qty,
          unitPrice: unitCost,
          unitCost: unitCost,
          discountPercentage: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          subtotal: lineTotal,
          total: lineTotal,
          notes: l.notes,
        };
      });
    } else {
      dto.lines = [];
    }

    // Totals modes (useful for payment + inventory valuations)
    if (totalFrom === 'amountPaid') {
      const paid = Number(sourceTx.amountPaid ?? 0) || 0;
      dto.subtotal = paid;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = paid > 0 ? paid : Number(sourceTx.total ?? 0);
      dto.amountPaid = paid;
      // In contado-derived payments we want the PAYMENT_IN to be PAID by definition unless overridden.
      if (!dto.paymentStatus) {
        dto.paymentStatus = 'PAID' as any;
      }
    } else if (totalFrom === 'costTotal') {
      const costTotal = (dto.lines ?? []).reduce((acc: number, l: any) => acc + (Number(l.total ?? 0) || 0), 0);
      const t = Number(costTotal.toFixed(2));
      dto.subtotal = t;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = t > 0 ? t : Number(sourceTx.total ?? 0);
    }

    // Preserve metadata and add trace
    dto.metadata = {
      ...(sourceTx.metadata ?? {}),
      automation: {
        sourceTransactionId: sourceTx.id,
        ruleId: rule?.id,
        actionId: action?.id,
      },
    };

    const created = await this.transactionsService.createTransaction(dto);
    this.logger.log(
      `Derived transaction created id=${created.id} type=${created.transactionType} from=${sourceTx.id}`,
    );
  }
}

