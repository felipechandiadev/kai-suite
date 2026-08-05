/**
 * Seed Velarys — KaiFood mínimo (1 sucursal).
 */
import { createHash } from 'node:crypto';
import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import {
  AccountTypeName,
  BankName,
  type PersonBankAccount,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';
import { UserRole } from '@modules/users/domain/user.entity';
import { SupplierType } from '@modules/suppliers/domain/supplier.entity';

export const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '098098';

export const SEED_VELARYS_COMPANY = {
  razonSocial: 'Velarys SpA',
  nombreFantasia: 'Velarys',
  rut: '76.888.888-4',
  mail: 'contacto@velarys.local',
  phone: '+56 9 5100 0001',
  address: 'Local Velarys, Santiago',
  businessActivity: 'Cafetería y pastelería',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaifood' as const,
  menuPublicSlug: 'velarys',
} as const;

export const SEED_BRAND_NAME = 'Velarys';
export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
export const SEED_POS_NAME = 'Caja 1';
export const SEED_UNIT_BASE_NAME = 'Unidad';
export const SEED_UNIT_BASE_SYMBOL = 'un';

export type SeedCompanyPayments = {
  bankAccountKey: string;
  bankAccountNumber: string;
  pmNamespace: string;
};

export const SEED_VELARYS_PAYMENTS: SeedCompanyPayments = {
  bankAccountKey: 'velarys-seed-banco-estado-cc',
  bankAccountNumber: '12345678903',
  pmNamespace: 'velarys-seed-pm-v1',
};

export const SEED_BRANCH = {
  name: 'Velarys',
  isHeadquarters: true,
  branchAddress: SEED_VELARYS_COMPANY.address,
  branchPhone: SEED_VELARYS_COMPANY.phone,
  branchLocation: { lat: -33.437, lng: -70.65 },
  storageName: 'Sala de venta',
  storageCode: 'VELARYS-SALA-01',
  cashHubName: 'Caja principal Velarys',
  cashHubCode: 'VELARYS-CAJA-01',
} as const;

export const SEED_VELARYS_USERS = {
  superadmin: {
    userName: 'superadmin',
    rol: UserRole.SUPER_ADMIN,
    firstName: 'Sistema',
    lastName: 'Kai',
    email: 'superadmin@kai.local',
    documentNumber: '11.111.111-1',
    nonDeletable: true,
  },
  admin: {
    userName: process.env.SEED_ADMIN_USERNAME || 'admin',
    rol: UserRole.ADMIN,
    firstName: 'Valentina',
    lastName: 'Reyes Soto',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@velarys.local',
    documentNumber: '15.234.568-2',
    phone: '+56 9 7100 0001',
    nonDeletable: false,
    preferOwner: true,
  },
  operador: {
    userName: 'operador',
    rol: UserRole.POS_OPERATOR,
    firstName: 'Tomás',
    lastName: 'Núñez Díaz',
    email: 'operador@velarys.local',
    documentNumber: '16.345.679-6',
    phone: '+56 9 7100 0002',
    nonDeletable: false,
  },
  mesero: {
    userName: 'mesero',
    rol: UserRole.WAITER,
    firstName: 'Isidora',
    lastName: 'Paredes Muñoz',
    email: 'mesero@velarys.local',
    documentNumber: '17.456.790-5',
    phone: '+56 9 7100 0003',
    nonDeletable: false,
  },
} as const;

export const SEED_SHAREHOLDER = {
  firstName: 'Valentina',
  lastName: 'Reyes Soto',
  documentType: DocumentType.RUT,
  documentNumber: '15.234.568-2',
  ownershipPercentage: 100,
  partnerType: 'FOUNDING_PARTNER',
  joinDate: '2024-01-01',
} as const;

export const SEED_SUPPLIER = {
  documentNumber: '76.111.222-8',
  businessName: 'Proveedor Prueba SpA',
  alias: 'Prueba',
  supplierType: SupplierType.DISTRIBUTOR,
  email: 'proveedor@prueba.local',
  phone: '+56 9 8000 0001',
  address: 'Av. Providencia 100, Santiago',
} as const;

export const SEED_CUSTOMER = {
  firstName: 'Cliente',
  lastName: 'Prueba Contado',
  documentNumber: '18.111.222-0',
  email: 'cliente.prueba@velarys.local',
  phone: '+56 9 8111 0001',
  address: 'Calle Prueba 100, Santiago',
  creditLimit: 0,
  paymentDayOfMonth: 5 as const,
} as const;

function seedPaymentMethodId(namespace: string, method: PaymentMethod): string {
  const h = createHash('sha256').update(`${namespace}:${method}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

export function buildSeedCompanyBankAccounts(
  payments: SeedCompanyPayments,
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: payments.bankAccountKey,
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: payments.bankAccountNumber,
      accountHolderName,
      currentBalance: 0,
      isPrimary: true,
    },
  ];
}

const COMPANY_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
];

export function buildSeedCompanyPaymentCatalog(
  payments: SeedCompanyPayments,
): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: seedPaymentMethodId(payments.pmNamespace, method),
    method,
    alias: null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey:
      method === PaymentMethod.TRANSFER ? payments.bankAccountKey : null,
    feePercent: null,
    metadata: null,
  }));
}

export function buildSeedPosPaymentList(
  catalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  return catalog.map((cmp, i) => ({
    companyPaymentMethodId: cmp.id,
    isEnabled: true,
    preloadOnPaymentScreen: true,
    preloadOrder: i,
    isDefaultForChange: cmp.method === PaymentMethod.CASH,
    bankAccountKey: cmp.bankAccountKey ?? null,
    requireReference: null,
  }));
}

export function buildSeedEmployeeBankAccount(
  accountHolderName: string,
  documentNumber: string,
): PersonBankAccount {
  const digits = documentNumber.replace(/\D/g, '').slice(-10).padStart(10, '0');
  return {
    accountKey: `velarys-employee-${digits}`,
    bankName: BankName.BANCO_ESTADO,
    accountType: AccountTypeName.CUENTA_VISTA,
    accountNumber: digits,
    accountHolderName,
    isPrimary: true,
    notes: 'Cuenta seed para liquidaciones / propinas',
  };
}

export function buildSeedCompanySettings(params: {
  existing: Record<string, unknown> | null | undefined;
  paymentMethods: CompanyPaymentMethodConfig[];
  kaiProduct: 'kaistore' | 'kaifood';
  menuPublicSlug?: string;
  menuDefaultBranchId?: string;
  menuDefaultPriceListId?: string;
  menuExtras?: Record<string, unknown>;
  tips?: Record<string, unknown>;
}): Record<string, unknown> {
  const base =
    params.existing && typeof params.existing === 'object'
      ? { ...params.existing }
      : {};
  const out: Record<string, unknown> = {
    ...base,
    paymentMethods: params.paymentMethods,
    kaiProduct: params.kaiProduct,
    quotations: { enabled: false, defaultValidityDays: 10 },
    internalCredit: { enabled: false },
  };
  if (params.kaiProduct === 'kaifood') {
    out.menuEnabled = true;
    out.menuPublicSlug = params.menuPublicSlug ?? 'velarys';
    if (params.menuDefaultBranchId) {
      out.menuDefaultBranchId = params.menuDefaultBranchId;
    }
    if (params.menuDefaultPriceListId) {
      out.menuDefaultPriceListId = params.menuDefaultPriceListId;
    }
    if (params.menuExtras) {
      Object.assign(out, params.menuExtras);
    }
    if (params.tips) {
      out.tips = params.tips;
    }
  }
  return out;
}
