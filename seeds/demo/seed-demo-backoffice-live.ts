import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { LaundryReception } from '@modules/laundry/domain/laundry-reception.entity';
import { LaundryReceptionGarment } from '@modules/laundry/domain/laundry-reception-garment.entity';
import { LaundryReceptionServiceLine } from '@modules/laundry/domain/laundry-reception-service-line.entity';
import { LaundryGarmentType } from '@modules/laundry/domain/laundry-garment-type.entity';
import { LaundryReceptionStatus } from '@modules/laundry/domain/laundry-reception-status.enum';
import { LaundryPaymentMode } from '@modules/laundry/domain/laundry-payment-mode.enum';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import {
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import type { ProductionOrderMetadata } from '@modules/orders/application/production-order.metadata';
import { SEED_POS_NAMES, SEED_STORAGE_CODE, SEED_STORAGE_PASTELERIA_CODE } from './config';
import { seedHistoricalDateFromDaysAgo } from './seed-demo-historical-dates.util';

const FINISHED_TYPES = [
  ProductType.MANUFACTURADO,
  ProductType.ELABORADO,
  ProductType.PREPARADO,
] as const;

const FINISHED_QTY = 48;

/** Stock de salida para carta / taller (sin orden de producción completa). */
export async function seedDemoFinishedGoodsStock(ctx: {
  dataSource: DataSource;
  companyId: string;
  storageCode?: string;
  qty?: number;
}): Promise<void> {
  const { dataSource, companyId } = ctx;
  const storageCode = ctx.storageCode ?? SEED_STORAGE_CODE;
  const qty = ctx.qty ?? FINISHED_QTY;

  const storage = await dataSource.getRepository(Storage).findOne({
    where: { companyId, code: storageCode },
  });
  if (!storage) {
    console.warn(`⚠️  Stock productos terminados: bodega ${storageCode} no encontrada`);
    return;
  }

  const products = await dataSource.getRepository(Product).find({
    where: { companyId, productType: In([...FINISHED_TYPES]) },
    select: ['id', 'name', 'productType'],
  });
  if (!products.length) {
    console.log('⏭️  Sin productos MANUFACTURADO/ELABORADO/PREPARADO para stock de salida');
    return;
  }

  const variants = await dataSource.getRepository(ProductVariant).find({
    where: {
      companyId,
      productId: In(products.map((p) => p.id)),
      trackInventory: true,
    },
  });

  const stockRepo = dataSource.getRepository(StockLevel);
  let updated = 0;
  for (const variant of variants) {
    let sl = await stockRepo.findOne({
      where: { productVariantId: variant.id, storageId: storage.id },
    });
    if (!sl) {
      sl = stockRepo.create({
        companyId,
        productVariantId: variant.id,
        storageId: storage.id,
        physicalStock: qty,
        committedStock: 0,
        availableStock: qty,
        incomingStock: 0,
      });
    } else {
      const next = Number(sl.physicalStock ?? 0) + qty;
      sl.physicalStock = next;
      sl.availableStock = next - Number(sl.committedStock ?? 0);
    }
    await stockRepo.save(sl);
    updated += 1;
  }
  console.log(
    `✅ Stock de producción/carta: +${qty} en ${updated} variante(s) (${storage.name})`,
  );
}

export async function seedDemoBackofficeLive(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  adminUserId: string;
  operatorUserId: string;
}): Promise<void> {
  const { app, dataSource, companyId, branchId, adminUserId, operatorUserId } = ctx;

  await seedDemoCashSessions({
    dataSource,
    companyId,
    operatorUserId,
  });
  await seedDemoProductionBatches({
    app,
    dataSource,
    companyId,
    branchId,
    userId: adminUserId,
    includeTextile: true,
    includePastry: true,
  });
  await seedDemoLaundryTickets({
    dataSource,
    companyId,
    branchId,
    userId: operatorUserId,
  });
  await seedDemoOpenQuotation({
    app,
    dataSource,
    companyId,
    branchId,
    userId: adminUserId,
  });
}

