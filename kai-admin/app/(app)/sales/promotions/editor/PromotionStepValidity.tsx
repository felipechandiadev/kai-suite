"use client";

import { useMemo } from "react";
import { Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import {
  PROMOTION_ACTIVATION_LABEL,
  type PromotionActivation,
} from "@/features/promotions/types/promotion.types";
import { DAYS_OF_WEEK } from "./promotion-editor-constants";

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
  toggleDayOfWeek: (d: number) => void;
};

export function PromotionStepValidity({ input, patch, toggleDayOfWeek }: Props) {
  const activationOptions = useMemo(
    () =>
      Object.entries(PROMOTION_ACTIVATION_LABEL).map(([id, label]) => ({
        id,
        label,
      })),
    [],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-test-id="promotion-step-validity">
      <Select
        label="Activación"
        options={activationOptions}
        value={input.activation}
        onChange={(v) => patch("activation", v as PromotionActivation)}
        data-test-id="promotion-field-activation"
      />
      {input.activation === "CODE_ENTRY" ? (
        <TextField
          label="Cupón"
          required
          value={input.redemptionCode ?? ""}
          onChange={(e) =>
            patch(
              "redemptionCode",
              (e as React.ChangeEvent<HTMLInputElement>).target.value,
            )
          }
          data-test-id="promotion-field-coupon"
        />
      ) : null}
      <TextField
        label="Válida desde"
        type="date"
        value={input.validFrom ?? ""}
        onChange={(e) =>
          patch(
            "validFrom",
            (e as React.ChangeEvent<HTMLInputElement>).target.value || null,
          )
        }
        data-test-id="promotion-field-valid-from"
      />
      <TextField
        label="Válida hasta"
        type="date"
        value={input.validUntil ?? ""}
        onChange={(e) =>
          patch(
            "validUntil",
            (e as React.ChangeEvent<HTMLInputElement>).target.value || null,
          )
        }
        data-test-id="promotion-field-valid-until"
      />
      <TextField
        label="Hora desde (HH:MM)"
        value={input.hourFrom ?? ""}
        onChange={(e) =>
          patch(
            "hourFrom",
            (e as React.ChangeEvent<HTMLInputElement>).target.value || null,
          )
        }
        data-test-id="promotion-field-hour-from"
      />
      <TextField
        label="Hora hasta (HH:MM)"
        value={input.hourTo ?? ""}
        onChange={(e) =>
          patch("hourTo", (e as React.ChangeEvent<HTMLInputElement>).target.value || null)
        }
        data-test-id="promotion-field-hour-to"
      />
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-foreground">Días de la semana</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => {
            const active =
              input.daysOfWeek == null || input.daysOfWeek.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDayOfWeek(d.value)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
                data-test-id={`promotion-day-${d.value}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Si todos están seleccionados aplica todos los días.
        </p>
      </div>
    </div>
  );
}
