"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import {
  createFulfillmentMethodAction,
  deleteFulfillmentMethodAction,
  updateFulfillmentMethodAction,
} from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import type {
  EShopFulfillmentMethodRow,
  EShopFulfillmentMethodType,
} from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import { METHOD_TYPE_LABELS } from "@/features/e-shop-fulfillment/lib/eshop-fulfillment-labels";

export function FulfillmentMethodsPanel({
  initialMethods,
}: {
  initialMethods: EShopFulfillmentMethodRow[];
}) {
  const router = useRouter();
  const [methods, setMethods] = useState(initialMethods);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<EShopFulfillmentMethodType>("PICKUP");
  const [priceFlat, setPriceFlat] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          createFulfillmentMethodAction({
            code,
            name,
            type,
            priceFlat: priceFlat ? Number(priceFlat) : null,
            isActive: true,
          })
            .then((r) => {
              if (r.success) {
                setCode("");
                setName("");
                setPriceFlat("");
                router.refresh();
              }
            })
            .finally(() => setBusy(false));
        }}
      >
        <h2 className="font-semibold">Nuevo método de entrega</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="text-sm space-y-1">
            <span className="font-medium">Tipo</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as EShopFulfillmentMethodType)}
            >
              {Object.entries(METHOD_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Tarifa fija (CLP)"
            value={priceFlat}
            onChange={(e) => setPriceFlat(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          Crear método
        </Button>
      </form>

      <ul className="space-y-3">
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay métodos configurados.</p>
        ) : (
          methods.map((m) => (
            <li key={m.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.code} · {METHOD_TYPE_LABELS[m.type]}
                    {m.priceFlat != null ? ` · $${Number(m.priceFlat).toLocaleString("es-CL")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      updateFulfillmentMethodAction(m.id, { isActive: !m.isActive }).then(() =>
                        router.refresh(),
                      );
                    }}
                  >
                    {m.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm("¿Eliminar método?")) return;
                      deleteFulfillmentMethodAction(m.id).then(() => router.refresh());
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
              {m.instructions ? (
                <p className="text-sm text-muted-foreground">{m.instructions}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
