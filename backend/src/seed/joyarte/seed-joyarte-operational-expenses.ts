import { DataSource, In, Repository } from 'typeorm';
import {
  Person,
  PersonType,
  DocumentType,
  AccountTypeName,
  BankName,
} from '@modules/persons/domain/person.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';
import {
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '@modules/operational-expenses/domain/operational-expense.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

const JOYARTE_SEED_COMPANY_BANK_ACCOUNT_KEY = 'seed-joyarte-banco-chile-cc';

export type SeedSupplierDef = {
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
    alias?: string;
    defaultPaymentTermDays: number;
    isActive: boolean;
    notes?: string;
  };
};

export const SEED_OPERATIONAL_SUPPLIERS: readonly SeedSupplierDef[] = [
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Inmobiliaria Providencia Ltda',
      businessName: 'Inmobiliaria Providencia Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '76.901.234-5',
      email: 'arriendos@inmoprovidencia.cl',
      phone: '+56 2 2345 6789',
      address: 'Av. Providencia 2653, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'ArriendoProvidencia',
      defaultPaymentTermDays: 5,
      isActive: true,
      notes: 'Arrendador del local comercial.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Enel Distribución Chile S.A.',
      businessName: 'Enel Distribución Chile S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.912.345-6',
      email: 'empresas@enel.cl',
      phone: '+56 600 696 6969',
      address: 'Santa Rosa 76, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'EnelEmpresas',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Suministro eléctrico.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Aguas Andinas S.A.',
      businessName: 'Aguas Andinas S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.923.456-7',
      email: 'empresas@aguasandinas.cl',
      phone: '+56 2 2384 2000',
      address: 'Av. Costanera Sur 2730, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'AguasAndinas',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Servicio de agua potable.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Telefónica Móviles Chile S.A.',
      businessName: 'Telefónica Móviles Chile S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.934.567-8',
      email: 'empresas@movistar.cl',
      phone: '+56 600 600 3000',
      address: 'Av. Providencia 111, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'MovistarEmpresas',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Internet y telefonía empresarial.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Administración Edificio Joyarte SpA',
      businessName: 'Administración Edificio Joyarte SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.945.678-9',
      email: 'admin@edificiojoyarte.cl',
      phone: '+56 2 2456 7890',
      address: 'Av. Apoquindo 3500, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'AdminEdificio',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Gastos comunes del edificio.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Empresa Nacional del Petróleo',
      businessName: 'Empresa Nacional del Petróleo',
      documentType: DocumentType.RUT,
      documentNumber: '76.956.789-0',
      email: 'flota@copec.cl',
      phone: '+56 2 2468 1000',
      address: 'El Bosque Norte 0177, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'CopecFlota',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Combustible operativo de flota.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Estudio Contable Retail SpA',
      businessName: 'Estudio Contable Retail SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.967.890-1',
      email: 'honorarios@contableretail.cl',
      phone: '+56 2 2567 8901',
      address: 'Av. Las Condes 12461, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'EstudioContable',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Contabilidad y tributario recurrente.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Mapfre Compañía de Seguros S.A.',
      businessName: 'Mapfre Compañía de Seguros S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.978.901-2',
      email: 'empresas@mapfre.cl',
      phone: '+56 2 2678 9012',
      address: 'Av. Nueva Providencia 1860, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'MapfreSeguros',
      defaultPaymentTermDays: 20,
      isActive: true,
      notes: 'Seguros operativos.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Limpieza Express SpA',
      businessName: 'Limpieza Express SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.989.012-3',
      email: 'servicios@limpiezaexpress.cl',
      phone: '+56 9 8765 4321',
      address: 'Av. Vitacura 5250, Vitacura',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'LimpiezaExpress',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Servicio de aseo y limpieza.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Servicios de Mantención Integral Ltda',
      businessName: 'Servicios de Mantención Integral Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '76.990.123-4',
      email: 'contacto@mantencionintegral.cl',
      phone: '+56 2 2789 0123',
      address: 'Av. Grecia 2001, Ñuñoa',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'ServiciosMantencion',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Mantención de instalaciones.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Chilexpress S.A.',
      businessName: 'Chilexpress S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '76.901.234-6',
      email: 'empresas@chilexpress.cl',
      phone: '+56 600 200 1020',
      address: 'Av. Américo Vespucio 1551, Santiago',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'Chilexpress',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Courier y envíos.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'SaaS Retail Cloud SpA',
      businessName: 'SaaS Retail Cloud SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.912.345-7',
      email: 'billing@saasretail.cl',
      phone: '+56 2 2890 1234',
      address: 'Av. Apoquindo 4700, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'SaaSRetail',
      defaultPaymentTermDays: 10,
      isActive: true,
      notes: 'Software recurrente y suscripciones.',
    },
  },
] as const;

