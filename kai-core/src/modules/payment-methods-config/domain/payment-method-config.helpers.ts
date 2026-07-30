import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import {
  CompanyPaymentMethodConfig,
  EffectivePaymentMethod,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE,
  POS_IMPLICIT_PAYMENT_METHODS,
  POS_INVALID_METHODS,
  PosPaymentMethodConfig,
} from './payment-method-config.types';

function isPosConfigurableCatalogMethod(method: PaymentMethod): boolean {
  return (
    !POS_INVALID_METHODS.has(method) && !POS_IMPLICIT_PAYMENT_METHODS.has(method)
  );
}

const VALID_METHODS = new Set<string>(Object.values(PaymentMethod));

/**
 * IDs fijos para el catálogo por defecto (empresa sin `settings.paymentMethods`).
 * Evita UUID aleatorios en cada GET, que rompen la config POS ya guardada.
 */
const DEFAULT_COMPANY_PAYMENT_METHOD_IDS: Partial<
  Record<PaymentMethod, string>
> = {
  [PaymentMethod.CASH]: 'e7b3c1a0-0001-4000-8000-000000000001',
  [PaymentMethod.CREDIT_CARD]: 'e7b3c1a0-0001-4000-8000-000000000002',
  [PaymentMethod.DEBIT_CARD]: 'e7b3c1a0-0001-4000-8000-000000000003',
  [PaymentMethod.TRANSFER]: 'e7b3c1a0-0001-4000-8000-000000000004',
  [PaymentMethod.CHECK]: 'e7b3c1a0-0001-4000-8000-000000000005',
  [PaymentMethod.INTERNAL_CREDIT]: 'e7b3c1a0-0001-4000-8000-000000000006',
};

