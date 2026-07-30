"use client";

import { MercadoPagoLogo } from "@/shared/components/MercadoPagoLogo";
import type { EShopFulfillmentMethodPublic } from "../types/checkout.types";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export type CheckoutReviewStepProps = {
  name: string;
  email: string;
  phone: string;
  showAccountChoice: boolean;
  wantsAccount: boolean;
  selectedMethod: EShopFulfillmentMethodPublic | null;
  subtotal: number;
  shippingCost: number;
  estimatedTotal: number;
  onlinePaymentEnabled: boolean;
  paymentMode: "online" | "coordinate";
  onPaymentModeChange: (mode: "online" | "coordinate") => void;
};

export function CheckoutReviewStep(props: CheckoutReviewStepProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <p>
        <strong>Contacto:</strong> {props.name} · {props.email}
        {props.phone ? ` · ${props.phone}` : ""}
      </p>
      {props.showAccountChoice && props.wantsAccount ? (
        <p className="text-muted-foreground">Se creará tu cuenta al confirmar el pedido.</p>
      ) : null}
      <p>
        <strong>Entrega:</strong> {props.selectedMethod?.name ?? "—"}
      </p>
      <p>
        <strong>Subtotal:</strong> {fmt(props.subtotal)}
      </p>
      {props.shippingCost > 0 ? (
        <p>
          <strong>Envío estimado:</strong> {fmt(props.shippingCost)}
        </p>
      ) : null}
      <p className="text-base font-semibold">Total estimado: {fmt(props.estimatedTotal)}</p>
      {props.onlinePaymentEnabled ? (
        <fieldset className="space-y-2 border-0 p-0">
          <legend className="text-sm font-medium">Forma de pago</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="paymentMode"
              checked={props.paymentMode === "online"}
              onChange={() => props.onPaymentModeChange("online")}
            />
            <span className="flex flex-wrap items-center gap-2">
              Pagar ahora con
              <MercadoPagoLogo width={130} />
              <span className="text-muted-foreground">(cuenta MP o tarjeta)</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="paymentMode"
              checked={props.paymentMode === "coordinate"}
              onChange={() => props.onPaymentModeChange("coordinate")}
            />
            Coordinar pago después (encargo)
          </label>
        </fieldset>
      ) : (
        <p className="text-muted-foreground">
          Registraremos tu pedido como encargo y te contactaremos para coordinar el pago.
        </p>
      )}
    </div>
  );
}
