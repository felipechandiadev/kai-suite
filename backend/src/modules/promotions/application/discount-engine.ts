import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionScopeMode,
  PromotionType,
} from '../domain/promotion.enums';
import {
  AppliedSnapshot,
  ApplyPromotionsArgs,
  EffectivePromotion,
  EngineCartLine,
  EngineContext,
  EngineResult,
  EngineWarning,
  ManualSelection,
  ResolvedLine,
  ResolvedLineDiscount,
} from './discount-engine.types';

/**
 * Motor puro de descuentos. Sin acceso a BD, red ni `Date.now()` —
 * todo entra por parámetros. Esto permite:
 *   - Espejar el motor en pwa-pos sin riesgo de drift.
 *   - Testear exhaustivamente cada combinatoria.
 *   - Re-validar server-side con datos canónicos al cerrar la venta.
 *
 * Reglas generales:
 *   - Las líneas con `frozenDiscount` (ej. cotización cargada) NO se
 *     re-evalúan: el snapshot manda.
 *   - Una línea sólo puede ser tocada por UNA promoción de línea
 *     (gana la de mayor `priority`, con desempate por `code`).
 *   - Múltiples promociones de orden se suman si todas son `stackable`.
 *   - Si una promoción no-stackable se aplica al orden, descarta a las
 *     demás promociones de orden con menor `priority`.
 *   - El descuento NUNCA puede dejar el subtotal en negativo.
 */
