import type { INestApplicationContext } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  Person,
  PersonType,
  DocumentType,
  AccountTypeName,
  BankName,
} from '@modules/persons/domain/person.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import {
  OperationalExpense,
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '@modules/operational-expenses/domain/operational-expense.entity';
import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { PRIMARY_BANK_ACCOUNT_KEY } from './config';
import { patchTransactionHistoricalDate } from './seed-demo-historical-dates.util';

const PRINCIPAL_HUB_CODE = 'CEV00001';

type SeedOeSupplierDef = {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  supplier: {
    supplierType: SupplierType;
    alias: string;
    defaultPaymentTermDays: number;
    isActive: boolean;
    notes?: string;
  };
};

/** Proveedores de servicio OE (además de RetailHub / EnvasesPacifico / LogisticaCG del catálogo mercadería). */
export const SEED_DEMO_OE_SUPPLIERS: readonly SeedOeSupplierDef[] = [
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Inmobiliaria Centro Parral Ltda',
      businessName: 'Inmobiliaria Centro Parral Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '76.801.111-2',
      email: 'arriendos@inmoparral.cl',
      phone: '+56 71 234 1100',
      address: 'Anibal Pinto 200, Parral',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'ArriendoParral',
      defaultPaymentTermDays: 5,
      isActive: true,
      notes: 'Arrendador local comercial seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'CGE Distribución Parral SpA',
      businessName: 'CGE Distribución Parral SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.802.222-3',
      email: 'empresas@cge-parral.cl',
      phone: '+56 600 200 1000',
      address: 'Av. Bernardo OHiggins 900, Parral',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'CGEParral',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Suministro eléctrico seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Aguas del Maule S.A.',
      businessName: 'Aguas del Maule S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.803.333-4',
      email: 'empresas@aguasmaule.cl',
      phone: '+56 71 220 3000',
      address: 'Calle 1 Sur 1200, Talca',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'AguasMaule',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Agua potable seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Telefónica Móviles Chile S.A.',
      businessName: 'Telefónica Móviles Chile S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.804.444-5',
      email: 'empresas@movistar.cl',
      phone: '+56 600 600 3000',
      address: 'Av. Providencia 111, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'MovistarEmpresas',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Internet y telefonía seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Estudio Contable Kai Sur SpA',
      businessName: 'Estudio Contable Kai Sur SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.805.555-6',
      email: 'contacto@estudiokaisur.cl',
      phone: '+56 71 211 4455',
      address: 'Calle Dieciocho 50, Parral',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'EstudioContableKS',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Contabilidad y apoyo tributario seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Mapfre Seguros Generales S.A.',
      businessName: 'Mapfre Seguros Generales S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.806.666-7',
      email: 'empresas@mapfre.cl',
      phone: '+56 2 2411 5000',
      address: 'Av. Apoquindo 3000, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'MapfreOperativo',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Pólizas operativas seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Empresa Nacional del Petróleo',
      businessName: 'Empresa Nacional del Petróleo',
      documentType: DocumentType.RUT,
      documentNumber: '76.807.777-8',
      email: 'flota@copec.cl',
      phone: '+56 2 2468 1000',
      address: 'El Bosque Norte 0177, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'CopecFlota',
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Combustible y peajes seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Agencia Local Parral SpA',
      businessName: 'Agencia Local Parral SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.808.888-9',
      email: 'hola@agencialocalparral.cl',
      phone: '+56 9 8765 4321',
      address: 'Plaza de Armas 10, Parral',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'AgenciaLocal',
      defaultPaymentTermDays: 7,
      isActive: true,
      notes: 'Promociones y marketing operativo seed demo.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Servicios Locales Parral EIRL',
      businessName: 'Servicios Locales Parral EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.809.999-K',
      email: 'ops@servicioslocalesparral.cl',
      phone: '+56 9 7000 8811',
      address: 'Pasaje Los Olivos 33, Parral',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'ServiciosLocales',
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Limpieza y mantención seed demo.',
    },
  },
];

/** Aliases del catálogo mercadería que también pagan OE (se les asegura cuenta banco). */
const REUSED_OE_SUPPLIER_ALIASES = [
  'RetailHub',
  'EnvasesPacifico',
  'LogisticaCG',
] as const;

type PaymentKind = 'TRANSFER' | 'CASH';

type ExpenseSeedDef = {
  categoryName: string;
  supplierAlias: string;
  refPrefix: string;
  nameTemplate: string;
  subtotal: number;
  monthIndex: number;
  day: number;
  payment: PaymentKind;
};

