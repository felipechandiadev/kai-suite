import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionType,
} from '../../domain/promotion.enums';
import { applyPromotions } from '../discount-engine';
import {
  ApplyPromotionsArgs,
  EffectivePromotion,
  EffectivePromotionScopes,
  EngineCartLine,
  EngineContext,
  EngineResult,
  ManualSelection,
} from '../discount-engine.types';

/**
 * Fixtures compartidas entre los tests del backend y el test de paridad
 * del mirror del POS. Si cambia algo aquí, los tests del POS deberían
 * fallar — esa es la idea.
 */

export const FIXTURE_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
export const FIXTURE_BRANCH_ID = '22222222-2222-2222-2222-222222222222';
export const FIXTURE_POS_ID = '33333333-3333-3333-3333-333333333333';
export const FIXTURE_CUSTOMER_ID = '44444444-4444-4444-4444-444444444444';
export const FIXTURE_CATEGORY_ID = '55555555-5555-5555-5555-555555555555';
export const FIXTURE_OTHER_CATEGORY_ID = '66666666-6666-6666-6666-666666666666';
export const FIXTURE_PRODUCT_ID = '77777777-7777-7777-7777-777777777777';
export const FIXTURE_OTHER_PRODUCT_ID = '88888888-8888-8888-8888-888888888888';
export const FIXTURE_VARIANT_ID = '99999999-9999-9999-9999-999999999999';
export const FIXTURE_OTHER_VARIANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const FIXTURE_PAYMENT_METHOD_CASH = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const FIXTURE_PAYMENT_METHOD_CARD = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export function fixedNow(): Date {
  // Miércoles, 2026-05-13, 14:00 hora local (sea cual sea el TZ del runner).
  return new Date(2026, 4, 13, 14, 0, 0);
}

export function ctxDefault(overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    companyId: FIXTURE_COMPANY_ID,
    branchId: FIXTURE_BRANCH_ID,
    pointOfSaleId: FIXTURE_POS_ID,
    now: fixedNow(),
    ...overrides,
  };
}

export function emptyScopes(): EffectivePromotionScopes {
  return {
    branches: [],
    pointsOfSale: [],
    products: [],
    variants: [],
    categories: [],
    customers: [],
    paymentMethods: [],
  };
}

export function lineRing(overrides: Partial<EngineCartLine> = {}): EngineCartLine {
  return {
    lineId: 'L-RING',
    variantId: FIXTURE_VARIANT_ID,
    productId: FIXTURE_PRODUCT_ID,
    categoryId: FIXTURE_CATEGORY_ID,
    unitPrice: 100_000,
    quantity: 1,
    ...overrides,
  };
}

export function lineNecklace(overrides: Partial<EngineCartLine> = {}): EngineCartLine {
  return {
    lineId: 'L-NECK',
    variantId: FIXTURE_OTHER_VARIANT_ID,
    productId: FIXTURE_OTHER_PRODUCT_ID,
    categoryId: FIXTURE_OTHER_CATEGORY_ID,
    unitPrice: 50_000,
    quantity: 2,
    ...overrides,
  };
}

export function promo(overrides: Partial<EffectivePromotion> = {}): EffectivePromotion {
  return {
    id: 'PROMO-DEFAULT',
    code: 'DEFAULT',
    name: 'Promoción default',
    type: PromotionType.PERCENT_ON_LINE,
    value: 10,
    activation: PromotionActivation.AUTO,
    stackable: true,
    priority: 0,
    usesCount: 0,
    authorization: PromotionAuthorization.NONE,
    scopes: emptyScopes(),
    ...overrides,
  };
}

/** Opt-in automático de promos AUTO para tests de cálculo (no de activación). */
export function applyPromotionsAutoSelected(
  args: ApplyPromotionsArgs,
): EngineResult {
  const merged: ManualSelection[] = [...args.manualSelections];
  for (const p of args.promotions) {
    if (p.activation !== PromotionActivation.AUTO) continue;
    if (merged.some((m) => m.promotionId === p.id)) continue;
    merged.push({ promotionId: p.id });
  }
  return applyPromotions({ ...args, manualSelections: merged });
}