export function defaultCompanyPaymentMethodId(method: PaymentMethod): string {
  return DEFAULT_COMPANY_PAYMENT_METHOD_IDS[method] ?? randomUUID();
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

const CARD_FEE_METHODS = new Set<PaymentMethod>([
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
]);

/**
 * Comisión adquirente: solo tarjetas; 0–100 o null. Otros métodos → null.
 */
export function sanitizeFeePercent(
  method: PaymentMethod,
  raw: unknown,
  index: number,
): number | null {
  if (!CARD_FEE_METHODS.has(method)) {
    return null;
  }
  if (raw == null || raw === '') {
    return null;
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(
      `Medio de pago #${index + 1}: comisión (%) inválida`,
    );
  }
  if (n < 0 || n > 100) {
    throw new Error(
      `Medio de pago #${index + 1}: comisión (%) debe estar entre 0 y 100`,
    );
  }
  return Math.round(n * 100) / 100;
}

/**
 * Sanitiza y valida una entrada del catálogo de empresa.
 * - Asigna `id` UUID si falta.
 * - Coerce flags booleanos.
 * - Lanza `Error` con mensaje legible para el caller (servicio).
 */
export function sanitizeCompanyPaymentMethod(
  raw: unknown,
  index: number,
): CompanyPaymentMethodConfig {
  const r = (raw ?? {}) as Partial<CompanyPaymentMethodConfig> & {
    [k: string]: unknown;
  };

  const method = r.method as PaymentMethod | undefined;
  if (!method || !VALID_METHODS.has(method)) {
    throw new Error(
      `Medio de pago #${index + 1}: tipo "${String(method ?? '')}" no es válido`,
    );
  }
  // `MIXED` no es un medio configurable: el sistema lo infiere cuando
  // una transacción tiene más de un detalle de pago.
  if (method === PaymentMethod.MIXED) {
    throw new Error(
      `Medio de pago #${index + 1}: "MIXED" no es un medio configurable; un pago mixto se infiere automáticamente cuando hay más de un pago por transacción`,
    );
  }

  const id =
    typeof r.id === 'string' && isUUID(r.id)
      ? r.id
      : defaultCompanyPaymentMethodId(method);

  const displayOrder =
    Number.isFinite(Number(r.displayOrder)) ? Math.trunc(Number(r.displayOrder)) : index;

  return {
    id,
    method,
    alias: trimOrNull(r.alias),
    displayOrder,
    isActive: r.isActive !== false,
    requireReference: PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.has(method)
      ? true
      : r.requireReference === true,
    bankAccountKey: trimOrNull(r.bankAccountKey),
    feePercent: sanitizeFeePercent(method, r.feePercent, index),
    metadata: r.metadata && typeof r.metadata === 'object' ? (r.metadata as Record<string, any>) : null,
    voucherKindId:
      method === PaymentMethod.VOUCHER
        ? typeof r.voucherKindId === 'string' && r.voucherKindId.trim()
          ? r.voucherKindId.trim()
          : null
        : null,
  };
}

/**
 * Valida la lista completa del catálogo de empresa:
 *  - método válido y sanitizado.
 *  - alias único por `(method, alias-trimmed)` (alias vacío también único).
 *  - sin ids duplicados.
 */
export function validateCompanyPaymentMethods(
  list: unknown,
): CompanyPaymentMethodConfig[] {
  if (!Array.isArray(list)) {
    throw new Error('La lista de medios de pago debe ser un arreglo');
  }
  const sanitized = list.map((r, i) => sanitizeCompanyPaymentMethod(r, i));
  const aliasKeys = new Set<string>();
  const idSet = new Set<string>();
  for (const item of sanitized) {
    if (idSet.has(item.id)) {
      throw new Error(`Medio de pago duplicado (id ${item.id})`);
    }
    idSet.add(item.id);

    if (item.method === PaymentMethod.VOUCHER && !item.voucherKindId?.trim()) {
      throw new Error(
        `Medio de pago VOUCHER (${item.alias ?? item.id}): debe indicar voucherKindId`,
      );
    }

    const aliasKey = `${item.method}::${(item.alias ?? '').toLowerCase()}`;
    if (aliasKeys.has(aliasKey)) {
      const aliasLabel = item.alias ? `"${item.alias}"` : '(sin alias)';
      throw new Error(
        `Alias duplicado para método ${item.method}: ${aliasLabel}`,
      );
    }
    aliasKeys.add(aliasKey);
  }
  return sanitized;
}

/**
 * Sanitiza una entrada del config POS, validando que su
 * `companyPaymentMethodId` exista en el catálogo de empresa.
 */
export function sanitizePosPaymentMethod(
  raw: unknown,
  index: number,
  companyCatalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig {
  const r = (raw ?? {}) as Partial<PosPaymentMethodConfig>;
  const cmpId = typeof r.companyPaymentMethodId === 'string' ? r.companyPaymentMethodId : '';
  if (!isUUID(cmpId)) {
    throw new Error(
      `Medio de pago POS #${index + 1}: companyPaymentMethodId inválido`,
    );
  }
  const exists = companyCatalog.find((c) => c.id === cmpId);
  if (!exists) {
    throw new Error(
      `Medio de pago POS #${index + 1}: no existe en el catálogo de la empresa`,
    );
  }
  if (POS_IMPLICIT_PAYMENT_METHODS.has(exists.method)) {
    throw new Error(
      `Medio de pago POS #${index + 1}: ${exists.method} es un medio implícito del sistema y no se configura por POS`,
    );
  }
  const preloadOrder =
    r.preloadOrder == null
      ? null
      : Number.isFinite(Number(r.preloadOrder))
        ? Math.trunc(Number(r.preloadOrder))
        : null;

  const requireReference = PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.has(exists.method)
    ? null
    : r.requireReference == null
      ? null
      : r.requireReference === true
        ? true
        : r.requireReference === false
          ? false
          : null;

  return {
    companyPaymentMethodId: cmpId,
    isEnabled: r.isEnabled === true,
    preloadOnPaymentScreen: r.preloadOnPaymentScreen === true,
    preloadOrder,
    // Solo efectivo permite "default para vuelto".
    isDefaultForChange:
      exists.method === PaymentMethod.CASH && r.isDefaultForChange === true,
    bankAccountKey: trimOrNull(r.bankAccountKey),
    requireReference,
  };
}

/**
 * Valida la lista del POS:
 * - referencias al catálogo de empresa.
 * - máximo un `isDefaultForChange = true`.
 * - sin duplicados (un mismo `companyPaymentMethodId` no se repite).
 */
export function validatePosPaymentMethods(
  list: unknown,
  companyCatalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  if (!Array.isArray(list)) {
    throw new Error('La lista de medios POS debe ser un arreglo');
  }
  const sanitized = list.map((r, i) =>
    sanitizePosPaymentMethod(r, i, companyCatalog),
  );
  const seen = new Set<string>();
  let defaultCount = 0;
  for (const item of sanitized) {
    if (seen.has(item.companyPaymentMethodId)) {
      throw new Error(
        'Medio de pago POS duplicado: cada medio puede aparecer una sola vez',
      );
    }
    seen.add(item.companyPaymentMethodId);
    if (item.isDefaultForChange) defaultCount += 1;
  }
  if (defaultCount > 1) {
    throw new Error(
      'Solo puede haber un medio marcado como "default para vuelto" por POS',
    );
  }
  return sanitized;
}

/**
 * Alinea la config del POS con el catálogo actual de la empresa:
 * - conserva filas existentes;
 * - agrega entradas para medios nuevos (deshabilitados por defecto);
 * - omite referencias huérfanas a ids ya no presentes en empresa.
 */
export function syncPosPaymentMethodsWithCatalog(
  companyCatalog: CompanyPaymentMethodConfig[],
  posList: PosPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  const byPosId = new Map(
    posList.map((p) => [p.companyPaymentMethodId, p]),
  );
  const applicable = companyCatalog
    .filter((c) => isPosConfigurableCatalogMethod(c.method))
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return applicable.map((cmp) => {
    const existing = byPosId.get(cmp.id);
    if (existing) {
      return existing;
    }
    return {
      companyPaymentMethodId: cmp.id,
      isEnabled: false,
      preloadOnPaymentScreen: false,
      preloadOrder: null,
      isDefaultForChange: false,
      bankAccountKey: cmp.bankAccountKey ?? null,
      requireReference: null,
    };
  });
}

/**
 * Calcula el catálogo "efectivo" para kai-pos:
 *  - solo entradas activas en empresa
 *  - excluyendo métodos no aptos para POS (MIXED/CREDIT/INTERNAL_CREDIT)
 *  - filtradas a las que el POS habilita
 *  - ordenadas: primero las de preload (por preloadOrder), luego el resto
 *    por displayOrder de la empresa.
 */
export function mergeCompanyAndPos(
  companyCatalog: CompanyPaymentMethodConfig[],
  posList: PosPaymentMethodConfig[],
): EffectivePaymentMethod[] {
  const syncedPos = syncPosPaymentMethodsWithCatalog(companyCatalog, posList);
  const byId = new Map(companyCatalog.map((c) => [c.id, c]));
  const out: EffectivePaymentMethod[] = [];
  for (const pos of syncedPos) {
    if (!pos.isEnabled) continue;
    const cmp = byId.get(pos.companyPaymentMethodId);
    if (!cmp) continue;
    if (!cmp.isActive) continue;
    if (POS_INVALID_METHODS.has(cmp.method)) continue;
    if (POS_IMPLICIT_PAYMENT_METHODS.has(cmp.method)) continue;

    out.push({
      companyPaymentMethodId: cmp.id,
      method: cmp.method,
      label: cmp.alias?.trim() || PAYMENT_METHOD_LABELS[cmp.method] || cmp.method,
      alias: cmp.alias ?? null,
      bankAccountKey: pos.bankAccountKey ?? cmp.bankAccountKey ?? null,
      requireReference: PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.has(cmp.method)
        ? true
        : pos.requireReference == null
          ? cmp.requireReference
          : pos.requireReference,
      preloadOnPaymentScreen: pos.preloadOnPaymentScreen,
      preloadOrder: pos.preloadOrder ?? null,
      isDefaultForChange: pos.isDefaultForChange,
      displayOrder: cmp.displayOrder,
    });
  }
  out.sort((a, b) => {
    // Orden único global configurado por POS:
    // usamos `preloadOrder` como índice general (aunque el nombre histórico
    // venga de "precarga"). Si falta, caemos a displayOrder de empresa.
    const ao = a.preloadOrder ?? 999;
    const bo = b.preloadOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return a.displayOrder - b.displayOrder;
  });
  return out;
}

/**
 * Default factory: usado en backfill (cuando una empresa o POS aún no tiene
 * catálogo configurado) para mantener el comportamiento previo del POS.
 */
export function buildDefaultCompanyCatalog(): CompanyPaymentMethodConfig[] {
  const baseMethods: PaymentMethod[] = [
    PaymentMethod.CASH,
    PaymentMethod.CREDIT_CARD,
    PaymentMethod.DEBIT_CARD,
    PaymentMethod.TRANSFER,
    PaymentMethod.CHECK,
  ];
  return baseMethods.map((m, i) => ({
    id: defaultCompanyPaymentMethodId(m),
    method: m,
    alias: null,
    displayOrder: i,
    isActive: true,
    requireReference: false,
    bankAccountKey: null,
    feePercent: null,
    metadata: null,
  }));
}

/**
 * Default factory para un POS recién creado: habilita todos los del
 * catálogo y precarga CASH como antes.
 */
export function buildDefaultPosList(
  catalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  return catalog
    .filter((c) => isPosConfigurableCatalogMethod(c.method))
    .map((c) => ({
      companyPaymentMethodId: c.id,
      isEnabled: true,
      preloadOnPaymentScreen: c.method === PaymentMethod.CASH,
      preloadOrder: c.method === PaymentMethod.CASH ? 0 : null,
      isDefaultForChange: c.method === PaymentMethod.CASH,
      requireReference: null,
    }));
}