export function applyPromotions(args: ApplyPromotionsArgs): EngineResult {
  const { cart, ctx, promotions, manualSelections, customerHistory } = args;

  const warnings: EngineWarning[] = [];
  const resolved: ResolvedLine[] = cart.lines.map((l) => ({
    lineId: l.lineId,
    discount: l.frozenDiscount ?? null,
  }));
  const applied: AppliedSnapshot[] = [];

  // ── Pre-filtrado ────────────────────────────────────────────────────
  const candidates = promotions
    .filter((p) => isElegibleByGeneralRules(p, ctx, cart, customerHistory, warnings))
    .sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));

  // Set de promoIds en `manualSelections` (AUTO, MANUAL y CODE_ENTRY).
  // Toda promoción requiere confirmación explícita del cajero (opt-in).
  const manualIds = new Set(manualSelections.map((m) => m.promotionId));

  const isAllowedByActivation = (p: EffectivePromotion): boolean => {
    return manualIds.has(p.id);
  };

  // ── Procesar promociones de línea ──────────────────────────────────
  const lineLevelTypes: PromotionType[] = [
    PromotionType.PERCENT_ON_LINE,
    PromotionType.AMOUNT_ON_LINE,
    PromotionType.PRICE_OVERRIDE,
    PromotionType.BUY_X_GET_Y,
  ];
  const linePromos = candidates.filter((p) => lineLevelTypes.includes(p.type));

  // Estado: por línea, qué promoción ya la tocó (para respetar no-stackable).
  const lineClaim = new Map<string, EffectivePromotion>();
  for (const idx in cart.lines) {
    if (cart.lines[idx].frozenDiscount) {
      // Se considera "claimed" por el frozen snapshot — bloquea futuras
      // promociones de línea para esta línea.
      lineClaim.set(cart.lines[idx].lineId, {
        id: cart.lines[idx].frozenDiscount!.promotionId,
      } as EffectivePromotion);
    }
  }

  for (const promo of linePromos) {
    if (!isAllowedByActivation(promo)) continue;

    const eligibleLines = cart.lines.filter((l) =>
      isLineEligibleForPromotion(l, promo, manualSelections),
    );
    if (eligibleLines.length === 0) continue;

    // Verifica mínimos calculados sobre las líneas elegibles.
    const eligibleSubtotal = eligibleLines.reduce(
      (acc, l) => acc + l.unitPrice * l.quantity,
      0,
    );
    const eligibleQuantity = eligibleLines.reduce((acc, l) => acc + l.quantity, 0);
    if (promo.minSubtotal != null && eligibleSubtotal < promo.minSubtotal) continue;
    if (promo.minQuantity != null && eligibleQuantity < promo.minQuantity) continue;

    let totalDiscounted = 0;
    const affected: string[] = [];

    for (const line of eligibleLines) {
      const claim = lineClaim.get(line.lineId);
      if (claim && !promo.stackable) continue;
      // Stackable de línea: en la práctica una línea solo recibe un
      // descuento de línea. Si ya está reclamada por OTRA promo, sólo
      // permitimos sobrescribir si la nueva tiene mayor priority. Como
      // procesamos por priority desc, llegamos primero las altas, así
      // la primera que reclama gana.
      if (claim) continue;

      const calc = computeLineDiscount(promo, line);
      if (!calc || calc.discountAmount <= 0) continue;

      // Cap por maxValue (por aplicación, repartido entre líneas).
      let appliedAmount = calc.discountAmount;

      resolved.find((r) => r.lineId === line.lineId)!.discount = {
        promotionId: promo.id,
        promotionCode: promo.code,
        promotionName: promo.name,
        discountPercentage: calc.discountPercentage,
        discountAmount: roundCurrency(appliedAmount),
        appliedQuantity: calc.appliedQuantity,
        overridesUnitPrice: calc.overridesUnitPrice,
        newUnitPrice: calc.newUnitPrice,
      };
      totalDiscounted += appliedAmount;
      affected.push(line.lineId);
      lineClaim.set(line.lineId, promo);
    }

    // Aplica `maxValue` a posteriori si excede.
    if (promo.maxValue != null && totalDiscounted > promo.maxValue) {
      const factor = promo.maxValue / totalDiscounted;
      for (const lineId of affected) {
        const r = resolved.find((x) => x.lineId === lineId);
        if (r?.discount) {
          r.discount.discountAmount = roundCurrency(r.discount.discountAmount * factor);
          r.discount.discountPercentage = r.discount.discountPercentage * factor;
        }
      }
      totalDiscounted = promo.maxValue;
    }

    // Autorización CASHIER + límite porcentual.
    if (
      promo.authorization === PromotionAuthorization.CASHIER &&
      promo.authorizationLimitPct != null
    ) {
      const maxPct = promo.authorizationLimitPct;
      let cappedTotal = 0;
      for (const lineId of affected) {
        const r = resolved.find((x) => x.lineId === lineId);
        if (r?.discount && r.discount.discountPercentage > maxPct) {
          const reductionFactor = maxPct / r.discount.discountPercentage;
          r.discount.discountAmount = roundCurrency(
            r.discount.discountAmount * reductionFactor,
          );
          r.discount.discountPercentage = maxPct;
          warnings.push({
            promotionId: promo.id,
            code: 'CASHIER_LIMIT_APPLIED',
            message: `Recortado a ${maxPct}% por límite de autorización del cajero.`,
          });
        }
        cappedTotal += r?.discount?.discountAmount ?? 0;
      }
      totalDiscounted = cappedTotal;
    }

    if (totalDiscounted > 0) {
      applied.push({
        promotionId: promo.id,
        promotionCode: promo.code,
        promotionName: promo.name,
        type: promo.type,
        activation: promo.activation,
        authorization: promo.authorization,
        amountDiscounted: roundCurrency(totalDiscounted),
        affectedLineIds: affected,
        isOrderLevel: false,
        accountingTag: promo.accountingTag ?? null,
      });
    }
  }

  // ── Procesar promociones de orden ──────────────────────────────────
  const orderLevelTypes: PromotionType[] = [
    PromotionType.PERCENT_ON_ORDER,
    PromotionType.AMOUNT_ON_ORDER,
  ];
  const orderPromos = candidates.filter((p) => orderLevelTypes.includes(p.type));

  // Subtotal post descuentos de línea.
  const linesNetSubtotal = cart.lines.reduce((acc, line) => {
    const r = resolved.find((x) => x.lineId === line.lineId);
    const gross = line.unitPrice * line.quantity;
    const lineDisc = r?.discount?.discountAmount ?? 0;
    return acc + Math.max(0, gross - lineDisc);
  }, 0);

  let orderDiscountAmount = 0;
  let orderNoStackableLocked = false;

  for (const promo of orderPromos) {
    if (!isAllowedByActivation(promo)) continue;
    if (orderNoStackableLocked) continue;

    // Verifica mínimos contra subtotal neto.
    if (promo.minSubtotal != null && linesNetSubtotal < promo.minSubtotal) continue;
    if (promo.minQuantity != null) {
      const totalQty = cart.lines.reduce((acc, l) => acc + l.quantity, 0);
      if (totalQty < promo.minQuantity) continue;
    }

    let amount = 0;
    if (promo.type === PromotionType.PERCENT_ON_ORDER) {
      amount = (linesNetSubtotal * promo.value) / 100;
    } else if (promo.type === PromotionType.AMOUNT_ON_ORDER) {
      amount = Math.min(promo.value, linesNetSubtotal - orderDiscountAmount);
    }

    if (promo.maxValue != null) {
      amount = Math.min(amount, promo.maxValue);
    }
    // No-negativo
    amount = Math.max(0, Math.min(amount, linesNetSubtotal - orderDiscountAmount));

    if (
      promo.authorization === PromotionAuthorization.CASHIER &&
      promo.authorizationLimitPct != null &&
      promo.type === PromotionType.PERCENT_ON_ORDER
    ) {
      const maxPct = promo.authorizationLimitPct;
      const cappedAmount = (linesNetSubtotal * maxPct) / 100;
      if (amount > cappedAmount) {
        amount = cappedAmount;
        warnings.push({
          promotionId: promo.id,
          code: 'CASHIER_LIMIT_APPLIED',
          message: `Recortado a ${maxPct}% por límite del cajero.`,
        });
      }
    }

    if (amount <= 0) continue;

    orderDiscountAmount += amount;

    applied.push({
      promotionId: promo.id,
      promotionCode: promo.code,
      promotionName: promo.name,
      type: promo.type,
      activation: promo.activation,
      authorization: promo.authorization,
      amountDiscounted: roundCurrency(amount),
      affectedLineIds: cart.lines.map((l) => l.lineId),
      isOrderLevel: true,
      accountingTag: promo.accountingTag ?? null,
    });

    if (!promo.stackable) {
      orderNoStackableLocked = true;
    }
  }

  return {
    resolvedLines: resolved,
    orderDiscountAmount: roundCurrency(orderDiscountAmount),
    appliedPromotions: applied,
    warnings,
  };
}

