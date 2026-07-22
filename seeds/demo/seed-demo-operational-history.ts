import type { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CapitalContributionsService } from '@modules/capital-contributions/application/capital-contributions.service';
import { BankTransfersService } from '@modules/bank-transfers/application/bank-transfers.service';
import { ReceptionsService } from '@modules/receptions/application/receptions.service';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { PRIMARY_BANK_ACCOUNT_KEY } from './config';
import {
  patchReceptionFiscalHistoricalDates,
  patchTransactionHistoricalDate,
  seedHistoricalDateFromDaysAgo,
} from './seed-demo-historical-dates.util';
import { buildSeedDemoPurchasePlan } from './seed-demo-purchase-plan';
import { collectSeedDevPhysicalVariants } from './catalog';
import {
  buildSupplierDocumentPayment,
  buildSupplierFiscalAmounts,
  computeLineSubtotalNeto,
} from './seed-demo-purchase-fiscal.util';
import { seedDemoSalesHistory } from './seed-demo-sales-history';
import { seedDemoOperationalExpenses } from './seed-demo-operational-expenses';

const ANA_SHAREHOLDER_DOC = '12.345.678-5';
const PRINCIPAL_HUB_CODE = 'CEV00001';

export async function seedDemoOperationalHistory(ctx: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  adminUserId: string;
  /** userName → userId de operadores POS para ventas. */
  operatorUserIds: Record<string, string>;
}): Promise<void> {
  const { app, dataSource, companyId, branchId, adminUserId, operatorUserIds } =
    ctx;

  const capitalService = app.get(CapitalContributionsService);
  const bankTransferService = app.get(BankTransfersService);
  const receptionsService = app.get(ReceptionsService);

  const ivaTaxId = await resolveIvaTaxId(dataSource, companyId);
  const shareholderId = await resolveShareholderId(dataSource, companyId, ANA_SHAREHOLDER_DOC);
  const cashHubId = await resolveCashHubId(dataSource, companyId, PRINCIPAL_HUB_CODE);
  const storageByCode = await loadStorageIds(dataSource, companyId);
  const variantBySku = await loadVariantIds(dataSource, companyId);
  const supplierByAlias = await loadSupplierIds(dataSource, companyId);

  const treasuryDate = seedHistoricalDateFromDaysAgo(180);
  console.log(`📅 Seed operativo: ancla tesorería ${treasuryDate}`);

  const capitalRes = await capitalService.create({
    shareholderId,
    bankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
    amount: 25_000_000,
    occurredOn: treasuryDate,
    notes: 'Aporte de capital seed — Ana García López',
  });
  if (!capitalRes.success || !capitalRes.data?.id) {
    throw new Error(`Aporte de capital seed falló: ${capitalRes.error ?? 'sin id'}`);
  }
  await patchTransactionHistoricalDate(app, dataSource, {
    companyId,
    transactionId: capitalRes.data.id,
    occurredOn: treasuryDate,
  });
  console.log(`✅ Aporte capital $25.000.000 → banco (${treasuryDate})`);

  const transferRes = await bankTransferService.create({
    bankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
    cashHubId,
    amount: 5_000_000,
    occurredOn: treasuryDate,
    notes: 'Dotación centro de efectivo Principal (seed)',
  });
  if (!transferRes.success || !transferRes.data?.id) {
    throw new Error(`Giro banco→caja seed falló: ${transferRes.error ?? 'sin id'}`);
  }
  await patchTransactionHistoricalDate(app, dataSource, {
    companyId,
    transactionId: transferRes.data.id,
    occurredOn: treasuryDate,
  });
  console.log(`✅ Giro banco→hub Principal $5.000.000 (${treasuryDate})`);

  await seedDemoOperationalExpenses({
    app,
    dataSource,
    companyId,
    branchId,
    userId: adminUserId,
  });

  let transferCount = 0;
  let checkCount = 0;
  let installmentCompleted = 0;
  let installmentPartial = 0;
  let installmentPending = 0;
  let fiscalDocCount = 0;
  let supplierPaymentCount = 0;

  const physicalFromCatalog = collectSeedDevPhysicalVariants().filter((v) =>
    variantBySku.has(v.sku),
  );
  const purchasePlan = buildSeedDemoPurchasePlan(physicalFromCatalog);
  const sortedPurchases = [...purchasePlan].sort((a, b) => b.daysAgo - a.daysAgo);

  console.log(
    `🛒 Plan compras seed: ${sortedPurchases.length} recepciones (PHYSICAL cubiertos=${physicalFromCatalog.length})`,
  );

  for (const doc of sortedPurchases) {
    const supplierId = supplierByAlias.get(normalizeAlias(doc.supplierAlias));
    if (!supplierId) {
      throw new Error(`Proveedor seed no encontrado: ${doc.supplierAlias}`);
    }
    const storageId = storageByCode.get(doc.storageCode);
    if (!storageId) {
      throw new Error(`Bodega seed no encontrada: ${doc.storageCode}`);
    }

    const occurredOn = seedHistoricalDateFromDaysAgo(doc.daysAgo);
    const lines = doc.lines.map((line) => {
      const productVariantId = variantBySku.get(line.sku);
      if (!productVariantId) {
        throw new Error(`Variante seed no encontrada: ${line.sku}`);
      }
      return {
        productVariantId,
        quantity: line.qty,
        receivedQuantity: line.qty,
        unitCost: line.unitCost,
        unitPrice: line.unitCost,
      };
    });

    const subtotalNeto = computeLineSubtotalNeto(doc.lines);
    const supplierFiscalAmounts = buildSupplierFiscalAmounts(subtotalNeto, ivaTaxId);
    const supplierDocumentPayment = buildSupplierDocumentPayment(
      doc,
      supplierFiscalAmounts.total,
      occurredOn,
    );

    if (doc.paymentStrategy === 'transfer') {
      transferCount += 1;
    } else if (doc.paymentStrategy === 'check') {
      checkCount += 1;
    } else if (supplierDocumentPayment.mode === 'COMPLETED') {
      installmentCompleted += 1;
    } else if (supplierDocumentPayment.mode === 'PARTIAL') {
      installmentPartial += 1;
    } else {
      installmentPending += 1;
    }

    const res = await receptionsService.createDirect({
      storageId,
      branchId,
      supplierId,
      userId: adminUserId,
      reference: doc.reference,
      dteType: 'invoice',
      lines,
      supplierFiscalAmounts,
      supplierDocumentPayment,
    });

    const txId =
      res?.transaction?.id ??
      (res?.reception as { transactionId?: string } | undefined)?.transactionId;
    if (!res?.success || !txId) {
      const err =
        (res as { transactionError?: string })?.transactionError ??
        'sin transacción PURCHASE';
      throw new Error(`Recepción seed ${doc.reference} falló: ${err}`);
    }
    if (res.supplierDocumentError) {
      throw new Error(
        `Documento fiscal seed ${doc.reference} falló: ${res.supplierDocumentError}`,
      );
    }

    const receptionId = (res.reception as { id?: string })?.id;
    if (!receptionId) {
      throw new Error(`Recepción seed ${doc.reference} sin id`);
    }

    await patchTransactionHistoricalDate(app, dataSource, {
      companyId,
      transactionId: String(txId),
      occurredOn,
      receptionId,
    });

    const fiscalPatch = await patchReceptionFiscalHistoricalDates(app, dataSource, {
      companyId,
      receptionId,
      occurredOn,
    });
    if (!fiscalPatch.fiscalDocId) {
      throw new Error(`Factura proveedor seed no creada para ${doc.reference}`);
    }
    fiscalDocCount += 1;
    supplierPaymentCount += fiscalPatch.paymentCount;

    const paymentLabel =
      doc.paymentStrategy === 'transfer'
        ? 'transferencia contado'
        : doc.paymentStrategy === 'check'
          ? 'cheque contado'
          : `cuotas ${supplierDocumentPayment.mode} (pagadas ${supplierDocumentPayment.paidInstallments}, pendientes ${supplierDocumentPayment.pendingInstallments})`;
    console.log(
      `✅ Recepción ${doc.reference} (${occurredOn}) — neto $${subtotalNeto.toLocaleString('es-CL')} + IVA $${supplierFiscalAmounts.taxAmount.toLocaleString('es-CL')} — ${paymentLabel}`,
    );
  }

  console.log(
    `📄 Documentos proveedor: ${fiscalDocCount} facturas · transfer=${transferCount} check=${checkCount} · cuotas completed=${installmentCompleted} partial=${installmentPartial} pending=${installmentPending} · líneas pago=${supplierPaymentCount}`,
  );

  await seedDemoSalesHistory({
    app,
    dataSource,
    companyId,
    branchId,
    operatorUserIds,
    purchasePlan,
  });

  await logOperationalSmokeSummary(dataSource, companyId, variantBySku);
}

