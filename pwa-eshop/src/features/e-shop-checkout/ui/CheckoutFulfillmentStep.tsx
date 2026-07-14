"use client";

import { TextField } from "@kai/ui";
import { chilePhoneTextFieldProps } from "@/shared/lib/chile-phone-field";
import type { EShopFulfillmentMethodPublic } from "../types/checkout.types";
import { isDeliveryAdvancedEnabled } from "../lib/checkout-steps";
import {
  CheckoutLocationStep,
  type CheckoutLocationState,
} from "./CheckoutLocationStep";
import { CheckoutScheduleStep } from "./CheckoutScheduleStep";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export type CheckoutFulfillmentStepProps = {
  methods: EShopFulfillmentMethodPublic[];
  methodId: string;
  onMethodIdChange: (id: string) => void;
  selectedMethod: EShopFulfillmentMethodPublic | null;
  location: CheckoutLocationState;
  onLocationChange: (v: CheckoutLocationState) => void;
  deliveryOccurrenceId: string;
  onDeliveryOccurrenceIdChange: (id: string) => void;
  localDeliveryShippingFee: number;
  notes: string;
  phone: string;
  onNotesChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
};

export function CheckoutFulfillmentStep(props: CheckoutFulfillmentStepProps) {
  const deliveryAdvanced = isDeliveryAdvancedEnabled();
  const isLocalDelivery = props.selectedMethod?.type === "LOCAL_DELIVERY";

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Método de entrega</legend>
        {props.methods.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary"
          >
            <input
              type="radio"
              name="fulfillment"
              checked={props.methodId === m.id}
              onChange={() => props.onMethodIdChange(m.id)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium">{m.name}</span>
              {m.type === "LOCAL_DELIVERY" && props.localDeliveryShippingFee > 0 ? (
                <span className="text-muted-foreground"> — {fmt(props.localDeliveryShippingFee)}</span>
              ) : m.price > 0 ? (
                <span className="text-muted-foreground"> — {fmt(m.price)}</span>
              ) : (
                <span className="text-muted-foreground"> — Sin costo estimado</span>
              )}
              {m.instructions ? (
                <span className="block text-muted-foreground">{m.instructions}</span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      {deliveryAdvanced && isLocalDelivery ? (
        <>
          <CheckoutLocationStep value={props.location} onChange={props.onLocationChange} />
          <CheckoutScheduleStep
            zoneId={props.location.zone?.zoneId ?? null}
            occurrenceId={props.deliveryOccurrenceId}
            onOccurrenceIdChange={props.onDeliveryOccurrenceIdChange}
          />
        </>
      ) : props.selectedMethod?.requiresAddress ? (
        <>
          <TextField
            label="Dirección"
            value={props.location.address}
            onChange={(e) => props.onLocationChange({ ...props.location, address: e.target.value })}
            required
          />
          <TextField
            label="Comuna"
            value={props.location.commune}
            onChange={(e) => props.onLocationChange({ ...props.location, commune: e.target.value })}
          />
          <TextField
            label="Región"
            value={props.location.region}
            onChange={(e) => props.onLocationChange({ ...props.location, region: e.target.value })}
          />
        </>
      ) : null}

      {props.selectedMethod?.requiresPhone && !props.phone.trim() ? (
        <TextField
          label="Teléfono"
          value={props.phone}
          onChange={(e) => props.onPhoneChange(e.target.value)}
          required
          helperText="Este método de entrega requiere teléfono de contacto."
          {...chilePhoneTextFieldProps}
        />
      ) : null}

      <TextField
        label="Notas del pedido"
        value={props.notes}
        onChange={(e) => props.onNotesChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}