function clpWithIva(subtotal: number): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const taxAmount = Math.round(subtotal * 0.19);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

function monthKey(monthIndex: number): {
  yyyymm: string;
  label: string;
  year: number;
  month: number;
} {
  const months = [
    { y: 2026, m: 1, label: 'enero' },
    { y: 2026, m: 2, label: 'febrero' },
    { y: 2026, m: 3, label: 'marzo' },
    { y: 2026, m: 4, label: 'abril' },
    { y: 2026, m: 5, label: 'mayo' },
    { y: 2026, m: 6, label: 'junio' },
  ];
  const item = months[monthIndex] ?? months[months.length - 1];
  const mm = String(item.m).padStart(2, '0');
  return {
    yyyymm: `${item.y}${mm}`,
    label: item.label,
    year: item.y,
    month: item.m,
  };
}

function operationDateFor(monthIndex: number, day: number): string {
  const { year, month } = monthKey(monthIndex);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function supplierBankAccountKey(alias: string): string {
  return `seed-demo-oe-${alias.toLowerCase()}`;
}

function buildSupplierBankAccount(alias: string, holderName: string) {
  return {
    accountKey: supplierBankAccountKey(alias),
    bankName: BankName.BANCO_ESTADO,
    accountType: AccountTypeName.CUENTA_CORRIENTE,
    accountNumber: `77${alias.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).padEnd(6, '0')}01`,
    accountHolderName: holderName,
    isPrimary: true,
    notes: 'Cuenta seed proveedor operativo demo',
  };
}

function ensurePersonBankAccount(person: Person, alias: string): void {
  const holder =
    person.businessName ??
    `${person.firstName} ${person.lastName ?? ''}`.trim();
  const bank = buildSupplierBankAccount(alias, holder);
  const existing = (person.bankAccounts ?? []).filter(
    (a) => a.accountKey !== bank.accountKey,
  );
  person.bankAccounts = [...existing, bank];
}

function buildDemoOperationalExpenseDefs(): ExpenseSeedDef[] {
  const defs: ExpenseSeedDef[] = [];

  const monthlyTransfer: {
    categoryName: string;
    supplierAlias: string;
    refPrefix: string;
    nameBase: string;
    subtotal: number;
    day: number;
  }[] = [
    {
      categoryName: 'Arriendo',
      supplierAlias: 'ArriendoParral',
      refPrefix: 'ARR',
      nameBase: 'Arriendo local comercial',
      subtotal: 650_000,
      day: 5,
    },
    {
      categoryName: 'Gastos comunes',
      supplierAlias: 'ArriendoParral',
      refPrefix: 'GCO',
      nameBase: 'Gastos comunes local',
      subtotal: 95_000,
      day: 10,
    },
    {
      categoryName: 'Electricidad',
      supplierAlias: 'CGEParral',
      refPrefix: 'LUZ',
      nameBase: 'Consumo eléctrico',
      subtotal: 48_000,
      day: 8,
    },
    {
      categoryName: 'Agua',
      supplierAlias: 'AguasMaule',
      refPrefix: 'AGU',
      nameBase: 'Consumo agua potable',
      subtotal: 22_000,
      day: 8,
    },
    {
      categoryName: 'Internet y telecomunicaciones',
      supplierAlias: 'MovistarEmpresas',
      refPrefix: 'INT',
      nameBase: 'Plan internet y telefonía',
      subtotal: 34_900,
      day: 6,
    },
    {
      categoryName: 'Software recurrente',
      supplierAlias: 'RetailHub',
      refPrefix: 'SAAS',
      nameBase: 'Suscripción software retail',
      subtotal: 42_000,
      day: 6,
    },
    {
      categoryName: 'Hosting',
      supplierAlias: 'RetailHub',
      refPrefix: 'HST',
      nameBase: 'Hosting eShop',
      subtotal: 18_000,
      day: 6,
    },
    {
      categoryName: 'Contabilidad/tributario recurrente',
      supplierAlias: 'EstudioContableKS',
      refPrefix: 'CON',
      nameBase: 'Honorarios contabilidad',
      subtotal: 180_000,
      day: 7,
    },
    {
      categoryName: 'Seguros operativos',
      supplierAlias: 'MapfreOperativo',
      refPrefix: 'SEG',
      nameBase: 'Póliza seguros operativos',
      subtotal: 72_000,
      day: 9,
    },
    {
      categoryName: 'Courier',
      supplierAlias: 'LogisticaCG',
      refPrefix: 'COU',
      nameBase: 'Envíos courier eShop/delivery',
      subtotal: 55_000,
      day: 20,
    },
    {
      categoryName: 'Comisiones bancarias',
      supplierAlias: 'EstudioContableKS',
      refPrefix: 'BAN',
      nameBase: 'Comisiones medios de pago',
      subtotal: 95_000,
      day: 28,
    },
    {
      categoryName: 'POS (Puntos de Venta)',
      supplierAlias: 'RetailHub',
      refPrefix: 'POS',
      nameBase: 'Arriendo/soporte terminal POS',
      subtotal: 28_000,
      day: 12,
    },
  ];

  for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
    const { label } = monthKey(monthIndex);
    const variance = 1 + (monthIndex % 3) * 0.03 - (monthIndex % 2) * 0.01;
    for (const item of monthlyTransfer) {
      defs.push({
        categoryName: item.categoryName,
        supplierAlias: item.supplierAlias,
        refPrefix: item.refPrefix,
        nameTemplate: `${item.nameBase} — ${label} 2026`,
        subtotal: Math.round(item.subtotal * variance),
        monthIndex,
        day: item.day,
        payment: 'TRANSFER',
      });
    }
  }

  const cashMonthly: {
    categoryName: string;
    supplierAlias: string;
    refPrefix: string;
    nameBase: string;
    subtotal: number;
    day: number;
  }[] = [
    {
      categoryName: 'Combustible operativo',
      supplierAlias: 'CopecFlota',
      refPrefix: 'COM',
      nameBase: 'Combustible flota / reparto',
      subtotal: 110_000,
      day: 14,
    },
    {
      categoryName: 'Peajes',
      supplierAlias: 'CopecFlota',
      refPrefix: 'PEA',
      nameBase: 'Peajes / TAG',
      subtotal: 16_500,
      day: 22,
    },
  ];

  for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
    const { label } = monthKey(monthIndex);
    const variance = 1 + (monthIndex % 2) * 0.04;
    for (const item of cashMonthly) {
      defs.push({
        categoryName: item.categoryName,
        supplierAlias: item.supplierAlias,
        refPrefix: item.refPrefix,
        nameTemplate: `${item.nameBase} — ${label} 2026`,
        subtotal: Math.round(item.subtotal * variance),
        monthIndex,
        day: item.day,
        payment: 'CASH',
      });
    }
  }

  const variable: {
    categoryName: string;
    supplierAlias: string;
    refPrefix: string;
    nameTemplate: string;
    subtotal: number;
    months: number[];
    day: number;
    payment: PaymentKind;
  }[] = [
    {
      categoryName: 'Limpieza',
      supplierAlias: 'ServiciosLocales',
      refPrefix: 'LIM',
      nameTemplate: 'Servicio de limpieza — {month} 2026',
      subtotal: 75_000,
      months: [0, 1, 2, 4, 5],
      day: 15,
      payment: 'CASH',
    },
    {
      categoryName: 'Mantención',
      supplierAlias: 'ServiciosLocales',
      refPrefix: 'MAN',
      nameTemplate: 'Mantención instalaciones — {month} 2026',
      subtotal: 105_000,
      months: [1, 3, 4, 5],
      day: 18,
      payment: 'CASH',
    },
    {
      categoryName: 'Útiles',
      supplierAlias: 'EnvasesPacifico',
      refPrefix: 'UTI',
      nameTemplate: 'Útiles de oficina/tienda — {month} 2026',
      subtotal: 28_000,
      months: [0, 2, 5],
      day: 16,
      payment: 'CASH',
    },
    {
      categoryName: 'Embalaje',
      supplierAlias: 'EnvasesPacifico',
      refPrefix: 'EMB',
      nameTemplate: 'Embalaje envíos — {month} 2026',
      subtotal: 35_000,
      months: [1, 3, 4],
      day: 17,
      payment: 'CASH',
    },
    {
      categoryName: 'Promociones en tienda',
      supplierAlias: 'AgenciaLocal',
      refPrefix: 'PRO',
      nameTemplate: 'Campaña promociones — {month} 2026',
      subtotal: 65_000,
      months: [1, 3, 5],
      day: 11,
      payment: 'TRANSFER',
    },
  ];

  for (const item of variable) {
    for (const monthIndex of item.months) {
      const { label } = monthKey(monthIndex);
      defs.push({
        categoryName: item.categoryName,
        supplierAlias: item.supplierAlias,
        refPrefix: item.refPrefix,
        nameTemplate: item.nameTemplate.replace('{month}', label),
        subtotal: item.subtotal,
        monthIndex,
        day: item.day,
        payment: item.payment,
      });
    }
  }

  return defs;
}

