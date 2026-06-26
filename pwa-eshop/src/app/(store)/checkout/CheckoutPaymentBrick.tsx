"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/admin-shared";
import { confirmCheckoutPaymentAction } from "@/features/e-shop-checkout/actions/checkout.action";

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          brick: string,
          containerId: string,
          settings: Record<string, unknown>,
        ) => Promise<unknown>;
      };
    };
  }
}

function loadMercadoPagoScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mp-sdk="v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.mpSdk = "v2";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Mercado Pago"));
    document.body.appendChild(script);
  });
}

type Props = {
  publicKey: string;
  intentId: string;
  amount: number;
  payerEmail: string;
  onSuccess: () => void;
  onBack: () => void;
};

export function CheckoutPaymentBrick({
  publicKey,
  intentId,
  amount,
  payerEmail,
  onSuccess,
  onBack,
}: Props) {
  const containerId = useId().replace(/:/g, "");
  const mounted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!publicKey?.trim() || mounted.current) return;
    let cancelled = false;
    mounted.current = true;

    void (async () => {
      try {
        await loadMercadoPagoScript();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey.trim(), { locale: "es-CL" });
        const bricksBuilder = mp.bricks();
        await bricksBuilder.create("cardPayment", containerId, {
          initialization: {
            amount,
            payer: { email: payerEmail.trim() },
          },
          callbacks: {
            onReady: () => {},
            onError: (err: unknown) => {
              const msg =
                err && typeof err === "object" && "message" in err
                  ? String((err as { message: unknown }).message)
                  : "Error en el formulario de pago";
              setError(msg);
            },
            onSubmit: async (formData: { token?: string }) => {
              const token = formData?.token?.trim();
              if (!token) {
                setError("No se pudo tokenizar la tarjeta");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                const result = await confirmCheckoutPaymentAction({
                  intentId,
                  token,
                  payerEmail: payerEmail.trim(),
                });
                if (result.status === "APPROVED" || result.status === "approved") {
                  onSuccess();
                  return;
                }
                setError("El pago no fue aprobado. Intente con otra tarjeta.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error al procesar el pago");
              } finally {
                setBusy(false);
              }
            },
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo iniciar Mercado Pago");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, containerId, amount, payerEmail, intentId, onSuccess]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Total a pagar:{" "}
        <strong>
          {new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0,
          }).format(amount)}
        </strong>
      </p>
      <div id={containerId} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {busy ? <p className="text-sm text-muted-foreground">Procesando pago…</p> : null}
      <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
        Volver
      </Button>
    </div>
  );
}