async function resolveIvaTaxId(
  dataSource: DataSource,
  companyId: string,
): Promise<string> {
  const ivaTax = await dataSource.getRepository(Tax).findOne({
    where: { companyId, name: 'IVA', taxType: TaxType.IVA, deletedAt: null as never },
  });
  if (!ivaTax?.id) {
    throw new Error('Impuesto IVA seed no encontrado para la empresa demo');
  }
  return ivaTax.id;
}

async function resolveShareholderId(
  dataSource: DataSource,
  companyId: string,
  documentNumber: string,
): Promise<string> {
  const person = await dataSource.getRepository(Person).findOne({
    where: { documentNumber, deletedAt: null as never },
  });
  if (!person) {
    throw new Error(`Persona socio seed no encontrada: ${documentNumber}`);
  }
  const sh = await dataSource.getRepository(Shareholder).findOne({
    where: { companyId, personId: person.id, deletedAt: null as never },
  });
  if (!sh) {
    throw new Error(`Socio seed no encontrado para doc ${documentNumber}`);
  }
  return sh.id;
}

async function resolveCashHubId(
  dataSource: DataSource,
  companyId: string,
  code: string,
): Promise<string> {
  const hub = await dataSource.getRepository(CashHub).findOne({
    where: { companyId, code },
  });
  if (!hub) {
    throw new Error(`Centro de efectivo seed no encontrado: ${code}`);
  }
  return hub.id;
}