async function syncOeSuppliers(dataSource: DataSource): Promise<void> {
  const personRepo = dataSource.getRepository(Person);
  const supplierRepo = dataSource.getRepository(Supplier);

  for (const item of SEED_DEMO_OE_SUPPLIERS) {
    let person = await personRepo.findOne({
      where: {
        documentNumber: item.person.documentNumber,
        deletedAt: null as never,
      },
    });
    if (!person) {
      person = personRepo.create({
        type: item.person.type,
        firstName: item.person.firstName,
        lastName: item.person.lastName,
        businessName: item.person.businessName,
        documentType: item.person.documentType,
        documentNumber: item.person.documentNumber,
        email: item.person.email,
        phone: item.person.phone,
        address: item.person.address,
        bankAccounts: [
          buildSupplierBankAccount(
            item.supplier.alias,
            item.person.businessName ?? item.person.firstName,
          ),
        ],
      });
    } else {
      person.type = item.person.type;
      person.firstName = item.person.firstName;
      person.lastName = item.person.lastName;
      person.businessName = item.person.businessName;
      person.documentType = item.person.documentType;
      person.email = item.person.email;
      person.phone = item.person.phone;
      person.address = item.person.address;
      ensurePersonBankAccount(person, item.supplier.alias);
    }
    person = await personRepo.save(person);

    let supplier = await supplierRepo.findOne({
      where: { personId: person.id },
      withDeleted: true,
    });
    if (!supplier) {
      supplier = supplierRepo.create({
        personId: person.id,
        supplierType: item.supplier.supplierType,
        alias: item.supplier.alias,
        defaultPaymentTermDays: item.supplier.defaultPaymentTermDays,
        isActive: item.supplier.isActive,
        notes: item.supplier.notes,
      });
    } else {
      if (supplier.deletedAt) {
        supplier = await supplierRepo.recover(supplier);
      }
      supplier.personId = person.id;
      supplier.supplierType = item.supplier.supplierType;
      supplier.alias = item.supplier.alias;
      supplier.defaultPaymentTermDays = item.supplier.defaultPaymentTermDays;
      supplier.isActive = item.supplier.isActive;
      supplier.notes = item.supplier.notes;
    }
    await supplierRepo.save(supplier);
    console.log(
      `✅ Proveedor OE «${item.supplier.alias}» sincronizado (id=${supplier.id})`,
    );
  }

  for (const alias of REUSED_OE_SUPPLIER_ALIASES) {
    const supplier = await supplierRepo.findOne({
      where: { alias },
      relations: ['person'],
    });
    if (!supplier?.person) {
      console.warn(`⚠️  Proveedor reutilizado «${alias}» no encontrado`);
      continue;
    }
    ensurePersonBankAccount(supplier.person, alias);
    await personRepo.save(supplier.person);
  }
}

