"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Switch } from "@kai/ui";
import { setCanonicalFulfillmentMethodEnabledAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import type {
  CanonicalFulfillmentCode,
  CanonicalFulfillmentMethodRow,
  LocalDeliveryOperationalReadiness,
} from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";

type Props = {
  initialMethods: CanonicalFulfillmentMethodRow[];
  initialReadiness: LocalDeliveryOperationalReadiness;
};

const METHOD_COPY: Record<
  CanonicalFulfillmentCode,
  { title: string; body: string; configHint: ReactNode }
> = {
  pickup: {
    title: "Retiro en tienda",
    body: "El cliente retira el pedido en la sucursal operativa de la tienda web.",
    configHint: (
      <>
        Usa la sucursal y almacén definidos en{" "}
        <Link
          href="/e-shop/fulfillment/configuracion"
          className="text-primary underline-offset-2 hover:underline"
        >
          Configuración
        </Link>
        .
      </>
    ),
  },
  "local-delivery": {
    title: "Reparto local",
    body: "Entrega programada en la Región del Maule con zona, franja y ubicación.",
    configHint: (
      <>
        Requiere{" "}
        <Link href="/e-shop/fulfillment/cobertura" className="text-primary underline-offset-2 hover:underline">
          Cobertura
        </Link>
        ,{" "}
        <Link href="/e-shop/fulfillment/zonas" className="text-primary underline-offset-2 hover:underline">
          Zonas
        </Link>
        ,{" "}
        <Link href="/e-shop/fulfillment/calendario" className="text-primary underline-offset-2 hover:underline">
          Calendario
        </Link>{" "}
        y{" "}
        <Link href="/e-shop/fulfillment/reparto" className="text-primary underline-offset-2 hover:underline">
          Reparto
        </Link>
        .
      </>
    ),
  },
};

function ReadinessChecklist({ readiness }: { readiness: LocalDeliveryOperationalReadiness }) {
  const items = [
    { ok: readiness.localDeliveryEnabled, label: "Método habilitado para checkout" },
    { ok: readiness.depotConfigured, label: "Bodega y coordenadas configuradas" },
    { ok: readiness.communesEnabled, label: "Al menos una comuna habilitada" },
    { ok: readiness.zonesActive, label: "Al menos una zona activa" },
    { ok: readiness.occurrencesAvailable, label: "Franjas de reparto disponibles" },
  ];

  return (
    <ul className="mt-3 space-y-1.5 text-sm" data-test-id="local-delivery-readiness">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            className={
              item.ok
                ? "inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                : "inline-block h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
            }
            aria-hidden
          />
          <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function FulfillmentMethodsPanel({ initialMethods, initialReadiness }: Props) {
  const router = useRouter();
  const [methods, setMethods] = useState(initialMethods);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [pendingCode, setPendingCode] = useState<CanonicalFulfillmentCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ordered = useMemo(
    () =>
      (["pickup", "local-delivery"] as const)
        .map((code) => methods.find((m) => m.code === code))
        .filter((m): m is CanonicalFulfillmentMethodRow => Boolean(m)),
    [methods],
  );

  function toggle(code: CanonicalFulfillmentCode, enabled: boolean) {
    setError(null);
    setPendingCode(code);
    setMethods((prev) => prev.map((m) => (m.code === code ? { ...m, isActive: enabled } : m)));
    if (code === "local-delivery") {
      setReadiness((r) => ({ ...r, localDeliveryEnabled: enabled }));
    }

    startTransition(() => {
      void setCanonicalFulfillmentMethodEnabledAction(code, enabled).then((res) => {
        setPendingCode(null);
        if (!res.success) {
          setError(res.error);
          setMethods(initialMethods);
          setReadiness(initialReadiness);
          return;
        }
        setMethods((prev) => prev.map((m) => (m.code === code ? { ...m, ...res.method } : m)));
        router.refresh();
      });
    });
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4"
      data-test-id="fulfillment-methods-canonical-panel"
    >
      <p className="text-sm text-muted-foreground">
        Elige qué opciones de entrega verá el cliente en el checkout. La configuración avanzada
        (sucursal, cobertura, zonas y franjas) vive en las otras pestañas.
      </p>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {ordered.map((method) => {
        const copy = METHOD_COPY[method.code];
        const busy = isPending && pendingCode === method.code;
        return (
          <section
            key={method.code}
            className="space-y-3 rounded-xl border border-border p-4"
            data-test-id={`fulfillment-method-card-${method.code}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h2 className="font-semibold">{copy.title}</h2>
                <p className="text-sm text-muted-foreground">{copy.body}</p>
                <p className="text-sm text-muted-foreground">{copy.configHint}</p>
              </div>
              <Switch
                checked={method.isActive}
                onChange={(v) => toggle(method.code, v)}
                disabled={busy}
                label="Habilitado en checkout"
                labelPosition="left"
                data-test-id={`fulfillment-method-switch-${method.code}`}
              />
            </div>

            {method.code === "local-delivery" ? (
              <ReadinessChecklist readiness={readiness} />
            ) : null}
          </section>
        );
      })}

      {ordered.length === 0 ? (
        <Alert variant="warning">
          No se pudieron cargar los métodos canónicos. Revisa la conexión con el backend.
        </Alert>
      ) : null}
    </div>
  );
}
