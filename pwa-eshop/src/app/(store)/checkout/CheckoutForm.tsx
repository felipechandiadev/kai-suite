"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import {
  fetchFulfillmentMethodsAction,
  getCheckoutProfilePrefillAction,
  submitCheckoutAction,
} from "@/features/e-shop-checkout/actions/checkout.action";
import type { EShopFulfillmentMethodPublic } from "@/features/e-shop-checkout/types/checkout.types";

type Step = "contact" | "delivery" | "review";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal, clearCart } = useEShopCart();
  const [step, setStep] = useState<Step>("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [methods, setMethods] = useState<EShopFulfillmentMethodPublic[]>([]);
  const [methodId, setMethodId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === methodId) ?? null,
    [methods, methodId],
  );
  const shippingCost = selectedMethod?.price ?? 0;
  const estimatedTotal = subtotal + shippingCost;

  useEffect(() => {
    void getCheckoutProfilePrefillAction().then((prefill) => {
      if (!prefill) return;
      if (!name) setName(prefill.name);
      if (!email) setEmail(prefill.email);
      if (!phone) setPhone(prefill.phone);
      if (!address) setAddress(prefill.address);
    });
  }, []);

  useEffect(() => {
    if (step !== "delivery" && step !== "review") return;
    void fetchFulfillmentMethodsAction(subtotal)
      .then((rows) => {
        setMethods(rows);
        if (!methodId && rows[0]) setMethodId(rows[0].id);
      })
      .catch(() => setError("No se pudieron cargar los métodos de entrega"));
  }, [step, subtotal, methodId]);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const result = await submitCheckoutAction({
        customerName: name,
        customerEmail: email,
        customerPhone: phone || undefined,
        fulfillmentMethodId: methodId,
        address: address || undefined,
        shippingAddress: address
          ? { line1: address, commune: commune || undefined, region: region || undefined }
          : undefined,
        lines: lines.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
        })),
        notes: notes || undefined,
      });
      const qs = new URLSearchParams({
        doc: result.documentNumber,
        method: selectedMethod?.name ?? "",
      });
      if (result.transactionId) qs.set("orderId", result.transactionId);
      if (result.hasStockShortage) qs.set("encargo", "1");
      router.push(`/checkout/confirmacion?${qs.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al confirmar pedido";
      if (/Variante no válida/i.test(message)) {
        setError(
          "Uno o más productos del carrito ya no están disponibles (catálogo actualizado). Vacía el carrito, agrega los productos de nuevo e intenta otra vez.",
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    setError(null);
    if (step === "contact") {
      if (!name.trim() || !email.trim()) {
        setError("Nombre y correo son obligatorios");
        return;
      }
      setStep("delivery");
      return;
    }
    if (step === "delivery") {
      if (!methodId) {
        setError("Seleccione un método de entrega");
        return;
      }
      if (selectedMethod?.requiresPhone && !phone.trim()) {
        setError("El teléfono es obligatorio para este método");
        return;
      }
      if (selectedMethod?.requiresAddress && !address.trim()) {
        setError("La dirección es obligatoria para este método");
        return;
      }
      setStep("review");
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex gap-2 text-xs text-muted-foreground">
        {(["contact", "delivery", "review"] as const).map((s, i) => (
          <li key={s} className={step === s ? "font-semibold text-foreground" : ""}>
            {i + 1}. {s === "contact" ? "Contacto" : s === "delivery" ? "Entrega" : "Resumen"}
          </li>
        ))}
      </ol>

      {step === "contact" ? (
        <div className="space-y-4">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      ) : null}

      {step === "delivery" ? (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Método de entrega</legend>
            {methods.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="fulfillment"
                  checked={methodId === m.id}
                  onChange={() => setMethodId(m.id)}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="font-medium">{m.name}</span>
                  {m.price > 0 ? (
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
          {selectedMethod?.requiresAddress ? (
            <>
              <TextField label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} required />
              <TextField label="Comuna" value={commune} onChange={(e) => setCommune(e.target.value)} />
              <TextField label="Región" value={region} onChange={(e) => setRegion(e.target.value)} />
            </>
          ) : null}
          <TextField label="Notas del pedido" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
          <p>
            <strong>Contacto:</strong> {name} · {email}
            {phone ? ` · ${phone}` : ""}
          </p>
          <p>
            <strong>Entrega:</strong> {selectedMethod?.name ?? "—"}
          </p>
          <p>
            <strong>Subtotal:</strong> {fmt(subtotal)}
          </p>
          {shippingCost > 0 ? (
            <p>
              <strong>Envío estimado:</strong> {fmt(shippingCost)}
            </p>
          ) : null}
          <p className="text-base font-semibold">Total estimado: {fmt(estimatedTotal)}</p>
          <p className="text-muted-foreground">
            Sin pago en línea. Registraremos tu pedido como encargo y te contactaremos para coordinar.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {/carrito ya no están disponibles/i.test(error) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearCart();
                router.push("/productos");
              }}
            >
              Vaciar carrito e ir al catálogo
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        {step !== "contact" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep(step === "review" ? "delivery" : "contact")}
          >
            Atrás
          </Button>
        ) : null}
        {step !== "review" ? (
          <Button
            type="button"
            variant="primary"
            className="flex-1 min-h-[44px]"
            disabled={lines.length === 0}
            onClick={goNext}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            className="flex-1 min-h-[44px]"
            disabled={busy || lines.length === 0}
            onClick={() => void onSubmit()}
          >
            {busy ? "Procesando…" : "Confirmar encargo"}
          </Button>
        )}
      </div>
    </div>
  );
}
