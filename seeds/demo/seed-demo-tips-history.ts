import type { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import {
  DiningOrderKind,
  DiningOrderStatus,
} from '@modules/dining/domain/dining.enums';
import { TipsService } from '@modules/tips/application/tips.service';
import {
  TipLedgerEntry,
} from '@modules/tips/domain/tip-ledger-entry.entity';
import {
  TIP_CARD_DUE_BUSINESS_DAYS,
  addBusinessDaysUtc,
  isCardTipPaymentMethod,
} from '@modules/tips/domain/tip-business-days.util';
import { SEED_STORAGE_CODE } from './config';
import {
  patchTransactionHistoricalDate,
  seedHistoricalDateFromDaysAgo,
} from './seed-demo-historical-dates.util';
import {
  TIP_OVERDUE_MIN_DAYS_AGO,
  TIP_SUGGEST_PERCENT,
  buildSeedDemoTipsPlan,
  type SeedTipPaymentMethod,
} from './seed-demo-tips-plan';

function roundClp(n: number): number {
  return Math.round(Number(n) || 0);
}

function mapPaymentMethod(method: SeedTipPaymentMethod): PaymentMethod {
  switch (method) {
    case 'CASH':
      return PaymentMethod.CASH;
    case 'DEBIT_CARD':
      return PaymentMethod.DEBIT_CARD;
    case 'CREDIT_CARD':
      return PaymentMethod.CREDIT_CARD;
    default:
      return PaymentMethod.CASH;
  }
}

export async function seedDemoTipsHistory(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  operatorUserIds: Record<string, string>;
  waiterUserIds: Record<string, string>;
}): Promise<void> {
  const {
    app,
    dataSource,
    companyId,
    branchId,
    operatorUserIds,
    waiterUserIds,
  } = ctx;

  const transactionsService = app.get(TransactionsService);
  const tipsService = app.get(TipsService);
  const ledgerRepo = dataSource.getRepository(TipLedgerEntry);
  const diningOrderRepo = dataSource.getRepository(DiningOrder);

  const ivaTax = await dataSource.getRepository(Tax).findOne({
    where: {
      companyId,
      name: 'IVA',
      taxType: TaxType.IVA,
      deletedAt: null as never,
    },
  });
  if (!ivaTax?.id) {
    throw new Error('Impuesto IVA seed no encontrado para tip-sales demo');
  }

  const storage = await dataSource.getRepository(Storage).findOne({
    where: { companyId, code: SEED_STORAGE_CODE, deletedAt: null as never },
  });
  if (!storage) {
    throw new Error(`Bodega seed no encontrada: ${SEED_STORAGE_CODE}`);
  }

  const posByName = new Map<string, string>();
  for (const p of await dataSource.getRepository(PointOfSale).find({
    where: { companyId },
  })) {
    if (p.name?.trim()) posByName.set(p.name.trim(), p.id);
  }

  const variants = await dataSource.getRepository(ProductVariant).find({
    where: { companyId, deletedAt: null as never },
    relations: ['product'],
  });
  const variantBySku = new Map(
    variants.filter((v) => v.sku?.trim()).map((v) => [v.sku, v]),
  );

  const rooms = await dataSource.getRepository(DiningRoom).find({
    where: { companyId, branchId },
  });
  const allTables: DiningTable[] = [];
  for (const room of rooms) {
    const roomTables = await dataSource.getRepository(DiningTable).find({
      where: { diningRoomId: room.id },
    });
    allTables.push(...roomTables);
  }
  const tableByCode = new Map(allTables.map((t) => [t.code, t]));
  if (tableByCode.size === 0) {
    throw new Error('No hay mesas dining seed para tip-sales');
  }

  const plan = buildSeedDemoTipsPlan();
  const sorted = [...plan].sort((a, b) => b.daysAgo - a.daysAgo);
  console.log(
    `🍽️  Plan tip-sales KaiFood: ${sorted.length} (horizonte ≤${Math.max(...sorted.map((d) => d.daysAgo))}d)`,
  );

  let saleCount = 0;
  let attributed = 0;
  let unattributed = 0;
  let overduePatched = 0;
  const waiterCounts: Record<string, number> = {};
  const paymentCounts: Record<string, number> = {};

  for (const doc of sorted) {
    const operatorUserId = operatorUserIds[doc.operatorUserName];
    if (!operatorUserId) {
      throw new Error(
        `Operador POS seed no encontrado: ${doc.operatorUserName}`,
      );
    }
    const waiterUserId = waiterUserIds[doc.waiterUserName];
    if (!waiterUserId) {
      throw new Error(`Mesero seed no encontrado: ${doc.waiterUserName}`);
    }

    const posId = posByName.get(doc.posName);
    if (!posId) {
      throw new Error(`POS seed no encontrado: ${doc.posName}`);
    }

    const table = tableByCode.get(doc.tableCode);
    if (!table) {
      throw new Error(`Mesa seed no encontrada: ${doc.tableCode}`);
    }
    const room = rooms.find((r) => r.id === table.diningRoomId);

    const occurredOn = seedHistoricalDateFromDaysAgo(doc.daysAgo);
    const openedAt = new Date(`${occurredOn}T11:00:00.000Z`);
    const closedAt = new Date(`${occurredOn}T12:30:00.000Z`);

    const order = diningOrderRepo.create({
      companyId,
      branchId,
      kind: DiningOrderKind.TABLE,
      diningTableId: table.id,
      diningRoomId: room?.id ?? table.diningRoomId,
      displayLabel: table.label || doc.tableCode,
      openedByUserId: waiterUserId,
      status: DiningOrderStatus.CLOSED,
      profile: {
        adultCount: 2,
        notes: `Seed tip-sale ${doc.index}`,
      },
      openedAt,
      closedAt,
    });
    const savedOrder = await diningOrderRepo.save(order);

    const lines: CreateTransactionLineDto[] = [];
    let subtotal = 0;
    let taxAmount = 0;
    for (const line of doc.lines) {
      const variant = variantBySku.get(line.sku);
      if (!variant) {
        throw new Error(`Variante seed no encontrada para tip-sale: ${line.sku}`);
      }
      const unitNet = roundClp(line.unitPriceNet);
      const lineSub = roundClp(unitNet * line.qty);
      const lineTax = roundClp(lineSub * 0.19);
      const unitCost =
        variant.pmp != null && Number(variant.pmp) > 0
          ? Number(variant.pmp)
          : Number(variant.baseCost ?? 0) || 0;
      lines.push({
        productId: variant.productId,
        productVariantId: variant.id,
        productName: variant.product?.name ?? line.sku,
        productSku: variant.sku,
        quantity: line.qty,
        unitPrice: unitNet,
        unitCost,
        discountPercentage: 0,
        discountAmount: 0,
        taxId: ivaTax.id,
        taxRate: 19,
        taxAmount: lineTax,
        subtotal: lineSub,
        total: lineSub + lineTax,
      });
      subtotal += lineSub;
      taxAmount += lineTax;
    }

    const total = subtotal + taxAmount;
    const paymentMethod = mapPaymentMethod(doc.paymentMethod);
    paymentCounts[doc.paymentMethod] =
      (paymentCounts[doc.paymentMethod] ?? 0) + 1;

    const paymentSnapshot: Record<string, unknown> = {
      method: paymentMethod,
      amount: total + doc.tipAmount,
      bankAccountKey: null,
      capturedAt: `${occurredOn}T12:30:00.000Z`,
    };
    const tipMeta = {
      tipAmount: doc.tipAmount,
      tipStatus: 'ACCEPTED',
      tipSuggestedAmount: doc.tipSuggestedAmount,
      tipPercentApplied: TIP_SUGGEST_PERCENT,
      diningOrderId: savedOrder.id,
    };
    const paymentsMeta = {
      payments: [paymentSnapshot],
      paymentSnapshots: [paymentSnapshot],
    };

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SALE;
    dto.branchId = branchId;
    dto.userId = operatorUserId;
    dto.pointOfSaleId = posId;
    dto.storageId = storage.id;
    dto.subtotal = subtotal;
    dto.taxAmount = taxAmount;
    dto.discountAmount = 0;
    dto.total = total;
    dto.paymentMethod = paymentMethod;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = total + doc.tipAmount;
    dto.changeAmount = 0;
    dto.lines = lines;
    dto.notes = `Seed tip-sale salón ${occurredOn} · ${doc.waiterUserName}`;
    dto.metadata = {
      origin: 'SEED_DEMO_TIP_SALE',
      fulfillment: { deliveryMode: 'IMMEDIATE' },
      occurredOn,
      ...tipMeta,
      ...paymentsMeta,
    };

    const created = await transactionsService.createTransaction(dto);
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId,
      transactionId: created.id,
      occurredOn,
    });

    const paymentInDto = new CreateTransactionDto();
    paymentInDto.transactionType = TransactionType.PAYMENT_IN;
    paymentInDto.branchId = branchId;
    paymentInDto.userId = operatorUserId;
    paymentInDto.pointOfSaleId = posId;
    paymentInDto.relatedTransactionId = created.id;
    paymentInDto.subtotal = total + doc.tipAmount;
    paymentInDto.taxAmount = 0;
    paymentInDto.discountAmount = 0;
    paymentInDto.total = total + doc.tipAmount;
    paymentInDto.paymentMethod = paymentMethod;
    paymentInDto.paymentStatus = PaymentStatus.PAID;
    paymentInDto.amountPaid = total + doc.tipAmount;
    paymentInDto.changeAmount = 0;
    paymentInDto.lines = [];
    paymentInDto.notes = `Cobro tip-sale seed de ${created.documentNumber}`;
    paymentInDto.metadata = {
      origin: 'SEED_DEMO_TIP_PAYMENT_IN',
      saleTransactionId: created.id,
      source: 'seed_tip_sale',
      occurredOn,
      ...tipMeta,
      ...paymentsMeta,
    };

    const paymentIn = await transactionsService.createTransaction(paymentInDto);
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId,
      transactionId: paymentIn.id,
      occurredOn,
    });

    const ledger = await tipsService.maybeRecordFromSale({
      companyId,
      branchId,
      saleTransactionId: created.id,
      diningOrderId: savedOrder.id,
      metadata: tipMeta,
      paymentMethod: String(paymentMethod),
    });

    if (!ledger) {
      throw new Error(
        `Tip ledger no creado para SALE ${created.id} (¿tips.enabled?)`,
      );
    }

    const occurredAt = new Date(`${occurredOn}T12:30:00.000Z`);
    const patch: Partial<TipLedgerEntry> = {
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };

    if (isCardTipPaymentMethod(String(paymentMethod))) {
      const dueAt = addBusinessDaysUtc(occurredAt, TIP_CARD_DUE_BUSINESS_DAYS);
      patch.dueAt = dueAt;
      if (doc.daysAgo >= TIP_OVERDUE_MIN_DAYS_AGO) {
        overduePatched += 1;
      }
    } else {
      patch.dueAt = null;
    }

    if (doc.leaveUnattributed) {
      patch.employeeId = null;
      patch.attributedAt = null;
      unattributed += 1;
    } else {
      attributed += 1;
      waiterCounts[doc.waiterUserName] =
        (waiterCounts[doc.waiterUserName] ?? 0) + 1;
    }

    await ledgerRepo.update(ledger.id, patch as Record<string, unknown>);

    saleCount += 1;
  }

  console.log(
    `🍽️  Tip-sales seed: ${saleCount} · atribuidas=${attributed} · pozo=${unattributed} · tarjeta overdue(dueAt pasado)=${overduePatched} · meseros ${Object.entries(
      waiterCounts,
    )
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')} · mix ${Object.entries(paymentCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
  );
}
