"use client";

import { useMemo } from "react";
import { Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import {
  PROMOTION_AUTHORIZATION_LABEL,
  type PromotionAuthorization,
} from "@/features/promotions/types/promotion.types";

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
};

export function PromotionStepLimits({ input, patch }: Props) {
  const authorizationOptions = useMemo(
    () =>
      Object.entries(PROMOTION_AUTHORIZATION_LABEL).map(([id, label]) => ({
        id,
        label,
      })),
    [],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-test-id="promotion-step-limits">
      <TextField
        label="Usos totales máximos"
        type="number"
        value={input.maxUsesTotal == null ? "" : String(input.maxUsesTotal)}
        onChange={(e) => {
          const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
          patch("maxUsesTotal", raw === "" ? null : Number(raw));
        }}
        data-test-id="promotion-field-max-uses-total"
      />
      <TextField
        label="Usos por cliente"
        type="number"
        value={input.maxUsesPerCustomer == null ? "" : String(input.maxUsesPerCustomer)}
        onChange={(e) => {
          const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
          patch("maxUsesPerCustomer", raw === "" ? null : Number(raw));
        }}
        data-test-id="promotion-field-max-uses-customer"
      />
      <Select
        label="Autorización requerida"
        options={authorizationOptions}
        value={input.authorization ?? "NONE"}
        onChange={(v) => patch("authorization", v as PromotionAuthorization)}
        data-test-id="promotion-field-authorization"
      />
      {input.authorization === "CASHIER" ? (
        <TextField
          label="Límite máximo permitido al cajero (%)"
          type="number"
          value={
            input.authorizationLimitPct == null ? "" : String(input.authorizationLimitPct)
          }
          onChange={(e) => {
            const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
            patch("authorizationLimitPct", raw === "" ? null : Number(raw));
          }}
          data-test-id="promotion-field-auth-limit-pct"
        />
      ) : null}
      <div className="sm:col-span-2">
        <Switch
          label="Sugerir automáticamente en pantalla de pago"
          labelPosition="right"
          checked={input.preloadOnPaymentScreen ?? false}
          onChange={(v) => patch("preloadOnPaymentScreen", v)}
          data-test-id="promotion-preload"
        />
      </div>
    </div>
  );
}