// ── Helpers internos ──────────────────────────────────────────────────

function isElegibleByGeneralRules(
  promo: EffectivePromotion,
  ctx: EngineContext,
  cart: ApplyPromotionsArgs['cart'],
  history: ApplyPromotionsArgs['customerHistory'],
  warnings: EngineWarning[],
): boolean {
  // Vigencia
  if (promo.validFrom) {
    const from = new Date(promo.validFrom);
    if (ctx.now.getTime() < from.getTime()) return false;
  }
  if (promo.validUntil) {
    const until = new Date(promo.validUntil);
    if (ctx.now.getTime() > until.getTime()) return false;
    const daysToExpire = (until.getTime() - ctx.now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysToExpire <= 3) {
      warnings.push({
        promotionId: promo.id,
        code: 'EXPIRING_SOON',
        message: `Esta promoción expira en ${Math.ceil(daysToExpire)} día(s).`,
      });
    }
  }

  // Días de la semana
  if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
    if (!promo.daysOfWeek.includes(ctx.now.getDay())) return false;
  }

  // Ventana horaria
  if (promo.hourFrom || promo.hourTo) {
    const currentMinutes = ctx.now.getHours() * 60 + ctx.now.getMinutes();
    if (promo.hourFrom) {
      const m = parseTimeToMinutes(promo.hourFrom);
      if (m != null && currentMinutes < m) return false;
    }
    if (promo.hourTo) {
      const m = parseTimeToMinutes(promo.hourTo);
      if (m != null && currentMinutes > m) return false;
    }
  }

  // Límite global
  if (promo.maxUsesTotal != null && promo.usesCount >= promo.maxUsesTotal) {
    warnings.push({
      promotionId: promo.id,
      code: 'GLOBAL_LIMIT_REACHED',
      message: 'Esta promoción ya alcanzó su límite global de usos.',
    });
    return false;
  }

  // Límite por cliente
  if (
    promo.maxUsesPerCustomer != null &&
    cart.customerId &&
    (history.find((h) => h.promotionId === promo.id)?.usesByThisCustomer ?? 0) >=
      promo.maxUsesPerCustomer
  ) {
    warnings.push({
      promotionId: promo.id,
      code: 'CUSTOMER_LIMIT_REACHED',
      message: 'El cliente ya alcanzó el límite de usos para esta promoción.',
    });
    return false;
  }

  // Scopes branch + POS son requisitos duros
  if (!matchesScope(promo.scopes.branches, 'branchId', ctx.branchId)) return false;
  if (!matchesScope(promo.scopes.pointsOfSale, 'pointOfSaleId', ctx.pointOfSaleId))
    return false;

  // Scope cliente
  if (cart.customerId == null) {
    // Si la promo tiene INCLUDE de clientes, requiere cliente. EXCLUDE no exige.
    const hasInclude = promo.scopes.customers.some((s) => s.mode === PromotionScopeMode.INCLUDE);
    if (hasInclude) return false;
  } else {
    if (!matchesScope(promo.scopes.customers, 'customerId', cart.customerId)) return false;
  }

  // Scope método de pago: si hay INCLUDEs y ningún medio coincide → fuera.
  // Si hay EXCLUDEs y un medio coincide → fuera.
  if (!matchesScopeAny(promo.scopes.paymentMethods, 'companyPaymentMethodId', cart.paymentMethodIds))
    return false;

  return true;
}