async function seedDemoCashSessions(ctx: {
  dataSource: DataSource;
  companyId: string;
  operatorUserId: string;
}): Promise<void> {
  const pos = await ctx.dataSource.getRepository(PointOfSale).findOne({
    where: { companyId: ctx.companyId, name: SEED_POS_NAMES[0] },
  });
  if (!pos) {
    console.warn('⚠️  Sesiones de caja: Caja 1 no encontrada');
    return;
  }

  const repo = ctx.dataSource.getRepository(CashSession);
  const yesterday = new Date(`${seedHistoricalDateFromDaysAgo(1)}T21:30:00.000Z`);
  const yesterdayOpen = new Date(`${seedHistoricalDateFromDaysAgo(1)}T12:00:00.000Z`);

  const closed = repo.create({
    companyId: ctx.companyId,
    pointOfSaleId: pos.id,
    openedById: ctx.operatorUserId,
    closedById: ctx.operatorUserId,
    status: CashSessionStatus.CLOSED,
    openingAmount: 80_000,
    closingAmount: 215_400,
    expectedAmount: 214_800,
    difference: 600,
    openedAt: yesterdayOpen,
    closedAt: yesterday,
    notes: 'Cierre seed — Caja 1 (ayer)',
  });
  await repo.save(closed);

  const open = repo.create({
    companyId: ctx.companyId,
    pointOfSaleId: pos.id,
    openedById: ctx.operatorUserId,
    status: CashSessionStatus.OPEN,
    openingAmount: 80_000,
    openedAt: new Date(),
    notes: 'Apertura seed — Caja 1 (hoy)',
  });
  await repo.save(open);
  console.log('✅ Sesiones de caja seed: Caja 1 cerrada ayer + abierta hoy');
}

