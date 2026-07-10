"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@kai/ui";
import {
  confirmCheckoutPaymentAction,
  fetchCheckoutPaymentStatusAction,
} from "@/features/e-shop-checkout/actions/checkout.action";
import { MercadoPagoLogo } from "@/shared/components/MercadoPagoLogo";

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
        ) => Promise<{ unmount?: () => void }>;
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
      existing.addEventListener("error", () =>
        reject(new Error("No se pudo cargar Mercado Pago")),
      );
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

type MpCardFormData = {
  token?: string;
  payment_method_id?: string;
  installments?: number;
  payer?: { email?: string };
};

type MpPaymentSubmitPayload = {
  selectedPaymentMethod?: string;
  formData?: MpCardFormData | null;
};

type MpCardAdditionalData = {
  paymentTypeId?: string;
};

type Props = {
  publicKey: string;
  preferenceId: string;
  intentId: string;
  amount: number;
  payerEmail: string;
  onSuccess: () => void;
  onBack: () => void;
};

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApprovedStatus(status: string) {
  return status === "APPROVED" || status.toLowerCase() === "approved";
}

function isRejectedStatus(status: string) {
  return ["REJECTED", "CANCELLED", "EXPIRED"].includes(status);
}

export function CheckoutPaymentBrick({
  publicKey,
  preferenceId,
  intentId,
  amount,
  payerEmail,
  onSuccess,
  onBack,
}: Props) {
  const containerId = useId().replace(/:/g, "");
  const brickController = useRef<{ unmount?: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const pollUntilSettled = useCallback(async (): Promise<boolean> => {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const result = await fetchCheckoutPaymentStatusAction(intentId);
        if (isApprovedStatus(result.status)) return true;
        if (isRejectedStatus(result.status)) return false;
      } catch {
        // seguir intentando
      }
    }
    return false;
  }, [intentId]);

  const onSuccessRef = useRef(onSuccess);
  const pollRef = useRef(pollUntilSettled);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    pollRef.current = pollUntilSettled;
  }, [onSuccess, pollUntilSettled]);

  useEffect(() => {
    if (!publicKey?.trim() || !preferenceId?.trim()) return;

    let cancelled = false;

    const runWalletFlow = async () => {
      setBusy(true);
      setError(null);
      try {
        const result = await confirmCheckoutPaymentAction({
          intentId,
          payerEmail,
          selectedPaymentMethod: "wallet_purchase",
        });
        if (isApprovedStatus(result.status)) {
          onSuccessRef.current();
          return;
        }
        const approved = await pollRef.current();
        if (approved) {
          onSuccessRef.current();
          return;
        }
        setError(
          "El pago con Mercado Pago no se completó. Intente de nuevo o use tarjeta.",
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar el pago");
      } finally {
        setBusy(false);
      }
    };

    void (async () => {
      setLoading(true);
      setReady(false);
      setError(null);
      try {
        brickController.current?.unmount?.();
        brickController.current = null;

        await loadMercadoPagoScript();
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey.trim(), { locale: "es-CL" });
        const bricksBuilder = mp.bricks();
        const controller = await bricksBuilder.create("payment", containerId, {
          initialization: {
            amount,
            preferenceId: preferenceId.trim(),
            payer: { email: payerEmail.trim() },
          },
          customization: {
            paymentMethods: {
              mercadoPago: "all",
              creditCard: "all",
              debitCard: "all",
              maxInstallments: 12,
            },
            visual: {
              defaultPaymentOption: {
                walletForm: true,
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) {
                setReady(true);
                setLoading(false);
              }
            },
            onError: (err: unknown) => {
              const msg =
                err && typeof err === "object" && "message" in err
                  ? String((err as { message: unknown }).message)
                  : "Error en el formulario de pago";
              setError(msg);
              setLoading(false);
            },
            onSubmit: async (
              paymentData: MpPaymentSubmitPayload,
              additionalData?: MpCardAdditionalData,
            ) => {
              const selected = (paymentData?.selectedPaymentMethod ?? "").toLowerCase();
              if (selected === "wallet_purchase" || selected === "mercadopago") {
                await runWalletFlow();
                return;
              }

              const formData = paymentData?.formData;
              const token = formData?.token?.trim();
              const paymentMethodId = formData?.payment_method_id?.trim();
              if (!token) {
                setError("No se pudo tokenizar la tarjeta");
                return;
              }
              if (!paymentMethodId) {
                setError("No se pudo identificar la tarjeta");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                const result = await confirmCheckoutPaymentAction({
                  intentId,
                  token,
                  payerEmail: (formData?.payer?.email ?? payerEmail).trim(),
                  paymentMethodId,
                  paymentMethodType: additionalData?.paymentTypeId ?? selected,
                  selectedPaymentMethod: selected || undefined,
                  installments: formData?.installments ?? 1,
                });
                if (result.awaitingWallet) {
                  const approved = await pollRef.current();
                  if (approved) {
                    onSuccessRef.current();
                    return;
                  }
                  setError("El pago no fue aprobado. Intente con otra tarjeta.");
                  return;
                }
                if (isApprovedStatus(result.status)) {
                  onSuccessRef.current();
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

        if (!cancelled) {
          brickController.current = controller;
        } else {
          controller?.unmount?.();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo iniciar Mercado Pago");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      brickController.current?.unmount?.();
      brickController.current = null;
    };
  }, [publicKey, preferenceId, containerId, amount, payerEmail, intentId]);

  useEffect(() => {
    const onFocus = () => {
      if (busy) return;
      void (async () => {
        try {
          const result = await fetchCheckoutPaymentStatusAction(intentId);
          if (isApprovedStatus(result.status)) onSuccess();
        } catch {
          // ignorar
        }
      })();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [busy, intentId, onSuccess]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <MercadoPagoLogo width={160} />
      </div>
      <p className="text-sm text-muted-foreground">
        Paga con tu cuenta Mercado Pago (QR o saldo) o con tarjeta de crédito/débito.
      </p>
      <div
        id={containerId}
        className="min-h-[280px] w-full"
        aria-busy={loading || busy}
      />
      {loading && !ready ? (
        <p className="text-sm text-muted-foreground">Cargando medios de pago…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {busy ? <p className="text-sm text-muted-foreground">Procesando pago…</p> : null}
      <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
        Volver
      </Button>
    </div>
  );
}
