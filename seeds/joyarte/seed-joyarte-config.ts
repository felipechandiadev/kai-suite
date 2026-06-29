import { createHash } from 'node:crypto';
import {
  AccountTypeName,
  BankName,
  type PersonBankAccount,
} from '@modules/persons/domain/person.entity';
import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';
import { DocumentType } from '@modules/persons/domain/person.entity';
import { newEShopNavLink, buildEShopProductCategoryNavHref } from '@modules/companies/domain/company-eshop-nav.types';
import type { CompanyEShopFooterSettings } from '@modules/companies/domain/company-eshop-footer.types';
import type { CompanyEShopTopBarSettings } from '@modules/companies/domain/company-eshop-topbar.types';
import type { EShopTemplateId } from '@modules/companies/domain/eshop-theme-presets';
import { Category } from '@modules/categories/domain/category.entity';

export const SEED_JOYARTE_COMPANY = {
  razonSocial: 'Joyarte SpA',
  nombreFantasia: 'Joyarte',
  rut: '76.111.222-8',
  mail: 'contacto@joyarte.cl',
  phone: '+56 2 2345 6789',
  address: 'Av. Apoquindo 4500, Las Condes, Santiago',
  businessActivity: 'Joyería y orfebrería',
  defaultCurrency: 'CLP',
} as const;

export const SEED_JOYARTE_ESHOP_SLUG = 'joyarte';

export const SEED_JOYARTE_ESHOP_PUBLIC_CONTACT = {
  email: 'tienda@joyarte.cl',
  phone: SEED_JOYARTE_COMPANY.phone,
  instagram: 'https://www.instagram.com/joyasbaron/',
  tiktok: 'https://www.tiktok.com/@joyasbaron',
  facebook: 'https://www.facebook.com/joyasbaron',
} as const;

export const SEED_BRANCH_NAME = 'Boutique Joyarte';
export const SEED_BRANCH_ADDRESS = SEED_JOYARTE_COMPANY.address;
export const SEED_BRANCH_PHONE = '+56 9 8765 4321';
export const SEED_BRANCH_LOCATION = { lat: -33.4172, lng: -70.6067 };

export const SEED_STORAGE_NAME = 'Vitrina principal';
export const SEED_STORAGE_CODE = 'SEED-JOYARTE-VITRINA';

export const SEED_POS_NAMES = ['CAJA BOUTIQUE'] as const;
export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
export const SEED_PRICE_LIST_WHOLESALE_NAME = 'Mayorista';
export const SEED_PRICE_LIST_ESHOP_NAME = 'eShop';

export const SEED_CASH_HUBS = [
  { code: 'CEV-JOY-01', name: 'Caja boutique' },
] as const;

const SEED_PM_NAMESPACE = 'flowstore-seed-pm-joyarte-v1';

