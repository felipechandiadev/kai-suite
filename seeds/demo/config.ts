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
import { buildDefaultCompanyEShopTopBarSettings } from '@modules/companies/domain/company-eshop-topbar.types';
import { buildDefaultCompanyEShopFooterSettings } from '@modules/companies/domain/company-eshop-footer.types';
import type { CompanyMercadoPagoSettings } from '@modules/companies/domain/company-mercado-pago.types';

/**
 * Credenciales sandbox «Mercado PAGO POS-Kai» (Chile) — ver `envs/mercado-pago.md`.
 * Override local: `SEED_MP_PUBLIC_KEY` / `SEED_MP_ACCESS_TOKEN` / `SEED_MP_ENVIRONMENT`.
 */
export const SEED_MP_SANDBOX_DEFAULTS = {
  publicKey: 'APP_USR-ad2ff5e6-d9c1-423f-9783-9d52c4ef1325',
  accessToken:
    'APP_USR-903290524630763-071322-7f1881da338659b1355e50aa6668acc8-3539346207',
  environment: 'sandbox' as const,
} as const;

export function buildSeedMercadoPagoSettings(): CompanyMercadoPagoSettings {
  const publicKey =
    process.env.SEED_MP_PUBLIC_KEY?.trim() || SEED_MP_SANDBOX_DEFAULTS.publicKey;
  const accessToken =
    process.env.SEED_MP_ACCESS_TOKEN?.trim() ||
    SEED_MP_SANDBOX_DEFAULTS.accessToken;
  const environment =
    process.env.SEED_MP_ENVIRONMENT?.trim() === 'production'
      ? 'production'
      : 'sandbox';

  return {
    enabled: true,
    environment,
    publicKey,
    accessToken,
    pointTerminalId: null,
    posPointEnabled: false,
    eshopOnlinePaymentEnabled: true,
    eshopDefaultPaymentMode: 'online',
  };
}

/** Empresa genérica de desarrollo — «Kai Suite» (estado actual en BD demo). */
export const SEED_DEV_COMPANY = {
  razonSocial: 'Kai Suite',
  nombreFantasia: 'Kai Suite',
  rut: '11.111.111-1',
  mail: 'san.sebastian@kai.local',
  phone: '+56984488195',
  address: 'Anibal Pinto 405',
  businessActivity: 'Suite Retail',
  defaultCurrency: 'CLP',
  commune: 'Parral',
  city: 'Parral',
  siiResolutionNumber: '80',
  siiResolutionDate: '2014-08-22',
} as const;

/** Segunda empresa (multi-RUT / CompanySwitcher) — solo datos maestros + settings en seed. */
export const SEED_DEV_COMPANY_SECOND = {
  razonSocial: 'Segunda Empresa SpA',
  nombreFantasia: 'Segunda Empresa',
  rut: '76.999.999-K',
  mail: 'contacto@segunda-empresa.cl',
  phone: '+56 2 2000 0001',
  address: 'Av. Providencia 2000, Providencia, Santiago',
  businessActivity: 'Comercio desarrollo multi-tenant',
  defaultCurrency: 'CLP',
} as const;

/** Slug eShop público de la segunda empresa (distinto de `demo`). */
export const SEED_DEV_COMPANY_SECOND_ESHOP_SLUG = 'demo-2';

/** Contacto público eShop (footer, documentos, pestaña Contacto en admin). */
export const SEED_DEV_ESHOP_PUBLIC_CONTACT = {
  email: SEED_DEV_COMPANY.mail,
  phone: SEED_DEV_COMPANY.phone,
  instagram: 'https://www.instagram.com/kaistore.cl/',
  tiktok: 'https://www.tiktok.com/@kaistore.cl',
  facebook: 'https://www.facebook.com/kaistore.cl',
} as const;

export const SEED_DEV_ESHOP_PUBLIC_CONTACT_SECOND = {
  email: 'tienda@segunda-empresa.cl',
  phone: SEED_DEV_COMPANY_SECOND.phone,
  instagram: 'https://www.instagram.com/segunda.empresa.demo/',
  tiktok: 'https://www.tiktok.com/@segunda.empresa.demo',
  facebook: 'https://www.facebook.com/segunda.empresa.demo',
} as const;

function normalizeInstagramProfileUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^instagram\.com\//i, '');
  return `https://www.instagram.com/${handle}/`;
}

function normalizeTiktokProfileUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v
    .replace(/^@/, '')
    .replace(/^tiktok\.com\/@?/i, '');
  return `https://www.tiktok.com/@${handle}`;
}

function normalizeFacebookProfileUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v
    .replace(/^@/, '')
    .replace(/^(www\.)?facebook\.com\//i, '')
    .replace(/^fb\.com\//i, '');
  return `https://www.facebook.com/${handle}`;
}

export function buildSeedEshopPublicContact(
  eShopPublicSlug: string,
  fallbackEmail: string,
  fallbackPhone?: string,
): {
  email: string;
  phone: string;
  instagram: string;
  tiktok: string;
  facebook: string;
} {
  const source =
    eShopPublicSlug === SEED_DEV_COMPANY_SECOND_ESHOP_SLUG
      ? SEED_DEV_ESHOP_PUBLIC_CONTACT_SECOND
      : SEED_DEV_ESHOP_PUBLIC_CONTACT;

  return {
    email: source.email || fallbackEmail,
    phone: source.phone || fallbackPhone || '',
    instagram: normalizeInstagramProfileUrl(source.instagram),
    tiktok: normalizeTiktokProfileUrl(source.tiktok),
    facebook: normalizeFacebookProfileUrl(source.facebook),
  };
}

export const SEED_BRANCH_NAME = 'Casa matriz';
export const SEED_BRANCH_ADDRESS = SEED_DEV_COMPANY.address;
export const SEED_BRANCH_PHONE = SEED_DEV_COMPANY.phone;
export const SEED_BRANCH_LOCATION = { lat: -36.143, lng: -71.824 };

export const SEED_STORAGE_NAME = 'Bodega principal';
export const SEED_STORAGE_CODE = 'SEED-BODEGA-01';

export const SEED_PRICE_LIST_RETAIL_NAME = 'Minorista';
/** Segunda lista POS (antes «Mayorista»); tipo VIP en BD demo. */
export const SEED_PRICE_LIST_VIP_NAME = 'Vip';
/** @deprecated Alias de compatibilidad — usar `SEED_PRICE_LIST_VIP_NAME`. */
export const SEED_PRICE_LIST_WHOLESALE_NAME = SEED_PRICE_LIST_VIP_NAME;
/** Lista de precios de catálogo eShop (no eliminable). */
export const SEED_PRICE_LIST_ESHOP_NAME = 'eShop';

/** Nombres legacy a renombrar hacia Vip al re-sembrar. */
export const SEED_PRICE_LIST_VIP_LEGACY_NAMES = ['Mayorista'] as const;

export const SEED_POS_NAMES = ['Caja 1', 'Caja 2'] as const;

/** Punto de preventa (genera tickets para cobrar en caja). */
export const SEED_PRESALE_POS_NAME = 'Preventa 1';

export const SEED_CASH_HUBS = [
  { code: 'CEV-00001', name: 'Principal' },
  { code: 'CEV-00002', name: 'Secundario' },
] as const;

/** Zona / cobertura demo (Parral) + calendario Jul–Ago 2026. */
export const SEED_DELIVERY_ZONE_NAME = 'Parral';
export const SEED_DELIVERY_COMMUNE_CODE = 'parral';
export const SEED_DELIVERY_SHIPPING_FEE = 2500;
export const SEED_DELIVERY_DEPOT = {
  lat: -36.1315,
  lng: -71.8188,
  address: SEED_DEV_COMPANY.address,
  osrmUrl: 'http://localhost:5001',
} as const;

/** Reparto local (LOCAL_DELIVERY) — un turno por día. */
export const SEED_DELIVERY_REPARTO = {
  name: 'Reparto diario',
  departureTime: '12:00:00',
  orderCutoffTime: '10:00:00',
  maxOrders: 40,
} as const;

/** Retiro en local (PICKUP) — ventana diaria. */
export const SEED_DELIVERY_PICKUP = {
  name: 'Retiro en local',
  departureTime: '09:00:00',
  endTime: '18:00:00',
  orderCutoffTime: '08:30:00',
  maxOrders: null as number | null,
} as const;

/** Meses (1–12) a sembrar en el calendario de franjas. */
export const SEED_DELIVERY_CALENDAR_MONTHS_2026 = [7, 8] as const;

const SEED_PM_NAMESPACE = 'flowstore-seed-pm-dev-v1';

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
      accountKey: 'seed-dev-banco-estado-cc',
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '12345678901',
      accountHolderName,
      isPrimary: true,
    },
    {
      accountKey: 'seed-dev-santander-cc',
      bankName: BankName.BANCO_SANTANDER,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '98765432109',
      accountHolderName,
      isPrimary: false,
    },
  ];
}

