import {
  COMPANY_PAYMENT_METHOD_LABELS,
  companyPaymentMethodAlwaysRequiresReference,
  POS_CONFIGURABLE_METHOD_IDS,
  type CompanyPaymentMethodConfig,
  type CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";

/** Badge para la card del listado de POS (solo medios habilitados). */
export type PosPaymentMethodDisplayBadge = {
  companyPaymentMethodId: string;
  label: string;
  alias?: string | null;
};

/** Configuración local del POS para un medio del catálogo de empresa. */
export interface PosPaymentMethodConfig {
  companyPaymentMethodId: string;
  isEnabled: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder?: number | null;
  isDefaultForChange: boolean;
  bankAccountKey?: string | null;
  /**
   * Override por POS de "pide referencia". `null` = heredar del catálogo
   * de empresa al resolver el efectivo en kai-pos.
   */
  requireReference?: boolean | null;
}

/** Vista efectiva (merge company+POS) que entrega el backend al kai-pos. */
export interface EffectivePaymentMethod {
  companyPaymentMethodId: string;
  method: CompanyPaymentMethodId;
  label: string;
  alias?: string | null;
  bankAccountKey?: string | null;
  requireReference: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange: boolean;
  displayOrder: number;
}

/** Alinea config POS con catálogo empresa (incluye medios nuevos deshabilitados). */
export function syncPosPaymentDraftWithCatalog(
  catalog: CompanyPaymentMethodConfig[],
  posList: PosPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  const byId = new Map(posList.map((p) => [p.companyPaymentMethodId, p]));
  return catalog
    .filter((c) => c.isActive && (POS_CONFIGURABLE_METHOD_IDS as string[]).includes(c.method))
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((cmp) => {
      const existing = byId.get(cmp.id);
      if (existing) return existing;
      return {
        companyPaymentMethodId: cmp.id,
        isEnabled: false,
        preloadOnPaymentScreen: false,
        preloadOrder: null,
        isDefaultForChange: false,
        bankAccountKey: cmp.bankAccountKey ?? null,
        requireReference: companyPaymentMethodAlwaysRequiresReference(cmp.method) ? true : null,
      };
    });
}

/** Crea valores default para una entrada nueva del POS apuntando al catálogo. */
/** Medios habilitados en el POS para mostrar en grillas/cards (misma lógica que el merge del backend). */
export function buildEnabledPosPaymentDisplayBadges(
  catalog: CompanyPaymentMethodConfig[],
  posList: PosPaymentMethodConfig[],
): PosPaymentMethodDisplayBadge[] {
  const synced = syncPosPaymentDraftWithCatalog(catalog, posList);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const rows: Array<PosPaymentMethodDisplayBadge & { sortOrder: number }> = [];

  for (const pos of synced) {
    if (!pos.isEnabled) {
      continue;
    }
    const cmp = byId.get(pos.companyPaymentMethodId);
    if (!cmp || !cmp.isActive) {
      continue;
    }
    if (!(POS_CONFIGURABLE_METHOD_IDS as string[]).includes(cmp.method)) {
      continue;
    }
    const sortOrder =
      typeof pos.preloadOrder === "number" && Number.isFinite(pos.preloadOrder)
        ? pos.preloadOrder
        : cmp.displayOrder;
    rows.push({
      companyPaymentMethodId: cmp.id,
      label: COMPANY_PAYMENT_METHOD_LABELS[cmp.method] ?? cmp.method,
      alias: cmp.alias ?? null,
      sortOrder,
    });
  }

  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ companyPaymentMethodId, label, alias }) => ({
      companyPaymentMethodId,
      label,
      alias,
    }));
}

export function defaultPosEntryFor(
  cmp: CompanyPaymentMethodConfig,
  isCash: boolean,
): PosPaymentMethodConfig {
  return {
    companyPaymentMethodId: cmp.id,
    isEnabled: true,
    preloadOnPaymentScreen: isCash,
    preloadOrder: isCash ? 0 : null,
    isDefaultForChange: isCash,
    bankAccountKey: cmp.bankAccountKey ?? null,
    requireReference: companyPaymentMethodAlwaysRequiresReference(cmp.method)
      ? true
      : (cmp.requireReference ?? false),
  };
}