export function seedPaymentMethodId(method: PaymentMethod): string {
  const h = createHash('sha256').update(`${SEED_PM_NAMESPACE}:${method}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

export function buildSeedCompanyBankAccounts(
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: 'seed-joyarte-banco-chile-cc',
      bankName: BankName.BANCO_CHILE,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '1234567890',
      accountHolderName,
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
      isEnabled: true,
      preloadOnPaymentScreen: cfg.preloadOnPaymentScreen,
      preloadOrder: cfg.preloadOrder,
      isDefaultForChange:
        cmp.method === PaymentMethod.CASH && cfg.isDefaultForChange === true,
      bankAccountKey: cmp.bankAccountKey ?? null,
      requireReference: null,
    };
  });
}

function seedCategoryNavHref(
  categoryByName: Map<string, Category>,
  categoryName: string,
): string {
  const category = categoryByName.get(categoryName);
  if (!category?.id) return '/productos';
  return buildEShopProductCategoryNavHref(category.id);
}

export function buildSeedJoyarteTopBar(): CompanyEShopTopBarSettings {
  return {
    showLogo: true,
    showCompanyName: true,
    showCart: true,
    navLinks: [
      newEShopNavLink({ label: 'Productos', kind: 'route', href: '/productos', order: 0 }),
      newEShopNavLink({ label: 'Nosotros', kind: 'route', href: '/nosotros', order: 1 }),
    ],
  };
}

export function buildSeedJoyarteTopBarFromCategories(
  categoryByName: Map<string, Category>,
): CompanyEShopTopBarSettings {
  return {
    showLogo: true,
    showCompanyName: true,
    showCart: true,
    navLinks: [
      newEShopNavLink({
        label: 'Anillos',
        kind: 'route',
        href: seedCategoryNavHref(categoryByName, 'Anillos'),
        order: 0,
      }),
      newEShopNavLink({
        label: 'Aros',
        kind: 'route',
        href: seedCategoryNavHref(categoryByName, 'Aros'),
        order: 1,
      }),
      newEShopNavLink({
        label: 'Collares',
        kind: 'route',
        href: seedCategoryNavHref(categoryByName, 'Collares'),
        order: 2,
      }),
      newEShopNavLink({
        label: 'Compromiso',
        kind: 'route',
        href: seedCategoryNavHref(categoryByName, 'Anillos de Compromiso'),
        order: 3,
      }),
      newEShopNavLink({ label: 'Nosotros', kind: 'route', href: '/nosotros', order: 4 }),
    ],
  };
}

export function buildSeedJoyarteFooter(): CompanyEShopFooterSettings {
  return {
    showLogo: true,
    showTagline: true,
    showBrandManifest: true,
    showContactBlock: true,
    showSocialLinks: true,
    copyrightSuffix: 'Joyería de autor',
    linkGroups: [
      {
        id: 'joyarte-tienda',
        title: 'Tienda',
        enabled: true,
        order: 0,
        links: [
          newEShopNavLink({ label: 'Anillos', kind: 'route', href: '/productos', order: 0 }),
          newEShopNavLink({ label: 'Aros', kind: 'route', href: '/productos', order: 1 }),
          newEShopNavLink({ label: 'Collares', kind: 'route', href: '/productos', order: 2 }),
        ],
      },
      {
        id: 'joyarte-novios',
        title: 'Novios',
        enabled: true,
        order: 1,
        links: [
          newEShopNavLink({ label: 'Compromiso', kind: 'route', href: '/productos', order: 0 }),
          newEShopNavLink({ label: 'Argollas', kind: 'route', href: '/productos', order: 1 }),
        ],
      },
      {
        id: 'joyarte-ayuda',
        title: 'Ayuda',
        enabled: true,
        order: 2,
        links: [
          newEShopNavLink({ label: 'Contacto', kind: 'route', href: '/donde-estamos', order: 0 }),
          newEShopNavLink({ label: 'Nosotros', kind: 'route', href: '/nosotros', order: 1 }),
        ],
      },
    ],
  };
}

export function buildSeedJoyarteFooterFromCategories(
  categoryByName: Map<string, Category>,
): CompanyEShopFooterSettings {
  return {
    showLogo: true,
    showTagline: true,
    showBrandManifest: true,
    showContactBlock: true,
    showSocialLinks: true,
    copyrightSuffix: 'Joyería de autor',
    linkGroups: [
      {
        id: 'joyarte-tienda',
        title: 'Tienda',
        enabled: true,
        order: 0,
        links: [
          newEShopNavLink({
            label: 'Anillos',
            kind: 'route',
            href: seedCategoryNavHref(categoryByName, 'Anillos'),
            order: 0,
          }),
          newEShopNavLink({
            label: 'Aros',
            kind: 'route',
            href: seedCategoryNavHref(categoryByName, 'Aros'),
            order: 1,
          }),
          newEShopNavLink({
            label: 'Collares',
            kind: 'route',
            href: seedCategoryNavHref(categoryByName, 'Collares'),
            order: 2,
          }),
        ],
      },
      {
        id: 'joyarte-novios',
        title: 'Novios',
        enabled: true,
        order: 1,
        links: [
          newEShopNavLink({
            label: 'Compromiso',
            kind: 'route',
            href: seedCategoryNavHref(categoryByName, 'Anillos de Compromiso'),
            order: 0,
          }),
          newEShopNavLink({
            label: 'Argollas',
            kind: 'route',
            href: seedCategoryNavHref(categoryByName, 'Argollas de Matrimonio'),
            order: 1,
          }),
        ],
      },
      {
        id: 'joyarte-ayuda',
        title: 'Ayuda',
        enabled: true,
        order: 2,
        links: [
          newEShopNavLink({ label: 'Contacto', kind: 'route', href: '/donde-estamos', order: 0 }),
          newEShopNavLink({ label: 'Nosotros', kind: 'route', href: '/nosotros', order: 1 }),
        ],
      },
    ],
  };
}

export function buildSeedJoyarteCompanySettings(
  existing: Record<string, unknown> | undefined,
  paymentMethods: CompanyPaymentMethodConfig[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...existing } : {};

  return {
    ...base,
    paymentMethods,
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
      enabled: true,
      defaultValidityDays: 10,
      maxValidityDays: 20,
      allowCustomValidity: true,
      defaultTerms: null,
    },
    internalCustomerCredit: { enabled: false },
    eShopEnabled: true,
    eShopPublicSlug: SEED_JOYARTE_ESHOP_SLUG,
    eShopFeaturedProductVariantIds: [],
    eShopFeaturedProductIds: [],
    eShopFreeShippingThreshold: 150_000,
    eShopShippingMode: 'disabled',
    eShopStockPolicy: 'ALLOW_BACKORDER',
    eShopCustomerPortalEnabled: true,
    eShopRegistrationRequireRut: false,
    eShopShowDebtsInPortal: true,
    eShopDefaultBranchId: null,
    eShopDefaultPriceListId: null,
    eShopDefaultStorageId: null,
    eShopTemplateId: 'jewelry' satisfies EShopTemplateId,
    eShopThemeTokenOverrides: {},
    eShopTopBar: buildSeedJoyarteTopBar(),
    eShopFooter: buildSeedJoyarteFooter(),
    companyIdentity: {
      tagline: 'Joyas que cuentan tu historia',
      brandManifest:
        'En Joyarte diseñamos y seleccionamos piezas de oro y plata con estándares de calidad certificados. Asesoría personalizada para regalos, compromiso y momentos que perduran.',
    },
    publicContact: {
      email: SEED_JOYARTE_ESHOP_PUBLIC_CONTACT.email,
      phone: SEED_JOYARTE_ESHOP_PUBLIC_CONTACT.phone,
      instagram: SEED_JOYARTE_ESHOP_PUBLIC_CONTACT.instagram,
      tiktok: SEED_JOYARTE_ESHOP_PUBLIC_CONTACT.tiktok,
      facebook: SEED_JOYARTE_ESHOP_PUBLIC_CONTACT.facebook,
    },
  };
}

export function buildSeedEmployeeBankAccount(
  accountHolderName: string,
  documentNumber: string,
): PersonBankAccount {
  const digits = documentNumber.replace(/\D/g, '').slice(-10).padStart(10, '0');
  return {
    accountKey: `seed-joyarte-emp-${digits}`,
    bankName: BankName.BANCO_ESTADO,
    accountType: AccountTypeName.CUENTA_VISTA,
    accountNumber: digits,
    accountHolderName,
    isPrimary: true,
    notes: 'Cuenta seed Joyarte',
  };
}

export const SEED_JOYARTE_SHAREHOLDERS = [
  {
    firstName: 'Valentina',
    lastName: 'Barón Ríos',
    documentType: DocumentType.RUN,
    documentNumber: '12.345.678-5',
    ownershipPercentage: 70,
    partnerType: 'FOUNDING_PARTNER',
    joinDate: '2015-01-15',
  },
  {
    firstName: 'Tomás',
    lastName: 'Barón Silva',
    documentType: DocumentType.RUN,
    documentNumber: '15.987.654-3',
    ownershipPercentage: 30,
    partnerType: 'PARTNER',
    joinDate: '2018-06-01',
  },
] as const;

/** Logo relativo a `seed/joyarte/assets/`. */
export const SEED_JOYARTE_COMPANY_LOGO_FILE = 'company/logo.png';