async function clearDemoOperationalExpenses(
  dataSource: DataSource,
  companyId: string,
): Promise<void> {
  const oeRepo = dataSource.getRepository(OperationalExpense);
  const txRepo = dataSource.getRepository(Transaction);
  const ledgerRepo = dataSource.getRepository(LedgerEntry);

  const existing = await oeRepo.find({ where: { companyId } });
  if (!existing.length) {
    return;
  }

  const parentTxIds = existing
    .map(
      (e) =>
        e.operatingExpenseTransactionId ??
        e.supplierFiscalDocumentTransactionId ??
        null,
    )
    .filter((id): id is string => Boolean(id));

  const allTxIds = new Set<string>(parentTxIds);
  if (parentTxIds.length) {
    const children = await txRepo.find({
      where: { relatedTransactionId: In(parentTxIds) },
      select: ['id'],
    });
    for (const child of children) {
      allTxIds.add(child.id);
    }
  }

  const txIdList = [...allTxIds];
  if (txIdList.length) {
    await ledgerRepo.delete({ transactionId: In(txIdList) });
    await txRepo.delete({ id: In(txIdList) });
  }

  const deleted = await oeRepo.delete({ companyId });
  console.log(
    `✅ Gastos operativos previos eliminados: ${deleted.affected ?? 0} (companyId=${companyId})`,
  );
}

