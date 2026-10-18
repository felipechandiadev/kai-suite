/**
 * Seed mínimo Kai Food Demo — una empresa gastronómica operable.
 */
import { createHash } from 'node:crypto';
import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';
import { ProductType } from '@modules/products/domain/product.entity';
import type { SeedProductDefinition } from '../shared/seed-catalog.types';

export const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '098098';

export const SEED_COMPANY = {
  razonSocial: 'Kai Food Demo SpA',
  nombreFantasia: 'Kai Food Demo',
  rut: '76.111.333-K',
  mail: 'hola@kaifood-demo.local',
  phone: '+56 9 5660 0001',
  address: 'Av. Demo 100, Providencia, Santiago',
  businessActivity: 'Restaurante y café',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaifood' as const,
  menuPublicSlug: process.env.NEXT_PUBLIC_MENU_STORE_SLUG || 'kaifood-demo',
} as const;

export const SEED_BRANCH_NAME = 'Local principal';
export const SEED_STORAGE_CODE = 'KFD-SALA-01';
export const SEED_STORAGE_NAME = 'Sala';
export const SEED_CASH_HUB_CODE = 'KFD-CAJA-01';
export const SEED_CASH_HUB_NAME = 'Caja principal';
export const SEED_POS_NAME = 'Caja 1';
export const SEED_PRICE_LIST_NAME = 'Minorista';
export const SEED_BRAND_NAME = 'Kai Food Demo';

export type SeedCompanyPayments = {
  bankAccountKey: string;
  bankAccountNumber: string;
  pmNamespace: string;
};

export const SEED_PAYMENTS: SeedCompanyPayments = {
  bankAccountKey: 'kaifood-demo-seed-banco',
  bankAccountNumber: '12345678901',
  pmNamespace: 'kaifood-demo-seed-pm-v1',
};

export const SEED_CATEGORIES = ['Bebidas', 'Platos'] as const;

export const SEED_PRODUCTS: SeedProductDefinition[] = [
  {
    name: 'Café americano',
    brand: SEED_BRAND_NAME,
    productType: ProductType.PREPARADO,
    categoryName: 'Bebidas',
    variants: [
      {
        sku: 'KFD-CAFE-AM',
        baseCost: 400,
        basePrice: 2500,
        retailNet: 2100,
        trackInventory: false,
      },
    ],
  },
  {
    name: 'Empanada de pino',
    brand: SEED_BRAND_NAME,
    productType: ProductType.PREPARADO,
    categoryName: 'Platos',
    variants: [
      {
        sku: 'KFD-EMP-PINO',
        baseCost: 800,
        basePrice: 3200,
        retailNet: 2700,
        trackInventory: false,
      },
    ],
  },
  {
    name: 'Jugo natural',
    brand: SEED_BRAND_NAME,
    productType: ProductType.PREPARADO,
    categoryName: 'Bebidas',
    variants: [
      {
        sku: 'KFD-JUGO',
        baseCost: 600,
        basePrice: 2800,
        retailNet: 2350,
        trackInventory: false,
      },
    ],
  },
];

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

export function buildSeedCompanyBankAccounts(accountHolderName: string): CompanyBankAccount[] {
  return [
    {
      accountKey: SEED_PAYMENTS.bankAccountKey,
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: SEED_PAYMENTS.bankAccountNumber,
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
];

export function buildSeedCompanyPaymentCatalog(): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: seedPaymentMethodId(SEED_PAYMENTS.pmNamespace, method),
    method,
    alias: null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey: null,
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
    bankAccountKey: null,
    requireReference: null,
  }));
}

export function buildSeedCompanySettings(params: {
  existing: Record<string, unknown> | null | undefined;
  paymentMethods: CompanyPaymentMethodConfig[];
  menuDefaultBranchId: string;
  menuDefaultPriceListId: string;
}): Record<string, unknown> {
  const base =
    params.existing && typeof params.existing === 'object' ? { ...params.existing } : {};
  return {
    ...base,
    paymentMethods: params.paymentMethods,
    kaiProduct: 'kaifood',
    menuEnabled: true,
    menuPublicSlug: SEED_COMPANY.menuPublicSlug,
    menuDefaultBranchId: params.menuDefaultBranchId,
    menuDefaultPriceListId: params.menuDefaultPriceListId,
    quotations: { enabled: false, defaultValidityDays: 7 },
    internalCredit: { enabled: false },
  };
}
