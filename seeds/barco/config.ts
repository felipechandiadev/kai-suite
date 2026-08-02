/**
 * Seed Barco — empresa mínima (admin + 1 sucursal + 1 lista + catálogo desde export PDV).
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

export const SEED_BARCO_COMPANY = {
  razonSocial: 'Comercial Barco SpA',
  nombreFantasia: 'Barco',
  rut: '76.543.210-3',
  mail: 'contacto@barco.local',
  phone: '+56 9 5000 0000',
  address: 'Local Barco',
  businessActivity: 'Comercio al por menor',
  defaultCurrency: 'CLP',
  kaiProduct: 'kaistore' as const,
} as const;

export const SEED_BRANCH_NAME = 'Casa matriz';
export const SEED_BRANCH_ADDRESS = SEED_BARCO_COMPANY.address;
export const SEED_BRANCH_PHONE = SEED_BARCO_COMPANY.phone;
export const SEED_BRANCH_LOCATION = { lat: -33.045, lng: -71.543 };

export const SEED_STORAGE_NAME = 'Bodega principal';
export const SEED_STORAGE_CODE = 'BARCO-BODEGA-01';

export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
export const SEED_POS_NAME = 'Caja 1';
export const SEED_CASH_HUB_NAME = 'Caja principal';
export const SEED_CASH_HUB_CODE = 'BARCO-CAJA-01';

export const SEED_UNIT_BASE_NAME = 'Unidad';
export const SEED_UNIT_BASE_SYMBOL = 'un';

export const SEED_BRAND_NAME = 'Barco';

const SEED_PM_NAMESPACE = 'barco-seed-pm-v1';

function seedPaymentMethodId(method: PaymentMethod): string {
  const h = createHash('sha256').update(`${SEED_PM_NAMESPACE}:${method}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

export const PRIMARY_BANK_ACCOUNT_KEY = 'barco-seed-banco-estado-cc';

export function buildSeedCompanyBankAccounts(
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: PRIMARY_BANK_ACCOUNT_KEY,
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '12345678901',
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

export function buildSeedCompanyPaymentCatalog(): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: seedPaymentMethodId(method),
    method,
    alias: null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey:
      method === PaymentMethod.TRANSFER ? PRIMARY_BANK_ACCOUNT_KEY : null,
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

export function buildSeedCompanySettings(
  existing: Record<string, unknown> | null | undefined,
  paymentMethods: CompanyPaymentMethodConfig[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...existing } : {};
  return {
    ...base,
    paymentMethods,
    kaiProduct: SEED_BARCO_COMPANY.kaiProduct,
    eShop: {
      ...(typeof base.eShop === 'object' && base.eShop
        ? (base.eShop as Record<string, unknown>)
        : {}),
      enabled: false,
      slug: 'barco',
    },
    quotations: { enabled: false, defaultValidityDays: 10 },
    internalCredit: { enabled: false },
  };
}