export async function seedDemoProductionBatches(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  userId: string;
  includeTextile?: boolean;
  includePastry?: boolean;
}): Promise<void> {
  const includeTextile = ctx.includeTextile ?? false;
  const includePastry = ctx.includePastry ?? false;
  if (!includeTextile && !includePastry) return;

  const jobs: Array<{
    unitCode: string;
    sku: string;
    qty: number;
    notes: string;
    inputStorageCode: string;
  }> = [];
  if (includeTextile) {
    jobs.push({
      unitCode: 'TALLER',
      sku: 'SEEDDEVMANCAMI',
      qty: 24,
      notes: 'Lote seed taller textil — camiseta básica',
      inputStorageCode: SEED_STORAGE_CODE,
    });
  }
  if (includePastry) {
    jobs.push({
      unitCode: 'PASTELERIA',
      sku: 'SEEDDEVELABMEDMAN',
      qty: 36,
      notes: 'Lote seed pastelería — medialuna mantequilla',
      inputStorageCode: SEED_STORAGE_PASTELERIA_CODE,
    });
  }

  const outputStorage = await ctx.dataSource.getRepository(Storage).findOne({
    where: { companyId: ctx.companyId, code: SEED_STORAGE_CODE },
  });
  if (!outputStorage) {
    console.warn('⚠️  Lotes de producción omitidos (bodega principal ausente)');
    return;
  }

  const txService = ctx.app.get(TransactionsService);
  let created = 0;
  for (const job of jobs) {
    try {
      const unit = await ctx.dataSource.getRepository(ProductionUnit).findOne({
        where: {
          companyId: ctx.companyId,
          code: job.unitCode,
          scope: ProductionUnitScope.COMPANY,
          purpose: ProductionUnitPurpose.BATCH,
        },
      });
      if (!unit) {
        console.log(`⏭️  Lote ${job.unitCode} omitido (unidad ausente)`);
        continue;
      }

      const inputStorage = await ctx.dataSource.getRepository(Storage).findOne({
        where: { companyId: ctx.companyId, code: job.inputStorageCode },
      });
      if (!inputStorage) {
        console.log(`⏭️  Lote ${job.unitCode} omitido (bodega ${job.inputStorageCode} ausente)`);
        continue;
      }

      const variant = await ctx.dataSource.getRepository(ProductVariant).findOne({
        where: { companyId: ctx.companyId, sku: job.sku },
        relations: ['product'],
      });
      if (!variant?.product) {
        console.log(`⏭️  Lote ${job.unitCode} omitido (SKU ${job.sku} ausente)`);
        continue;
      }

      const routing = await ctx.dataSource
        .getRepository(ProductVariantProductionUnit)
        .findOne({
          where: {
            productVariantId: variant.id,
            productionUnitId: unit.id,
          },
        });
      if (!routing) {
        console.log(
          `⏭️  Lote ${job.unitCode} omitido (${job.sku} no enrutado a la unidad)`,
        );
        continue;
      }

      const lineKey = randomUUID();
      const productionOrder: ProductionOrderMetadata = {
        productionUnitId: unit.id,
        capacity: job.qty,
        plannedStartAt: seedHistoricalDateFromDaysAgo(2),
        plannedDeliveryAt: seedHistoricalDateFromDaysAgo(0),
        lots: [
          {
            lineKey,
            productVariantId: variant.id,
            quantity: job.qty,
            notes: job.notes,
            attributes: [],
          },
        ],
      };

      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PRODUCTION_BATCH;
      dto.transactionStatus = TransactionStatus.DRAFT;
      dto.branchId = ctx.branchId;
      dto.userId = ctx.userId;
      dto.storageId = inputStorage.id;
      dto.subtotal = 0;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = 0;
      dto.notes = job.notes;
      dto.metadata = {
        origin: 'SEED_DEMO_PRODUCTION_BATCH',
        links: {
          productionUnitId: unit.id,
          outputStorageId: outputStorage.id,
        },
        productionOrder,
      };
      dto.lines = [
        {
          productVariantId: variant.id,
          quantity: job.qty,
          productName: `${variant.product.name} (${variant.sku})`,
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          notes: job.notes,
        },
      ];

      const tx = await txService.createTransaction(dto);
      created += 1;
      console.log(
        `✅ Lote producción seed ${job.unitCode} ${tx.documentNumber} (${job.sku} × ${job.qty}, DRAFT)`,
      );
    } catch (err) {
      console.warn(
        `⚠️  Lote ${job.unitCode} omitido: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (created === 0) {
    console.log('⏭️  Sin lotes de producción seed creados');
  }
}

async function seedDemoLaundryTickets(ctx: {
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  userId: string;
}): Promise<void> {
  try {
    await insertSeedLaundryTickets(ctx);
  } catch (err) {
    console.warn(
      `⚠️  Guías lavandería omitidas: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function insertSeedLaundryTickets(ctx: {
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  userId: string;
}): Promise<void> {
  const typeRepo = ctx.dataSource.getRepository(LaundryGarmentType);
  const shirt = await typeRepo.findOne({
    where: { companyId: ctx.companyId, code: 'CAMISA' },
  });
  const pants = await typeRepo.findOne({
    where: { companyId: ctx.companyId, code: 'PANTALON' },
  });
  if (!shirt || !pants) {
    console.log('⏭️  Guías lavandería omitidas (catálogo de tipos ausente)');
    return;
  }

  const variant = await ctx.dataSource.getRepository(ProductVariant).findOne({
    where: { companyId: ctx.companyId, sku: 'SEEDDEVLAVPRD' },
  });
  if (!variant) {
    console.log('⏭️  Guías lavandería omitidas (SKU SEEDDEVLAVPRD ausente)');
    return;
  }

  const customers = await ctx.dataSource.getRepository(Customer).find({
    where: { companyId: ctx.companyId, isActive: true },
    relations: ['person'],
    take: 3,
  });
  if (customers.length === 0) {
    console.log('⏭️  Guías lavandería omitidas (sin clientes)');
    return;
  }

  const pos = await ctx.dataSource.getRepository(PointOfSale).findOne({
    where: { companyId: ctx.companyId, name: SEED_POS_NAMES[0] },
  });

  const receptionRepo = ctx.dataSource.getRepository(LaundryReception);
  const garmentRepo = ctx.dataSource.getRepository(LaundryReceptionGarment);
  const lineRepo = ctx.dataSource.getRepository(LaundryReceptionServiceLine);
  const statuses = [
    LaundryReceptionStatus.RECEIVED,
    LaundryReceptionStatus.IN_PROCESS,
    LaundryReceptionStatus.READY,
  ] as const;
  const types = [shirt, pants, shirt];

  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length]!;
    const person = customer.person as Person | undefined;
    const unitPrice = 2500;
    const qty = 1 + (i % 2);
    const total = unitPrice * qty;
    const status = statuses[i]!;
    const now = new Date();
    const reception = await receptionRepo.save(
      receptionRepo.create({
        companyId: ctx.companyId,
        branchId: ctx.branchId,
        pointOfSaleId: pos?.id ?? null,
        userId: ctx.userId,
        code: `LAV-SEED-${String(i + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerNameSnapshot:
          person?.businessName ||
          [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
          'Cliente lavandería',
        customerPhoneSnapshot: person?.phone ?? null,
        status,
        paymentMode: LaundryPaymentMode.FULL_ON_PICKUP,
        depositAmount: 0,
        paidAmount: 0,
        balanceDue: total,
        servicesTotal: total,
        receivedAt: now,
        promisedAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        readyAt: status === LaundryReceptionStatus.READY ? now : null,
        notes: 'Guía seed lavandería (backoffice Store)',
      }),
    );

    const garment = await garmentRepo.save(
      garmentRepo.create({
        receptionId: reception.id,
        garmentTypeId: types[i]!.id,
        quantity: qty,
        attributeValues: [],
        sortOrder: 0,
      }),
    );

    await lineRepo.save(
      lineRepo.create({
        receptionId: reception.id,
        garmentId: garment.id,
        productVariantId: variant.id,
        quantity: qty,
        unitPrice,
        lineTotal: total,
        sortOrder: 0,
      }),
    );
  }

  console.log('✅ Guías lavandería seed: 3 (recibida / en proceso / lista)');
}

async function seedDemoOpenQuotation(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  userId: string;
}): Promise<void> {
  const variant = await ctx.dataSource.getRepository(ProductVariant).findOne({
    where: { companyId: ctx.companyId, sku: 'SEEDDEVCAFE500' },
    relations: ['product'],
  });
  if (!variant?.product) {
    console.log('⏭️  Cotización omitida (SKU café no encontrado)');
    return;
  }

  const customer = await ctx.dataSource.getRepository(Customer).findOne({
    where: { companyId: ctx.companyId, isActive: true },
    relations: ['person'],
  });
  const iva = await ctx.dataSource.getRepository(Tax).findOne({
    where: { companyId: ctx.companyId, name: 'IVA', taxType: TaxType.IVA },
  });

  const qty = 6;
  const unitNet = Number(variant.basePrice ?? 4990);
  const subtotal = Math.round(unitNet * qty);
  const taxAmount = Math.round(subtotal * 0.19);
  const person = customer?.person as Person | undefined;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 10);

  const dto = new CreateTransactionDto();
  dto.transactionType = TransactionType.QUOTATION;
  dto.branchId = ctx.branchId;
  dto.userId = ctx.userId;
  dto.customerId = customer?.id;
  dto.subtotal = subtotal;
  dto.taxAmount = taxAmount;
  dto.discountAmount = 0;
  dto.total = subtotal + taxAmount;
  dto.paymentStatus = PaymentStatus.PENDING;
  dto.notes = 'Cotización seed — café molido 500 g × 6';
  dto.metadata = {
    origin: 'SEED_DEMO_QUOTATION',
    quotation: {
      issuedAt: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
      validityDays: 10,
      terms: null,
      currency: 'CLP',
      priceListId: null,
      convertedToTransactionId: null,
      convertedToDocumentNumber: null,
      convertedAt: null,
    },
    customerSnapshot: {
      name:
        person?.businessName ||
        [person?.firstName, person?.lastName].filter(Boolean).join(' ') ||
        null,
      document: person?.documentNumber ?? null,
      phone: person?.phone ?? null,
    },
  };
  dto.lines = [
    {
      productId: variant.productId,
      productVariantId: variant.id,
      productName: variant.product.name,
      productSku: variant.sku,
      quantity: qty,
      unitPrice: unitNet,
      unitCost: Number(variant.baseCost ?? 0),
      discountPercentage: 0,
      discountAmount: 0,
      taxId: iva?.id,
      taxRate: 19,
      taxAmount,
      subtotal,
      total: subtotal + taxAmount,
    },
  ];

  try {
    const tx = await ctx.app.get(TransactionsService).createTransaction(dto);
    console.log(`✅ Cotización seed abierta ${tx.documentNumber}`);
  } catch (err) {
    console.warn(
      `⚠️  Cotización seed omitida: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
