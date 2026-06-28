import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';
import { defaultCompanyPaymentMethodId } from '@modules/payment-methods-config/domain/payment-method-config.helpers';
import { DocumentType } from '@modules/persons/domain/person.entity';

export const SEED_SAN_SEBASTIAN_COMPANY = {
  razonSocial: 'Supermercado San Sebastián',
  nombreFantasia: 'San Sebastián',
  rut: '78.543.570-2',
  mail: 'san.sebastian@kai.local',
  phone: '+56984488195',
  address: 'Población Ajial S/N',
  businessActivity: 'Supermercado y abastecimiento',
  defaultCurrency: 'CLP',
} as const;

export const SEED_BRANCH_NAME = 'Local San Sebastián';
export const SEED_BRANCH_ADDRESS = SEED_SAN_SEBASTIAN_COMPANY.address;
export const SEED_BRANCH_PHONE = SEED_SAN_SEBASTIAN_COMPANY.phone;
export const SEED_BRANCH_LOCATION = { lat: -36.606, lng: -72.103 };

export const SEED_STORAGE_NAME = 'Sala de venta';
export const SEED_STORAGE_CODE = 'SEED-SS-SALA';

export const SEED_PRICE_LIST_NAME = 'UNICA';
export const SEED_POS_NAME = 'CAJA SAN SEBASTIAN';
export const SEED_CASH_HUB_CODE = 'CEV-SS-01';
export const SEED_CASH_HUB_NAME = 'Caja principal';

export const SEED_SAN_SEBASTIAN_SHAREHOLDER = {
  firstName: 'María Marcela Del Rosario',
  lastName: 'Tapia Cofré',
  documentType: DocumentType.RUN,
  documentNumber: '10.708.387-1',
  ownershipPercentage: 100,
  partnerType: 'FOUNDING_PARTNER',
  joinDate: '2020-01-01',
  notes:
    'Nacionalidad: Chilena. Sexo: F. Nacimiento: 1968-08-11. N° documento: 516.731.893',
} as const;

const COMPANY_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
  PaymentMethod.INTERNAL_CREDIT,
];

export function buildSeedCompanyBankAccounts(
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: 'seed-ss-banco-estado-cc',
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '12345678901',
      accountHolderName,
      isPrimary: true,
    },
  ];
}

export function buildSeedCompanyPaymentCatalog(): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: defaultCompanyPaymentMethodId(method),
    method,
    alias: method === PaymentMethod.INTERNAL_CREDIT ? 'Crédito interno' : null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey: null,
    metadata: null,
  }));
}

type PosMethodSeed = {
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange?: boolean;
};

const POS_METHOD_SEED: Partial<Record<PaymentMethod, PosMethodSeed>> = {
  [PaymentMethod.CASH]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 0,
    isDefaultForChange: true,
  },
  [PaymentMethod.CREDIT_CARD]: { preloadOnPaymentScreen: true, preloadOrder: 1 },
  [PaymentMethod.DEBIT_CARD]: { preloadOnPaymentScreen: true, preloadOrder: 2 },
  [PaymentMethod.TRANSFER]: { preloadOnPaymentScreen: true, preloadOrder: 3 },
  [PaymentMethod.INTERNAL_CREDIT]: { preloadOnPaymentScreen: true, preloadOrder: 4 },
};

export function buildSeedPosPaymentList(
  catalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  return catalog.map((cmp) => {
    const cfg = POS_METHOD_SEED[cmp.method] ?? {
      preloadOnPaymentScreen: false,
      preloadOrder: null,
    };
    return {
      companyPaymentMethodId: cmp.id,
      isEnabled: cmp.method === PaymentMethod.INTERNAL_CREDIT ? true : true,
      preloadOnPaymentScreen: cfg.preloadOnPaymentScreen,
      preloadOrder: cfg.preloadOrder,
      isDefaultForChange:
        cmp.method === PaymentMethod.CASH && cfg.isDefaultForChange === true,
      bankAccountKey: cmp.bankAccountKey ?? null,
      requireReference: null,
    };
  });
}

export function buildSeedSanSebastianCompanySettings(
  existing: Record<string, unknown> | undefined,
  paymentMethods: CompanyPaymentMethodConfig[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...existing } : {};

  return {
    ...base,
    paymentMethods,
    presales: { enabled: true },
    internalCustomerCredit: { enabled: true },
    checks: {
      enabled: false,
      receiveChecks: false,
      issueChecks: false,
      allowPostdatedReceived: false,
      allowPostdatedIssued: false,
      defaultDepositBankAccountKey: null,
      defaultIssueBankAccountKey: null,
    },
    quotations: {
      enabled: false,
      defaultValidityDays: 10,
      maxValidityDays: 20,
      allowCustomValidity: false,
      defaultTerms: null,
    },
    eShopEnabled: false,
    eShopPublicSlug: null,
    eShopFeaturedProductVariantIds: [],
    eShopFeaturedProductIds: [],
    eShopFreeShippingThreshold: null,
    eShopShippingMode: 'disabled',
    eShopDefaultBranchId: null,
    eShopDefaultPriceListId: null,
    eShopDefaultStorageId: null,
  };
}