async function loadStorageIds(
  dataSource: DataSource,
  companyId: string,
): Promise<Map<string, string>> {
  const rows = await dataSource.getRepository(Storage).find({
    where: { companyId, deletedAt: null as never },
  });
  return new Map(
    rows
      .filter((s) => typeof s.code === 'string' && s.code.trim().length > 0)
      .map((s) => [s.code!, s.id]),
  );
}

async function loadVariantIds(
  dataSource: DataSource,
  companyId: string,
): Promise<Map<string, string>> {
  const rows = await dataSource.getRepository(ProductVariant).find({
    where: { companyId, deletedAt: null as never },
    select: ['id', 'sku'],
  });
  return new Map(
    rows
      .filter((v) => typeof v.sku === 'string' && v.sku.trim().length > 0)
      .map((v) => [v.sku, v.id]),
  );
}

async function loadSupplierIds(
  dataSource: DataSource,
  companyId: string,
): Promise<Map<string, string>> {
  const rows = await dataSource.getRepository(Supplier).find({
    where: { companyId, deletedAt: null as never },
    relations: ['person'],
  });
  const map = new Map<string, string>();
  for (const s of rows) {
    if (s.alias?.trim()) {
      map.set(normalizeAlias(s.alias), s.id);
    }
    const businessName = s.person?.businessName ?? s.person?.firstName ?? '';
    if (businessName.trim()) {
      map.set(normalizeAlias(businessName), s.id);
      const short = businessName.replace(/\s+SpA$/i, '').replace(/\s+SPA$/i, '').trim();
      map.set(normalizeAlias(short), s.id);
    }
  }
  return map;
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

async function logOperationalSmokeSummary(
  dataSource: DataSource,
  companyId: string,
  variantBySku: Map<string, string>,
): Promise<void> {
  const sampleSkus = [
    'SEEDDEVCAFE1KG',
    'SEEDDEVPOLS',
    'SEEDDEVACE1L',
    'SEEDDEVCUAROJ',
  ];
  const variantRepo = dataSource.getRepository(ProductVariant);
  const stockRepo = dataSource.getRepository(StockLevel);
  const receptionRepo = dataSource.getRepository(Reception);
  const txRepo = dataSource.getRepository(Transaction);

  const seedReceptions = await receptionRepo
    .createQueryBuilder('r')
    .where('r.reference LIKE :prefix', { prefix: 'F-SEED-%' })
    .getCount();

  const seedInvoices = await txRepo
    .createQueryBuilder('tx')
    .where('tx.transactionType = :type', { type: TransactionType.SUPPLIER_INVOICE })
    .andWhere(`(tx.metadata::jsonb #>> '{dteNumber}') LIKE :prefix`, {
      prefix: 'F-SEED-%',
    })
    .getCount();

  const seedSales = await txRepo
    .createQueryBuilder('tx')
    .where('tx.transactionType = :type', { type: TransactionType.SALE })
    .andWhere(`(tx.metadata::jsonb #>> '{origin}') = :origin`, {
      origin: 'SEED_DEMO_SALE',
    })
    .getCount();

  const receptionsWithTax = await receptionRepo
    .createQueryBuilder('r')
    .where('r.reference LIKE :prefix', { prefix: 'F-SEED-%' })
    .andWhere('r.taxAmount > 0')
    .getCount();

  console.log('📊 Resumen operativo seed (muestra):');
  console.log(
    `   • Recepciones F-SEED: ${seedReceptions}, facturas proveedor: ${seedInvoices}, ventas seed: ${seedSales}, recepciones con IVA: ${receptionsWithTax}`,
  );

  for (const sku of sampleSkus) {
    const variantId = variantBySku.get(sku);
    if (!variantId) continue;
    const variant = await variantRepo.findOne({
      where: { id: variantId },
      select: ['id', 'sku', 'pmp', 'pmpHistory'],
    });
    const stockRows = await stockRepo.find({
      where: { companyId, productVariantId: variantId },
    });
    const totalStock = stockRows.reduce((s, r) => s + Number(r.physicalStock ?? 0), 0);
    const historyLen = Array.isArray(variant?.pmpHistory) ? variant!.pmpHistory!.length : 0;
    console.log(
      `   • ${sku}: stock=${totalStock} pmp=${variant?.pmp ?? 'null'} historial=${historyLen}`,
    );
  }
}