/** Cuenta bancaria principal para personas empleadas en seed dev (nómina / transferencia). */
export function buildSeedEmployeeBankAccount(
  accountHolderName: string,
  documentNumber: string,
): PersonBankAccount {
  const digits = documentNumber.replace(/\D/g, '').slice(-10).padStart(10, '0');
  return {
    accountKey: `seed-employee-${digits}`,
    bankName: BankName.BANCO_ESTADO,
    accountType: AccountTypeName.CUENTA_VISTA,
    accountNumber: digits,
    accountHolderName,
    isPrimary: true,
    notes: 'Cuenta seed para liquidaciones',
  };
}

const COMPANY_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
  PaymentMethod.CHECK,
  PaymentMethod.INTERNAL_CREDIT,
];

const PRIMARY_BANK_ACCOUNT_KEY = 'seed-dev-banco-estado-cc';

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
    metadata: null,
  }));
}

type PosMethodSeed = {
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange?: boolean;
};

/** Precarga alineada a Caja 1 en BD demo (efectivo + transferencia). */
const POS_METHOD_SEED: Partial<Record<PaymentMethod, PosMethodSeed>> = {
  [PaymentMethod.CASH]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 0,
    isDefaultForChange: true,
  },
  [PaymentMethod.CREDIT_CARD]: { preloadOnPaymentScreen: false, preloadOrder: 1 },
  [PaymentMethod.DEBIT_CARD]: { preloadOnPaymentScreen: false, preloadOrder: 2 },
  [PaymentMethod.TRANSFER]: { preloadOnPaymentScreen: true, preloadOrder: 3 },
  [PaymentMethod.CHECK]: { preloadOnPaymentScreen: false, preloadOrder: 4 },
  [PaymentMethod.INTERNAL_CREDIT]: {
    preloadOnPaymentScreen: false,
    preloadOrder: 5,
  },
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

export function buildSeedCompanySettings(
  existing: Record<string, unknown> | null | undefined,
  paymentMethods: CompanyPaymentMethodConfig[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...existing } : {};

  return {
    ...base,
    paymentMethods,
    mercadoPago: buildSeedMercadoPagoSettings(),
    checks: {
      enabled: true,
      receiveChecks: true,
      issueChecks: true,
      allowPostdatedReceived: true,
      allowPostdatedIssued: true,
      defaultDepositBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
      defaultIssueBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
    },
    quotations: {
      enabled: true,
      defaultValidityDays: 10,
      maxValidityDays: 20,
      allowCustomValidity: true,
      defaultTerms: null,
    },
    internalCustomerCredit: { enabled: true },
    presales: { enabled: true },
    eShopEnabled: true,
    eShopPublicSlug: 'demo',
    eShopCustomerPortalEnabled: true,
    eShopRegistrationRequireRut: false,
    eShopShowDebtsInPortal: true,
    eShopFeaturedProductVariantIds: [],
    eShopFeaturedProductIds: [],
    eShopFreeShippingThreshold: 50_000,
    eShopShippingMode: 'disabled',
    eShopDefaultBranchId: null,
    eShopDefaultPriceListId: null,
    eShopDefaultStorageId: null,
    eShopTemplateId: 'classic',
    eShopThemeTokenOverrides: {},
    eShopTopBar: buildDefaultCompanyEShopTopBarSettings(),
    eShopFooter: buildDefaultCompanyEShopFooterSettings(),
    companyIdentity: {
      tagline: 'Tu tienda en línea',
      brandManifest:
        'Productos seleccionados, atención cercana y compra con confianza. Retiro en sucursal o despacho según tu zona.',
    },
    publicContact: buildSeedEshopPublicContact(
      typeof base.eShopPublicSlug === 'string' ? base.eShopPublicSlug : 'demo',
      SEED_DEV_ESHOP_PUBLIC_CONTACT.email,
      SEED_DEV_ESHOP_PUBLIC_CONTACT.phone,
    ),
  };
}

/** Dos socios genéricos (sin datos Parabrisas). */
export const SEED_DEV_SHAREHOLDERS = [
  {
    firstName: 'Ana',
    lastName: 'García López',
    documentType: DocumentType.RUN,
    documentNumber: '12.345.678-5',
    ownershipPercentage: 60,
    partnerType: 'FOUNDING_PARTNER',
    joinDate: '2019-03-01',
  },
  {
    firstName: 'Luis',
    lastName: 'Morales Ríos',
    documentType: DocumentType.RUN,
    documentNumber: '15.987.654-3',
    ownershipPercentage: 40,
    partnerType: 'PARTNER',
    joinDate: '2020-06-15',
  },
] as const;
