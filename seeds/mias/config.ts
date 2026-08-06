/**
 * Seed Mias — KaiFood vacío operable (1 sucursal, sin productos).
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

export const SEED_MIAS_COMPANY = {
  razonSocial: 'Mias SpA',
  nombreFantasia: 'Mias',
  rut: '76.999.111-5',
  mail: 'contacto@mias.local',
  phone: '+56 9 5200 0001',
  address: 'Local Mias, Santiago',
  businessActivity: 'Restaurante',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaifood' as const,
  menuPublicSlug: 'mias',
} as const;

export const SEED_BRAND_NAME = 'Mias';
export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
export const SEED_POS_NAME = 'Caja 1';
export const SEED_UNIT_BASE_NAME = 'Unidad';
export const SEED_UNIT_BASE_SYMBOL = 'un';

export type SeedCompanyPayments = {
  bankAccountKey: string;
  bankAccountNumber: string;
  pmNamespace: string;
};

export const SEED_MIAS_PAYMENTS: SeedCompanyPayments = {
  bankAccountKey: 'mias-seed-banco-estado-cc',
  bankAccountNumber: '12345678904',
  pmNamespace: 'mias-seed-pm-v1',
};

export const SEED_BRANCH = {
  name: 'Mias',
  isHeadquarters: true,
  branchAddress: SEED_MIAS_COMPANY.address,
  branchPhone: SEED_MIAS_COMPANY.phone,
  branchLocation: { lat: -33.437, lng: -70.65 },
  storageName: 'Bodega principal',
  storageCode: 'MIAS-BOD-01',
  cashHubName: 'Caja principal Mias',
  cashHubCode: 'MIAS-CAJA-01',
} as const;

export const SEED_MIAS_USERS = {
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
    firstName: 'Admin',
    lastName: 'Mias',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@mias.local',
    documentNumber: '15.999.888-6',
    phone: '+56 9 7200 0001',
    nonDeletable: false,
    preferOwner: true,
  },
  operador: {
    userName: 'operador',
    rol: UserRole.POS_OPERATOR,
    firstName: 'Operador',
    lastName: 'Mias',
    email: 'operador@mias.local',
    documentNumber: '16.888.777-9',
    phone: '+56 9 7200 0002',
    nonDeletable: false,
  },
} as const;

export const SEED_SHAREHOLDER = {
  firstName: 'Gabriel',
  lastName: '',
  documentType: DocumentType.RUT,
  documentNumber: '12.345.678-5',
  ownershipPercentage: 100,
  partnerType: 'FOUNDING_PARTNER',
  joinDate: '2024-01-01',
} as const;

export const SEED_SUPPLIER = {
  documentNumber: '77.999.888-6',
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
  email: 'cliente.prueba@mias.local',
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
    accountKey: `mias-employee-${digits}`,
    bankName: BankName.BANCO_ESTADO,
    accountType: AccountTypeName.CUENTA_VISTA,
    accountNumber: digits,
    accountHolderName,
    isPrimary: true,
    notes: 'Cuenta seed',
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
    out.menuPublicSlug = params.menuPublicSlug ?? 'mias';
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
