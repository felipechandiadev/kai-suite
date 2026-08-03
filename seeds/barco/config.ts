/**
 * Seed Barco dual — El Barco (kaistore) + Ohlala (kaifood).
 */
import { createHash } from 'node:crypto';
import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import {
  AccountTypeName,
  BankName,
} from '@modules/persons/domain/person.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';
import { UserRole } from '@modules/users/domain/user.entity';

export const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '098098';

/** Empresa A — retail KaiStore. */
export const SEED_BARCO_COMPANY = {
  razonSocial: 'Comercial El Barco SpA',
  nombreFantasia: 'El Barco',
  rut: '76.543.210-3',
  mail: 'contacto@elbarco.local',
  phone: '+56 9 5000 0000',
  address: 'Local El Barco, Valparaíso',
  businessActivity: 'Comercio al por menor',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaistore' as const,
  eShopSlug: 'el-barco',
} as const;

/** Empresa B — KaiFood (mariscos / helados). */
export const SEED_OHLALA_COMPANY = {
  razonSocial: 'Ohlala SpA',
  nombreFantasia: 'Ohlala',
  rut: '76.543.211-1',
  mail: 'contacto@ohlala.local',
  phone: '+56 9 5000 0001',
  address: 'Local Ohlala, Valparaíso',
  businessActivity: 'Venta de alimentos y bebidas',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaifood' as const,
  menuPublicSlug: 'ohlala',
} as const;

export const SEED_BRANCH_NAME = 'Casa matriz';
export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
export const SEED_POS_NAME = 'Caja 1';
export const SEED_UNIT_BASE_NAME = 'Unidad';
export const SEED_UNIT_BASE_SYMBOL = 'un';

export type SeedCompanySite = {
  branchAddress: string;
  branchPhone: string;
  branchLocation: { lat: number; lng: number };
  storageName: string;
  storageCode: string;
  cashHubName: string;
  cashHubCode: string;
  brandName: string;
  bankAccountKey: string;
  bankAccountNumber: string;
  pmNamespace: string;
};

export const SEED_BARCO_SITE: SeedCompanySite = {
  branchAddress: SEED_BARCO_COMPANY.address,
  branchPhone: SEED_BARCO_COMPANY.phone,
  branchLocation: { lat: -33.045, lng: -71.543 },
  storageName: 'Bodega principal',
  storageCode: 'BARCO-BODEGA-01',
  cashHubName: 'Caja principal',
  cashHubCode: 'BARCO-CAJA-01',
  brandName: 'El Barco',
  bankAccountKey: 'barco-seed-banco-estado-cc',
  bankAccountNumber: '12345678901',
  pmNamespace: 'barco-seed-pm-v1',
};

export const SEED_OHLALA_SITE: SeedCompanySite = {
  branchAddress: SEED_OHLALA_COMPANY.address,
  branchPhone: SEED_OHLALA_COMPANY.phone,
  branchLocation: { lat: -33.046, lng: -71.544 },
  storageName: 'Bodega principal',
  storageCode: 'OHLALA-BODEGA-01',
  cashHubName: 'Caja principal',
  cashHubCode: 'OHLALA-CAJA-01',
  brandName: 'Ohlala',
  bankAccountKey: 'ohlala-seed-banco-estado-cc',
  bankAccountNumber: '12345678902',
  pmNamespace: 'ohlala-seed-pm-v1',
};

/** Usuarios seed (todos con Person). Password: SEED_PASSWORD. */
export const SEED_BARCO_USERS = {
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
    firstName: 'Carla',
    lastName: 'Muñoz Reyes',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@barco.local',
    documentNumber: '15.234.567-4',
    phone: '+56 9 7000 0001',
    nonDeletable: false,
    preferOwner: true,
  },
  operador: {
    userName: 'operador',
    rol: UserRole.POS_OPERATOR,
    firstName: 'Diego',
    lastName: 'Vargas Soto',
    email: 'operador@barco.local',
    documentNumber: '16.345.678-8',
    phone: '+56 9 7000 0002',
    nonDeletable: false,
  },
  mesero: {
    userName: 'mesero',
    rol: UserRole.WAITER,
    firstName: 'Camila',
    lastName: 'Rojas Peña',
    email: 'mesero@ohlala.local',
    documentNumber: '17.456.789-1',
    phone: '+56 9 7000 0003',
    nonDeletable: false,
  },
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
  site: SeedCompanySite,
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: site.bankAccountKey,
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: site.bankAccountNumber,
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
  site: SeedCompanySite,
): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: seedPaymentMethodId(site.pmNamespace, method),
    method,
    alias: null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey:
      method === PaymentMethod.TRANSFER ? site.bankAccountKey : null,
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

export function buildSeedCompanySettings(params: {
  existing: Record<string, unknown> | null | undefined;
  paymentMethods: CompanyPaymentMethodConfig[];
  kaiProduct: 'kaistore' | 'kaifood';
  eShopSlug?: string;
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
  if (params.kaiProduct === 'kaistore') {
    out.eShop = {
      ...(typeof base.eShop === 'object' && base.eShop
        ? (base.eShop as Record<string, unknown>)
        : {}),
      enabled: false,
      slug: params.eShopSlug ?? 'el-barco',
    };
  }
  if (params.kaiProduct === 'kaifood') {
    out.menuEnabled = true;
    out.menuPublicSlug = params.menuPublicSlug ?? 'ohlala';
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

/** @deprecated alias — prefer SEED_BARCO_SITE.brandName */
export const SEED_BRAND_NAME = SEED_BARCO_SITE.brandName;