function isLineEligibleForPromotion(
  line: EngineCartLine,
  promo: EffectivePromotion,
  manualSelections: ApplyPromotionsArgs['manualSelections'],
): boolean {
  // Opt-in con lineIds: limita a esas líneas (AUTO, MANUAL y CODE_ENTRY).
  const sel = manualSelections.find((m) => m.promotionId === promo.id);
  if (sel?.lineIds && sel.lineIds.length > 0 && !sel.lineIds.includes(line.lineId)) {
    return false;
  }

  if (!matchesScope(promo.scopes.products, 'productId', line.productId)) return false;
  if (!matchesScope(promo.scopes.variants, 'variantId', line.variantId)) return false;
  if (line.categoryId == null) {
    const hasInclude = promo.scopes.categories.some(
      (s) => s.mode === PromotionScopeMode.INCLUDE,
    );
    if (hasInclude) return false;
  } else {
    if (!matchesScope(promo.scopes.categories, 'categoryId', line.categoryId)) return false;
  }
  return true;
}

function matchesScope<T extends { mode: PromotionScopeMode }>(
  scopes: T[],
  key: keyof T,
  value: string,
): boolean {
  if (scopes.length === 0) return true;
  const includes = scopes.filter((s) => s.mode === PromotionScopeMode.INCLUDE);
  const excludes = scopes.filter((s) => s.mode === PromotionScopeMode.EXCLUDE);
  if (excludes.some((s) => (s[key] as unknown as string) === value)) return false;
  if (includes.length === 0) return true;
  return includes.some((s) => (s[key] as unknown as string) === value);
}