type ExpenseSeedDef = {
  categoryName: string;
  supplierAlias: string;
  refPrefix: string;
  nameTemplate: string;
  subtotal: number;
  monthIndex: number;
  day: number;
  pending?: boolean;
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

function buildJoyarteOperationalExpenseDefs(): ExpenseSeedDef[] {
  const defs: ExpenseSeedDef[] = [];
  const recurrent: {
    categoryName: string;
    supplierAlias: string;
    refPrefix: string;
    nameBase: string;
    subtotal: number;
    day: number;
  }[] = [
    {
      categoryName: 'Arriendo',
      supplierAlias: 'ArriendoProvidencia',
      refPrefix: 'ARR',
      nameBase: 'Arriendo local comercial',
      subtotal: 890_000,
      day: 5,
    },
    {
      categoryName: 'Electricidad',
      supplierAlias: 'EnelEmpresas',
      refPrefix: 'LUZ',
      nameBase: 'Consumo eléctrico',
      subtotal: 62_000,
      day: 8,
    },
    {
      categoryName: 'Agua',
      supplierAlias: 'AguasAndinas',
      refPrefix: 'AGU',
      nameBase: 'Consumo agua potable',
      subtotal: 28_000,
      day: 8,
    },
    {
      categoryName: 'Internet y telecomunicaciones',
      supplierAlias: 'MovistarEmpresas',
      refPrefix: 'INT',
      nameBase: 'Plan internet y telefonía',
      subtotal: 39_900,
      day: 6,
    },
    {
      categoryName: 'Gastos comunes',
      supplierAlias: 'AdminEdificio',
      refPrefix: 'GCO',
      nameBase: 'Gastos comunes edificio',
      subtotal: 185_000,
      day: 10,
    },
    {
      categoryName: 'Combustible operativo',
      supplierAlias: 'CopecFlota',
      refPrefix: 'COM',
      nameBase: 'Combustible flota reparto',
      subtotal: 145_000,
      day: 12,
    },
    {
      categoryName: 'Contabilidad/tributario recurrente',
      supplierAlias: 'EstudioContable',
      refPrefix: 'CON',
      nameBase: 'Honorarios contabilidad',
      subtotal: 210_000,
      day: 7,
    },
    {
      categoryName: 'Seguros operativos',
      supplierAlias: 'MapfreSeguros',
      refPrefix: 'SEG',
      nameBase: 'Póliza seguros operativos',
      subtotal: 95_000,
      day: 9,
    },
  ];

  for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
    const { label } = monthKey(monthIndex);
    const pendingMonth = monthIndex >= 4;
    for (const item of recurrent) {
      const variance = 1 + (monthIndex % 3) * 0.03 - (monthIndex % 2) * 0.01;
      defs.push({
        categoryName: item.categoryName,
        supplierAlias: item.supplierAlias,
        refPrefix: item.refPrefix,
        nameTemplate: `${item.nameBase} — ${label} 2026`,
        subtotal: Math.round(item.subtotal * variance),
        monthIndex,
        day: item.day,
        pending: pendingMonth,
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
  }[] = [
    {
      categoryName: 'Limpieza',
      supplierAlias: 'LimpiezaExpress',
      refPrefix: 'LIM',
      nameTemplate: 'Servicio de limpieza — {month} 2026',
      subtotal: 85_000,
      months: [0, 1, 2, 4, 5],
      day: 15,
    },
    {
      categoryName: 'Mantención',
      supplierAlias: 'ServiciosMantencion',
      refPrefix: 'MAN',
      nameTemplate: 'Mantención instalaciones — {month} 2026',
      subtotal: 120_000,
      months: [1, 3, 4, 5],
      day: 18,
    },
    {
      categoryName: 'Courier',
      supplierAlias: 'Chilexpress',
      refPrefix: 'COU',
      nameTemplate: 'Envíos courier — {month} 2026',
      subtotal: 45_000,
      months: [0, 1, 2, 3, 4, 5],
      day: 20,
    },
    {
      categoryName: 'Software recurrente',
      supplierAlias: 'SaaSRetail',
      refPrefix: 'SAAS',
      nameTemplate: 'Suscripción software — {month} 2026',
      subtotal: 55_000,
      months: [0, 1, 2, 3, 4, 5],
      day: 6,
    },
    {
      categoryName: 'Peajes',
      supplierAlias: 'CopecFlota',
      refPrefix: 'PEA',
      nameTemplate: 'Peajes autopista — {month} 2026',
      subtotal: 18_500,
      months: [0, 2, 4, 5],
      day: 22,
    },
    {
      categoryName: 'Comisiones bancarias',
      supplierAlias: 'EstudioContable',
      refPrefix: 'BAN',
      nameTemplate: 'Comisiones bancarias — {month} 2026',
      subtotal: 12_500,
      months: [0, 1, 3, 5],
      day: 28,
    },
    {
      categoryName: 'Flete',
      supplierAlias: 'Chilexpress',
      refPrefix: 'FLT',
      nameTemplate: 'Flete mercadería — {month} 2026',
      subtotal: 72_000,
      months: [1, 3, 5],
      day: 24,
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
        pending: monthIndex >= 5,
      });
    }
  }

  return defs;
}

function supplierBankAccountKey(alias: string): string {
  return `seed-op-${alias.toLowerCase()}`;
}

function buildSupplierBankAccount(alias: string, holderName: string) {
  return {
    accountKey: supplierBankAccountKey(alias),
    bankName: BankName.BANCO_CHILE,
    accountType: AccountTypeName.CUENTA_CORRIENTE,
    accountNumber: `99${alias.slice(0, 6).padEnd(6, '0')}01`,
    accountHolderName: holderName,
    isPrimary: true,
    notes: 'Cuenta seed proveedor operativo',
  };
}

export async function syncSeedSuppliers(
  personRepo: Repository<Person>,
  supplierRepo: Repository<Supplier>,
  items: readonly SeedSupplierDef[],
): Promise<void> {
  for (const item of items) {
    let person = await personRepo.findOne({
      where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
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
        bankAccounts: item.supplier.alias
          ? [
              buildSupplierBankAccount(
                item.supplier.alias,
                item.person.businessName ?? item.person.firstName,
              ),
            ]
          : null,
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
      if (item.supplier.alias) {
        const bank = buildSupplierBankAccount(
          item.supplier.alias,
          item.person.businessName ?? item.person.firstName,
        );
        const existing = (person.bankAccounts ?? []).filter(
          (a) => a.accountKey !== bank.accountKey,
        );
        person.bankAccounts = [...existing, bank];
      }
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
    supplier = await supplierRepo.save(supplier);
    console.log(
      `✅ Proveedor operativo ${supplier.alias ?? person.businessName} sincronizado: id=${supplier.id}`,
    );
  }
}

async function clearJoyarteOperationalExpenses(
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

export async function seedJoyarteOperationalExpenses(opts: {
  dataSource: DataSource;
  operationalExpensesService: OperationalExpensesService;
  companyId: string;
  branchId: string;
  userId: string;
}): Promise<void> {
  const { dataSource, operationalExpensesService, companyId, branchId, userId } =
    opts;

  await clearJoyarteOperationalExpenses(dataSource, companyId);

  const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
  const supplierRepo = dataSource.getRepository(Supplier);

  const categories = await expenseCategoryRepo.find({ where: { companyId } });
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  const suppliers = await supplierRepo.find({ relations: ['person'] });
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

  const defs = buildJoyarteOperationalExpenseDefs();
  const refCounter = new Map<string, number>();
  let created = 0;

  for (const def of defs) {
    const categoryId = categoryByName.get(def.categoryName);
    const supplierInfo = supplierByAlias.get(def.supplierAlias);
    if (!categoryId || !supplierInfo) {
      console.warn(
        `⚠️  Gasto omitido (categoría o proveedor no encontrado): ${def.nameTemplate}`,
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
    const pending = def.pending === true;

    await operationalExpensesService.create({
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
      supplierDocumentPayment: pending
        ? { mode: 'PENDING', paidLines: [], scheduledLines: [] }
        : {
            mode: 'COMPLETED',
            paidLines: [
              {
                amount: amounts.total,
                dueDate: operationDate,
                paymentMethod: 'TRANSFER',
                companyBankAccountKey: JOYARTE_SEED_COMPANY_BANK_ACCOUNT_KEY,
                supplierBankAccountKey: supplierInfo.bankKey,
              },
            ],
            scheduledLines: [],
          },
    });
    created += 1;
  }

  console.log(`✅ Gastos operativos seed creados: ${created} (objetivo ~${defs.length})`);
}
