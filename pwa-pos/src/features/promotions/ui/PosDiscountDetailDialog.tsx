"use client";

import { useMemo } from "react";
import { Badge, Button, Dialog } from "@kai/ui";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type {
  AppliedSnapshot,
  EffectivePromotion,
  EngineWarning,
} from "@/features/promotions/lib/discount-engine.types";
import { PromotionType } from "@/features/promotions/lib/promotion.enums";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatPercent(n: number): string {
  const value = Number(n) || 0;
  return `${value % 1 === 0 ? value.toFixed(0) : String(value)}%`;
}

function lineLabel(line: PosCartLine): string {
  const name = String(line.productName ?? "").trim() || "Producto";
  const attrs = (line.attributes ?? [])
    .map((a) => String(a.attributeValue ?? "").trim())
    .filter(Boolean);
  if (!attrs.length) return name;
  return [name, ...attrs].filter(Boolean).join(" / ");
}

/** Explica en lenguaje natural qué hace la promoción según su tipo. */
function promotionRuleText(promo: EffectivePromotion): string {
  switch (promo.type) {
    case PromotionType.PERCENT_ON_LINE:
      return `${formatPercent(promo.value)} de descuento sobre cada producto elegible.`;
    case PromotionType.AMOUNT_ON_LINE:
      return `${formatMoney(promo.value)} de descuento por producto elegible.`;
    case PromotionType.PERCENT_ON_ORDER:
      return `${formatPercent(promo.value)} de descuento sobre el subtotal de la venta.`;
    case PromotionType.AMOUNT_ON_ORDER:
      return `${formatMoney(promo.value)} de descuento sobre el total de la venta.`;
    case PromotionType.PRICE_OVERRIDE:
      return `Precio fijo de ${formatMoney(promo.value)} por unidad.`;
    case PromotionType.BUY_X_GET_Y:
      return `Lleva ${promo.buyQuantity ?? 0} y obtén ${promo.getQuantity ?? 0} con ${formatPercent(
        promo.getDiscountPercent ?? 100,
      )} de descuento.`;
    default:
      return "";
  }
}

/** Nota sobre el tope de descuento y si se alcanzó. */
function promotionCapNote(
  promo: EffectivePromotion,
  amountDiscounted: number,
): { text: string; reached: boolean } | null {
  if (promo.maxValue == null) return null;
  const reached = Math.round(amountDiscounted) >= Math.round(promo.maxValue);
  return {
    reached,
    text: reached
      ? `Tope de descuento alcanzado (${formatMoney(promo.maxValue)}).`
      : `Tope máximo de descuento: ${formatMoney(promo.maxValue)}.`,
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  appliedPromotions: AppliedSnapshot[];
  lines: PosCartLine[];
  totalDiscount: number;
  promotions?: EffectivePromotion[];
  warnings?: EngineWarning[];
};

export function PosDiscountDetailDialog({
  open,
  onClose,
  appliedPromotions,
  lines,
  totalDiscount,
  promotions = [],
  warnings = [],
}: Props) {
  const lineByVariantId = useMemo(
    () => new Map(lines.map((l) => [l.variantId, l])),
    [lines],
  );
  const promoById = useMemo(
    () => new Map(promotions.map((p) => [p.id, p])),
    [promotions],
  );
  const warningsByPromoId = useMemo(() => {
    const map = new Map<string, EngineWarning[]>();
    for (const w of warnings) {
      const list = map.get(w.promotionId) ?? [];
      list.push(w);
      map.set(w.promotionId, list);
    }
    return map;
  }, [warnings]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle de descuentos"
      size="sm"
      actions={
        <Button type="button" variant="primary" onClick={onClose}>
          Cerrar
        </Button>
      }
      actionsJustify="end"
      data-test-id="pos-discount-detail-dialog"
    >
      {appliedPromotions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay descuentos aplicados.</p>
      ) : (
        <div className="grid gap-3">
          {appliedPromotions.map((promo) => {
            const affectedLines = promo.affectedLineIds
              .map((id) => lineByVariantId.get(id))
              .filter((l): l is PosCartLine => l != null);
            const def = promoById.get(promo.promotionId);
            const ruleText = def ? promotionRuleText(def) : "";
            const capNote = def ? promotionCapNote(def, promo.amountDiscounted) : null;
            const promoWarnings = warningsByPromoId.get(promo.promotionId) ?? [];

            return (
              <div
                key={promo.promotionId}
                className="rounded-lg border border-border bg-neutral/40 px-3 py-2"
                data-test-id={`pos-discount-detail-promo-${promo.promotionCode}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{promo.promotionName}</span>
                      <Badge variant={promo.isOrderLevel ? "secondary" : "success"}>
                        {promo.isOrderLevel ? "Orden" : "Línea"}
                      </Badge>
                    </div>
                    {promo.promotionCode ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{promo.promotionCode}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    -{formatMoney(promo.amountDiscounted)}
                  </span>
                </div>

                {ruleText ? (
                  <p className="mt-2 text-xs text-muted-foreground">{ruleText}</p>
                ) : null}

                {capNote ? (
                  <p
                    className={`mt-1 text-xs ${
                      capNote.reached
                        ? "font-medium text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                    data-test-id={`pos-discount-detail-cap-${promo.promotionCode}`}
                  >
                    {capNote.text}
                  </p>
                ) : null}

                {promoWarnings.map((w) => (
                  <p
                    key={w.code}
                    className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    {w.message}
                  </p>
                ))}

                {!promo.isOrderLevel && affectedLines.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    {affectedLines.map((line) => (
                      <li key={line.variantId} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">{lineLabel(line)}</span>
                        <span className="shrink-0 tabular-nums">×{line.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total descuentos</span>
            <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
              -{formatMoney(totalDiscount)}
            </span>
          </div>
        </div>
      )}
    </Dialog>
  );
}
