"use client";

import { TextField } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
};

export function PromotionStepAccounting({ input, patch }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-test-id="promotion-step-accounting">
      <div>
        <TextField
          label="Etiqueta contable"
          value={input.accountingTag ?? ""}
          onChange={(e) =>
            patch(
              "accountingTag",
              (e as React.ChangeEvent<HTMLInputElement>).target.value || null,
            )
          }
          data-test-id="promotion-field-accounting-tag"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Referencia a regla contable con AmountMode=DISCOUNT
        </p>
      </div>
      <TextField
        label="Orden de visualización"
        type="number"
        value={String(input.displayOrder ?? 0)}
        onChange={(e) =>
          patch(
            "displayOrder",
            Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || 0,
          )
        }
        data-test-id="promotion-field-display-order"
      />
    </div>
  );
}
