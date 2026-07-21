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
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { PRIMARY_BANK_ACCOUNT_KEY, SEED_STORAGE_CODE } from './config';
import {
  patchTransactionHistoricalDate,
  seedHistoricalDateFromDaysAgo,
} from './seed-demo-historical-dates.util';
import {
  buildSeedDemoSalesPlan,
  type SeedSalePaymentMethod,
} from './seed-demo-sales-plan';
import type { SeedPurchaseDoc } from './seed-demo-purchase-plan';

function roundClp(n: number): number {
  return Math.round(Number(n) || 0);
}

function mapPaymentMethod(method: SeedSalePaymentMethod): PaymentMethod {
  switch (method) {
    case 'CASH':
      return PaymentMethod.CASH;
    case 'DEBIT_CARD':
      return PaymentMethod.DEBIT_CARD;
    case 'CREDIT_CARD':
      return PaymentMethod.CREDIT_CARD;
    case 'TRANSFER':
      return PaymentMethod.TRANSFER;
    case 'CHECK':
      return PaymentMethod.CHECK;
    default:
      return PaymentMethod.CASH;
  }
}

export async function seedDemoSalesHistory(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  /** userName → userId de operadores POS (operador / operador2 / operador3). */
  operatorUserIds: Record<string, string>;
  /** Plan de compras ya ejecutado — ancla stock y horizonte de ventas. */
  purchasePlan: SeedPurchaseDoc[];
}): Promise<void> {
  const { app, dataSource, companyId, branchId, operatorUserIds, purchasePlan } =
    ctx;
  const transactionsService = app.get(TransactionsService);

  const ivaTax = await dataSource.getRepository(Tax).findOne({
    where: { companyId, name: 'IVA', taxType: TaxType.IVA, deletedAt: null as never },
  });
  if (!ivaTax?.id) {
    throw new Error('Impuesto IVA seed no encontrado para ventas demo');
  }

  const storage = await dataSource.getRepository(Storage).findOne({
    where: { companyId, code: SEED_STORAGE_CODE, deletedAt: null as never },
  });
  if (!storage) {
    throw new Error(`Bodega seed no encontrada: ${SEED_STORAGE_CODE}`);
  }

  const posByName = new Map<string, string>();
  const posRows = await dataSource.getRepository(PointOfSale).find({
    where: { companyId },
  });
  for (const p of posRows) {
    if (p.name?.trim()) posByName.set(p.name.trim(), p.id);
  }

  const variants = await dataSource.getRepository(ProductVariant).find({
    where: { companyId, deletedAt: null as never },
    relations: ['product'],
  });
  const variantBySku = new Map(
    variants.filter((v) => v.sku?.trim()).map((v) => [v.sku, v]),
  );

  const customers = await dataSource.getRepository(Customer).find({
    where: { companyId, deletedAt: null as never },
    relations: ['person'],
  });
  const customerByDoc = new Map<string, string>();
  const customerNameById = new Map<string, string>();
  for (const c of customers) {
    const person = c.person as Person | undefined;
    const doc = person?.documentNumber?.trim();
    if (doc) customerByDoc.set(doc, c.id);
    const business = person?.businessName?.trim();
    const full = [person?.firstName, person?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const name = business || full || null;
    if (name) customerNameById.set(c.id, name);
  }

  const salesPlan = buildSeedDemoSalesPlan(purchasePlan);
  const sorted = [...salesPlan].sort((a, b) => b.daysAgo - a.daysAgo);
  console.log(
    `🧾 Plan ventas seed: ${sorted.length} (≤90d=${sorted.filter((d) => d.daysAgo <= 90).length}, 91–180=${sorted.filter((d) => d.daysAgo > 90).length})`,
  );
  let saleCount = 0;
  const paymentCounts: Record<string, number> = {};
  const operatorCounts: Record<string, number> = {};
  const posCounts: Record<string, number> = {};
  let withCustomer = 0;
  let withoutCustomer = 0;

  for (const doc of sorted) {
    const operatorUserId = operatorUserIds[doc.operatorUserName];
    if (!operatorUserId) {
      throw new Error(
        `Operador POS seed no encontrado: ${doc.operatorUserName} (crear usuarios antes del historial de ventas)`,
      );
    }

    const posId = posByName.get(doc.posName);
    if (!posId) {
      throw new Error(`POS seed no encontrado: ${doc.posName}`);
    }

    let customerId: string | undefined;
    if (doc.customerDoc) {
      customerId = customerByDoc.get(doc.customerDoc);
      if (!customerId) {
        throw new Error(`Cliente seed no encontrado: ${doc.customerDoc}`);
      }
      withCustomer += 1;
    } else {
      withoutCustomer += 1;
    }

    const occurredOn = seedHistoricalDateFromDaysAgo(doc.daysAgo);
    const lines: CreateTransactionLineDto[] = [];
    let subtotal = 0;
    let taxAmount = 0;

    for (const line of doc.lines) {
      const variant = variantBySku.get(line.sku);
      if (!variant) {
        throw new Error(`Variante seed no encontrada para venta: ${line.sku}`);
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
    paymentCounts[doc.paymentMethod] = (paymentCounts[doc.paymentMethod] ?? 0) + 1;

    const treasuryBankAccountKey =
      paymentMethod === PaymentMethod.TRANSFER ||
      paymentMethod === PaymentMethod.CHECK
        ? PRIMARY_BANK_ACCOUNT_KEY
        : undefined;

    const paymentSnapshot: Record<string, unknown> = {
      method: paymentMethod,
      amount: total,
      bankAccountKey: treasuryBankAccountKey ?? null,
      capturedAt: `${occurredOn}T12:00:00.000Z`,
    };
    if (paymentMethod === PaymentMethod.CHECK) {
      const checkDigits = String(saleCount + 1).padStart(4, '0');
      const drawerName = customerId
        ? customerNameById.get(customerId) ?? 'Cliente mostrador'
        : 'Cliente mostrador';
      paymentSnapshot.checkData = {
        checkNumber: `SEED-IN-${checkDigits}`,
        bankName: 'Banco Estado',
        bankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
        drawerName,
        issueDate: occurredOn,
        dueDate: occurredOn,
      };
    }
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
    dto.customerId = customerId;
    dto.subtotal = subtotal;
    dto.taxAmount = taxAmount;
    dto.discountAmount = 0;
    dto.total = total;
    dto.paymentMethod = paymentMethod;
    dto.paymentStatus = PaymentStatus.PAID;
    dto.amountPaid = total;
    dto.changeAmount = 0;
    dto.bankAccountKey = treasuryBankAccountKey;
    dto.lines = lines;
    dto.notes = `Seed venta demo ${occurredOn}`;
    dto.metadata = {
      origin: 'SEED_DEMO_SALE',
      fulfillment: { deliveryMode: 'IMMEDIATE' },
      occurredOn,
      ...paymentsMeta,
    };

    const created = await transactionsService.createTransaction(dto);
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId,
      transactionId: created.id,
      occurredOn,
    });

    // Cobro explícito (como POS): «Pagos recibidos» lista PAYMENT_IN, no la SALE.
    const paymentInDto = new CreateTransactionDto();
    paymentInDto.transactionType = TransactionType.PAYMENT_IN;
    paymentInDto.branchId = branchId;
    paymentInDto.userId = operatorUserId;
    paymentInDto.pointOfSaleId = posId;
    paymentInDto.customerId = customerId;
    paymentInDto.relatedTransactionId = created.id;
    paymentInDto.subtotal = total;
    paymentInDto.taxAmount = 0;
    paymentInDto.discountAmount = 0;
    paymentInDto.total = total;
    paymentInDto.paymentMethod = paymentMethod;
    paymentInDto.paymentStatus = PaymentStatus.PAID;
    paymentInDto.amountPaid = total;
    paymentInDto.changeAmount = 0;
    paymentInDto.bankAccountKey = treasuryBankAccountKey;
    paymentInDto.lines = [];
    paymentInDto.notes = `Cobro seed de ${created.documentNumber}`;
    paymentInDto.metadata = {
      origin: 'SEED_DEMO_PAYMENT_IN',
      saleTransactionId: created.id,
      source: 'seed_sale',
      occurredOn,
      ...paymentsMeta,
    };

    const paymentIn = await transactionsService.createTransaction(paymentInDto);
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId,
      transactionId: paymentIn.id,
      occurredOn,
    });

    saleCount += 1;
    operatorCounts[doc.operatorUserName] =
      (operatorCounts[doc.operatorUserName] ?? 0) + 1;
    posCounts[doc.posName] = (posCounts[doc.posName] ?? 0) + 1;
    console.log(
      `✅ Venta seed ${created.documentNumber} + cobro ${paymentIn.documentNumber} (${occurredOn}) — $${total.toLocaleString('es-CL')} · ${doc.posName} · ${doc.operatorUserName} · ${doc.paymentMethod}${customerId ? ' · con cliente' : ' · mostrador'}`,
    );
  }

  console.log(
    `🧾 Ventas seed: ${saleCount} (con cliente ${withCustomer}, mostrador ${withoutCustomer}) · cobros PAYMENT_IN=${saleCount} · POS ${Object.entries(
      posCounts,
    )
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')} · ops ${Object.entries(operatorCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')} · mix ${Object.entries(paymentCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
  );
}
