"use client";

import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import {
  PROMOTION_TYPE_DESCRIPTION,
  PROMOTION_TYPE_LABEL,
  type PromotionType,
} from "@/features/promotions/types/promotion.types";

const TYPES: PromotionType[] = [
  "PERCENT_ON_LINE",
  "AMOUNT_ON_LINE",
  "PERCENT_ON_ORDER",
  "AMOUNT_ON_ORDER",
  "PRICE_OVERRIDE",
  "BUY_X_GET_Y",
];

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
  promotionId: string | null;
};

export function PromotionStepType({ input, patch, promotionId }: Props) {
  const locked = Boolean(promotionId);

  if (locked) {
    return (
      <div
        className="rounded-xl border border-border bg-muted/20 p-4"
        data-test-id="promotion-step-type-readonly"
      >
        <p className="text-sm font-semibold text-foreground">
          {PROMOTION_TYPE_LABEL[input.type]}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {PROMOTION_TYPE_DESCRIPTION[input.type]}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          El tipo no se puede cambiar al editar una promoción existente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-test-id="promotion-step-type-grid">
      {TYPES.map((t) => {
        const selected = input.type === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => patch("type", t)}
            className={[
              "rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
            ].join(" ")}
            data-test-id={`promotion-step-type-option-${t}`}
          >
            <span className="block text-sm font-semibold text-foreground">
              {PROMOTION_TYPE_LABEL[t]}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {PROMOTION_TYPE_DESCRIPTION[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