async function patchOeHistoricalDates(
  app: INestApplicationContext,
  dataSource: DataSource,
  opts: {
    companyId: string;
    operatingExpenseTransactionId: string | null | undefined;
    operationDate: string;
  },
): Promise<void> {
  const parentId = opts.operatingExpenseTransactionId;
  if (!parentId) {
    return;
  }
  await patchTransactionHistoricalDate(app, dataSource, {
    companyId: opts.companyId,
    transactionId: parentId,
    occurredOn: opts.operationDate,
  });

  const children = await dataSource.getRepository(Transaction).find({
    where: { relatedTransactionId: parentId },
    select: ['id'],
  });
  for (const child of children) {
    await patchTransactionHistoricalDate(app, dataSource, {
      companyId: opts.companyId,
      transactionId: child.id,
      occurredOn: opts.operationDate,
    });
  }
}

export async function seedDemoOperationalExpenses(opts: {
  app: INestApplicationContext;
  dataSource: DataSource;
  companyId: string;
  branchId: string;
  userId: string;
}): Promise<void> {
  const { app, dataSource, companyId, branchId, userId } = opts;
  const operationalExpensesService = app.get(OperationalExpensesService);

  await syncOeSuppliers(dataSource);
  await clearDemoOperationalExpenses(dataSource, companyId);

  const cashHub = await dataSource.getRepository(CashHub).findOne({
    where: { companyId, code: PRINCIPAL_HUB_CODE },
  });
  if (!cashHub) {
    throw new Error(
      `Centro de efectivo ${PRINCIPAL_HUB_CODE} no encontrado para OE seed`,
    );
  }

  const categories = await dataSource.getRepository(ExpenseCategory).find({
    where: { companyId },
  });
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  const suppliers = await dataSource.getRepository(Supplier).find({
    relations: ['person'],
  });
  const supplierByAlias = new Map(
    suppliers
      .filter((s) => s.alias)
      .map((s) => {
        const alias = String(s.alias);
        const bankKey =
          s.person?.bankAccounts?.find((a) => a.isPrimary)?.accountKey ??
          supplierBankAccountKey(alias);
        return [alias, { id: s.id, bankKey }] as const;
      }),
  );

  const defs = buildDemoOperationalExpenseDefs();
  const refCounter = new Map<string, number>();
  let created = 0;
  let transferCount = 0;
  let cashCount = 0;

  for (const def of defs) {
    const categoryId = categoryByName.get(def.categoryName);
    const supplierInfo = supplierByAlias.get(def.supplierAlias);
    if (!categoryId || !supplierInfo) {
      console.warn(
        `⚠️  Gasto OE omitido (categoría/proveedor): ${def.nameTemplate} [${def.categoryName}/${def.supplierAlias}]`,
      );
      continue;
    }

    const { yyyymm } = monthKey(def.monthIndex);
    const operationDate = operationDateFor(def.monthIndex, def.day);
    const refKey = `${def.refPrefix}-${yyyymm}`;
    const seq = (refCounter.get(refKey) ?? 0) + 1;
    refCounter.set(refKey, seq);
    const referenceNumber = `${def.refPrefix}-${yyyymm}-${String(seq).padStart(3, '0')}`;
    const amounts = clpWithIva(def.subtotal);

    const paidLine =
      def.payment === 'CASH'
        ? {
            amount: amounts.total,
            dueDate: operationDate,
            paymentMethod: 'CASH' as const,
            cashHubId: cashHub.id,
          }
        : {
            amount: amounts.total,
            dueDate: operationDate,
            paymentMethod: 'TRANSFER' as const,
            companyBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
            supplierBankAccountKey: supplierInfo.bankKey,
          };

    const oe = await operationalExpensesService.create({
      companyId,
      branchId,
      categoryId,
      supplierId: supplierInfo.id,
      createdBy: userId,
      name: def.nameTemplate,
      referenceNumber,
      operationDate,
      status: OperationalExpenseStatus.APPROVED,
      documentKind: OperationalExpenseDocumentKind.OTHER,
      fiscalAmounts: amounts,
      supplierDocumentPayment: {
        mode: 'COMPLETED',
        paidLines: [paidLine],
        scheduledLines: [],
      },
    });

    const refreshed = await dataSource.getRepository(OperationalExpense).findOne({
      where: { id: oe.id },
    });
    await patchOeHistoricalDates(app, dataSource, {
      companyId,
      operatingExpenseTransactionId: refreshed?.operatingExpenseTransactionId,
      operationDate,
    });

    created += 1;
    if (def.payment === 'CASH') cashCount += 1;
    else transferCount += 1;
  }

  console.log(
    `✅ Gastos operativos demo: ${created} creados (TRANSFER=${transferCount}, CASH=${cashCount}; objetivo ~${defs.length})`,
  );
}
