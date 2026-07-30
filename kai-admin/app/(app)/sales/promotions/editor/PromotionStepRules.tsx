"use client";

import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";
import { PROMOTION_TYPE_LABEL } from "@/features/promotions/types/promotion.types";
import {
  digitsFromClp,
  parseClpDigitsFromValue,
  parseClpDigitsNullableFromValue,
} from "./promotion-editor-currency";

type Props = {
  input: CreatePromotionInput;
  patch: <K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) => void;
};

/** Valor principal en pesos (línea, pedido o precio fijo), no porcentaje. */
function isMoneyPromotionValueType(type: CreatePromotionInput["type"]): boolean {
  return (
    type === "AMOUNT_ON_LINE" ||
    type === "AMOUNT_ON_ORDER" ||
    type === "PRICE_OVERRIDE"
  );
}

export function PromotionStepRules({ input, patch }: Props) {
  const isPercent =
    input.type === "PERCENT_ON_LINE" || input.type === "PERCENT_ON_ORDER";
  const valueIsMoney = isMoneyPromotionValueType(input.type);

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-test-id="promotion-step-rules">
      <p className="sm:col-span-2 text-xs text-muted-foreground">
        Tipo seleccionado:{" "}
        <span className="font-medium text-foreground">
          {PROMOTION_TYPE_LABEL[input.type]}
        </span>
      </p>
      <TextField
        label="Nombre"
        required
        value={input.name}
        onChange={(e) =>
          patch("name", (e as React.ChangeEvent<HTMLInputElement>).target.value)
        }
        data-test-id="promotion-field-name"
      />
      <TextField
        label={isPercent ? "Valor (%)" : valueIsMoney ? "Valor (CLP)" : "Valor"}
        type={valueIsMoney ? "currency" : "number"}
        value={valueIsMoney ? digitsFromClp(input.value) : String(input.value)}
        onChange={(e) =>
          patch(
            "value",
            valueIsMoney
              ? parseClpDigitsFromValue(e.target.value)
              : Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || 0,
          )
        }
        {...(valueIsMoney ? { currencySymbol: "$" as const } : {})}
        data-test-id="promotion-field-value"
      />
      <div>
        <TextField
          label="Tope máximo (opcional)"
          type="currency"
          value={digitsFromClp(input.maxValue)}
          onChange={(e) =>
            patch("maxValue", parseClpDigitsNullableFromValue(e.target.value))
          }
          currencySymbol="$"
          data-test-id="promotion-field-max-value"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Máximo monto a descontar por aplicación
        </p>
      </div>
      <div>
        <TextField
          label="Prioridad"
          type="number"
          value={String(input.priority ?? 0)}
          onChange={(e) =>
            patch(
              "priority",
              Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || 0,
            )
          }
          data-test-id="promotion-field-priority"
        />
        <p className="mt-1 text-xs text-muted-foreground">Mayor número = evaluada primero</p>
      </div>
      <Switch
        label="Combinable con otras promociones"
        labelPosition="right"
        checked={input.stackable ?? true}
        onChange={(v) => patch("stackable", v)}
        data-test-id="promotion-stackable"
      />
      <Switch
        label="Activa"
        labelPosition="right"
        checked={input.isActive ?? true}
        onChange={(v) => patch("isActive", v)}
        data-test-id="promotion-active"
      />
      <TextField
        className="sm:col-span-2"
        label="Descripción (opcional)"
        value={input.description ?? ""}
        onChange={(e) =>
          patch(
            "description",
            (e as React.ChangeEvent<HTMLInputElement>).target.value,
          )
        }
        data-test-id="promotion-field-description"
      />

      {input.type === "BUY_X_GET_Y" ? (
        <>
          <TextField
            label="Cantidad a comprar"
            type="number"
            value={input.buyQuantity == null ? "" : String(input.buyQuantity)}
            onChange={(e) =>
              patch(
                "buyQuantity",
                Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || null,
              )
            }
            data-test-id="promotion-field-buy-qty"
          />
          <TextField
            label="Cantidad de regalo"
            type="number"
            value={input.getQuantity == null ? "" : String(input.getQuantity)}
            onChange={(e) =>
              patch(
                "getQuantity",
                Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || null,
              )
            }
            data-test-id="promotion-field-get-qty"
          />
          <TextField
            className="sm:col-span-2"
            label="% descuento sobre regalo (100 = gratis)"
            type="number"
            value={String(input.getDiscountPercent ?? 100)}
            onChange={(e) =>
              patch(
                "getDiscountPercent",
                Number((e as React.ChangeEvent<HTMLInputElement>).target.value) || 100,
              )
            }
            data-test-id="promotion-field-get-discount-pct"
          />
        </>
      ) : null}
    </div>
  );
}
