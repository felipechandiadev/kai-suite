"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@kai/ui";
import { Check } from "lucide-react";
import { CheckoutPaymentBrick } from "@/app/(store)/checkout/CheckoutPaymentBrick";
import { resumeCheckoutPaymentAction } from "@/features/e-shop-checkout/actions/checkout.action";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { MercadoPagoSandboxTestHints } from "@/features/e-shop-checkout/ui/MercadoPagoSandboxTestHints";

type Props = {
  orderId: string;
};

type ResumedPayment = Awaited<ReturnType<typeof resumeCheckoutPaymentAction>>;

function isAlreadyPaidError(message: string) {
  return /ya fue pagado|pago ya fue aprobado|ya pagad/i.test(message);
}

function PaymentStatusCard(props: {
  tone: "success" | "error" | "neutral";
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const isSuccess = props.tone === "success";
  const circleBg = isSuccess
    ? "color-mix(in srgb, var(--color-success, #16a34a) 18%, var(--color-background))"
    : "color-mix(in srgb, var(--color-neutral) 80%, var(--color-background))";

  return (
    <Card
      className="mx-auto max-w-md text-center"
      content={
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: circleBg }}
            aria-hidden
          >
            {isSuccess ? (
              <Check className="h-7 w-7 text-success" strokeWidth={2.5} />
            ) : (
              <span className="text-2xl text-muted-foreground">○</span>
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground">{props.title}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{props.description}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button type="button" variant="primary" onClick={props.onPrimary}>
              {props.primaryLabel}
            </Button>
            {props.secondaryLabel && props.onSecondary ? (
              <Button type="button" variant="outlined" onClick={props.onSecondary}>
                {props.secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

export function MercadoPagoPaymentStep({ orderId }: Props) {
  const router = useRouter();
  const { startFreshCartAfterOrder } = useEShopCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<ResumedPayment | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await resumeCheckoutPaymentAction(orderId);
        if (cancelled) return;
        if (!result.publicKey?.trim() || !result.preferenceId?.trim()) {
          setError(
            "Mercado Pago no está configurado. Configura las credenciales en el panel de administración.",
          );
          return;
        }
        setPrepared(result);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al preparar el pago");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Preparando pago con Mercado Pago…
      </p>
    );
  }

  if (error && isAlreadyPaidError(error)) {
    return (
      <PaymentStatusCard
        tone="success"
        title="Pago confirmado"
        description="Este pedido ya fue pagado. Podés ver el resumen o seguir comprando en la tienda."
        primaryLabel="Ver confirmación"
        onPrimary={() => {
          void startFreshCartAfterOrder();
          const qs = new URLSearchParams({ orderId, paid: "1" });
          router.push(`/checkout/confirmacion?${qs.toString()}`);
        }}
        secondaryLabel="Ir a la tienda"
        onSecondary={() => router.push("/")}
      />
    );
  }

  if (error) {
    return (
      <PaymentStatusCard
        tone="error"
        title="No se pudo preparar el pago"
        description={error}
        primaryLabel="Volver al checkout"
        onPrimary={() => router.push("/checkout")}
        secondaryLabel="Ver ayuda"
        onSecondary={() =>
          router.push(`/checkout/failure?orderId=${encodeURIComponent(orderId)}`)
        }
      />
    );
  }

  if (!prepared?.publicKey || !prepared.preferenceId) {
    return (
      <PaymentStatusCard
        tone="neutral"
        title="Mercado Pago no configurado"
        description="El pedido quedó pendiente de pago. Configura las credenciales en Configuración → Integraciones."
        primaryLabel="Volver al checkout"
        onPrimary={() => router.push("/checkout")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Pagar pedido</h1>
        <p className="text-sm text-muted-foreground">
          Completa el pago con Mercado Pago para confirmar tu encargo.
        </p>
      </div>
      <MercadoPagoSandboxTestHints environment={prepared.mercadoPagoEnvironment} />
      <CheckoutPaymentBrick
        publicKey={prepared.publicKey}
        preferenceId={prepared.preferenceId}
        intentId={prepared.intentId}
        amount={prepared.payableTotal}
        payerEmail={prepared.payerEmail}
        onBack={() => router.push("/checkout")}
        onSuccess={() => {
          void startFreshCartAfterOrder();
          const qs = new URLSearchParams({
            orderId,
            paid: "1",
          });
          if (prepared.documentNumber) qs.set("doc", prepared.documentNumber);
          if (prepared.payerEmail) qs.set("email", prepared.payerEmail);
          router.push(`/checkout/confirmacion?${qs.toString()}`);
        }}
      />
    </div>
  );
}