function matchesScopeAny<T extends { mode: PromotionScopeMode }>(
  scopes: T[],
  key: keyof T,
  values: string[],
): boolean {
  if (scopes.length === 0) return true;
  const includes = scopes.filter((s) => s.mode === PromotionScopeMode.INCLUDE);
  const excludes = scopes.filter((s) => s.mode === PromotionScopeMode.EXCLUDE);
  if (excludes.some((s) => values.includes(s[key] as unknown as string))) return false;
  if (includes.length === 0) return true;
  return includes.some((s) => values.includes(s[key] as unknown as string));
}

function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

interface LineCalcResult {
  discountPercentage: number;
  discountAmount: number;
  appliedQuantity: number;
  overridesUnitPrice?: boolean;
  newUnitPrice?: number;
}

function computeLineDiscount(
  promo: EffectivePromotion,
  line: EngineCartLine,
): LineCalcResult | null {
  const gross = line.unitPrice * line.quantity;
  if (gross <= 0) return null;

  switch (promo.type) {
    case PromotionType.PERCENT_ON_LINE: {
      const pct = clamp(promo.value, 0, 100);
      const amount = (gross * pct) / 100;
      return {
        discountPercentage: pct,
        discountAmount: amount,
        appliedQuantity: line.quantity,
      };
    }
    case PromotionType.AMOUNT_ON_LINE: {
      const amount = Math.min(promo.value, gross);
      const pct = gross > 0 ? (amount / gross) * 100 : 0;
      return {
        discountPercentage: pct,
        discountAmount: amount,
        appliedQuantity: line.quantity,
      };
    }
    case PromotionType.PRICE_OVERRIDE: {
      const newUnit = clamp(promo.value, 0, line.unitPrice);
      if (newUnit >= line.unitPrice) return null;
      const amount = (line.unitPrice - newUnit) * line.quantity;
      const pct = (1 - newUnit / line.unitPrice) * 100;
      return {
        discountPercentage: pct,
        discountAmount: amount,
        appliedQuantity: line.quantity,
        overridesUnitPrice: true,
        newUnitPrice: newUnit,
      };
    }
    case PromotionType.BUY_X_GET_Y: {
      const buyQty = promo.buyQuantity ?? 0;
      const getQty = promo.getQuantity ?? 0;
      const getPct = clamp(promo.getDiscountPercent ?? 100, 0, 100);
      if (buyQty <= 0 || getQty <= 0) return null;
      const blockSize = buyQty + getQty;
      const blocksApplicable = Math.floor(line.quantity / blockSize);
      if (blocksApplicable <= 0) return null;
      const freeUnits = blocksApplicable * getQty;
      const amount = (line.unitPrice * freeUnits * getPct) / 100;
      const pct = gross > 0 ? (amount / gross) * 100 : 0;
      return {
        discountPercentage: pct,
        discountAmount: amount,
        appliedQuantity: freeUnits,
      };
    }
    default:
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Redondeo monetario a unidades enteras (CLP). Si se quiere soportar
 * monedas con decimales en el futuro, este es el único punto a tocar.
 */
function roundCurrency(value: number): number {
  return Math.round(value);
}

/**
 * Preview: simula el resultado si el cajero aceptara todas las promos
 * AUTO/MANUAL elegibles (CODE_ENTRY solo si ya está en selections).
 * No muta el carrito real — sirve para mostrar candidatos en UI.
 */
export function previewPromotions(args: ApplyPromotionsArgs): EngineResult {
  const forced: ManualSelection[] = [];
  const seen = new Set<string>();

  for (const sel of args.manualSelections) {
    forced.push(sel);
    seen.add(sel.promotionId);
  }

  for (const p of args.promotions) {
    if (seen.has(p.id)) continue;
    if (p.activation === PromotionActivation.CODE_ENTRY) continue;
    forced.push({ promotionId: p.id });
    seen.add(p.id);
  }

  return applyPromotions({ ...args, manualSelections: forced });
}
