"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import {
  fetchFulfillmentMethodsAction,
  fetchPaymentSettingsAction,
  getCheckoutProfilePrefillAction,
  prepareCheckoutAction,
  submitCheckoutAction,
} from "@/features/e-shop-checkout/actions/checkout.action";
import { CheckoutPaymentBrick } from "./CheckoutPaymentBrick";
import type { EShopFulfillmentMethodPublic } from "@/features/e-shop-checkout/types/checkout.types";
import {
  checkUsernameAvailabilityAction,
  isCustomerLoggedInAction,
  registerCustomerAction,
} from "@/features/e-shop-customer-account/actions/customer-account.action";
import { chilePhoneTextFieldProps } from "@/shared/lib/chile-phone-field";
import { eshopUsernameTextFieldProps } from "@/shared/lib/eshop-username-field";

type Step = "contact" | "delivery" | "review" | "payment";

const MIN_PASSWORD_LENGTH = 8;

type CheckoutFormProps = {
  customerPortalEnabled?: boolean;
  requireRut?: boolean;
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function splitFullName(full: string): { firstName: string; lastName?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "" };
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function CheckoutForm({
  customerPortalEnabled = false,
  requireRut = false,
}: CheckoutFormProps) {
  const router = useRouter();
  const { lines, subtotal, clearCart } = useEShopCart();
  const [step, setStep] = useState<Step>("contact");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [wantsAccount, setWantsAccount] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [methods, setMethods] = useState<EShopFulfillmentMethodPublic[]>([]);
  const [methodId, setMethodId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "coordinate">("coordinate");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentPublicKey, setPaymentPublicKey] = useState<string | null>(null);
  const [payableTotal, setPayableTotal] = useState(0);
  const [pendingDoc, setPendingDoc] = useState("");

  const showAccountChoice = customerPortalEnabled && !isLoggedIn;
  const guestCheckout = !isLoggedIn && (!customerPortalEnabled || !wantsAccount);
  const phoneRequired = guestCheckout;

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === methodId) ?? null,
    [methods, methodId],
  );
  const shippingCost = selectedMethod?.price ?? 0;
  const estimatedTotal = subtotal + shippingCost;

  useEffect(() => {
    void isCustomerLoggedInAction().then(setIsLoggedIn);
    void getCheckoutProfilePrefillAction().then((prefill) => {
      if (!prefill) return;
      if (!name) setName(prefill.name);
      if (!email) setEmail(prefill.email);
      if (!phone) setPhone(prefill.phone);
      if (!address) setAddress(prefill.address);
    });
    void fetchPaymentSettingsAction()
      .then((s) => {
        setOnlinePaymentEnabled(s.onlinePaymentEnabled);
        setPaymentMode(s.defaultPaymentMode === "online" ? "online" : "coordinate");
      })
      .catch(() => undefined);
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

  function validateContactStep(): boolean {
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios");
      return false;
    }
    if (phoneRequired && !phone.trim()) {
      setError("El teléfono es obligatorio para encargos sin cuenta (te contactaremos por ahí)");
      return false;
    }
    if (showAccountChoice && wantsAccount) {
      if (!username.trim()) {
        setError("El nombre de usuario es obligatorio para crear una cuenta");
        return false;
      }
      if (usernameError) {
        setError(usernameError);
        return false;
      }
      if (requireRut && !documentNumber.trim()) {
        setError("El RUT es obligatorio para crear una cuenta");
        return false;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
        return false;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return false;
      }
    }
    return true;
  }

  async function onSubmit() {
    setError(null);
    if (!validateContactStep()) {
      setStep("contact");
      return;
    }
    setBusy(true);
    try {
      if (showAccountChoice && wantsAccount) {
        const usernameCheck = await checkUsernameAvailabilityAction(username);
        if (!usernameCheck.success || !usernameCheck.available) {
          setError(usernameCheck.message ?? "Este nombre de usuario ya está en uso");
          setUsernameError(usernameCheck.message ?? "Este nombre de usuario ya está en uso");
          setStep("contact");
          return;
        }
        const { firstName, lastName } = splitFullName(name);
        const reg = await registerCustomerAction({
          username,
          email: email.trim(),
          password,
          firstName,
          lastName,
          phone: phone.trim() || undefined,
          documentNumber: documentNumber.trim() || undefined,
        });
        if (!reg.success) {
          setError(reg.error);
          setStep("contact");
          return;
        }
        setIsLoggedIn(true);
      }

      const checkoutBody = {
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
      };

      if (onlinePaymentEnabled && paymentMode === "online") {
        const prepared = await prepareCheckoutAction(checkoutBody);
        if (!prepared.paymentIntentId || !prepared.publicKey) {
          setError("Pago en línea no disponible. Elija coordinar pago después.");
          return;
        }
        setPaymentIntentId(prepared.paymentIntentId);
        setPaymentPublicKey(prepared.publicKey);
        setPayableTotal(prepared.payableTotal ?? estimatedTotal);
        setPendingDoc(prepared.documentNumber);
        setStep("payment");
        return;
      }

      const result = await submitCheckoutAction({
        ...checkoutBody,
        paymentMode: "coordinate",
      });
      const qs = new URLSearchParams({
        doc: result.documentNumber,
        method: selectedMethod?.name ?? "",
      });
      if (result.transactionId) qs.set("orderId", result.transactionId);
      if (result.hasStockShortage) qs.set("encargo", "1");
      if (email.trim()) qs.set("email", email.trim());
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
      if (!validateContactStep()) return;
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
      {showAccountChoice ? (
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/cuenta/login?next=/checkout" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      ) : null}

      <ol className="flex gap-2 text-xs text-muted-foreground">
        {(["contact", "delivery", "review"] as const).map((s, i) => (
          <li key={s} className={step === s ? "font-semibold text-foreground" : ""}>
            {i + 1}. {s === "contact" ? "Contacto" : s === "delivery" ? "Entrega" : "Resumen"}
          </li>
        ))}
      </ol>

      {step === "contact" ? (
        <div className="space-y-4">
          {showAccountChoice ? (
            <fieldset className="space-y-2 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium">¿Cómo quieres continuar?</legend>
              <label className="flex cursor-pointer gap-3 rounded-md p-2 has-[:checked]:bg-muted/50">
                <input
                  type="radio"
                  name="accountChoice"
                  checked={!wantsAccount}
                  onChange={() => setWantsAccount(false)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">Como invitado</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Sin cuenta. Necesitamos tu teléfono para coordinar el encargo.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-md p-2 has-[:checked]:bg-muted/50">
                <input
                  type="radio"
                  name="accountChoice"
                  checked={wantsAccount}
                  onChange={() => setWantsAccount(true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">Crear cuenta</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Elige una contraseña y podrás ver tus pedidos en Mi cuenta.
                  </span>
                </span>
              </label>
            </fieldset>
          ) : null}

          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <TextField
            label="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required={phoneRequired}
            helperText={
              phoneRequired
                ? "Obligatorio para encargos: te contactaremos para coordinar entrega y pago."
                : undefined
            }
            {...chilePhoneTextFieldProps}
          />

          {showAccountChoice && wantsAccount ? (
            <>
              <TextField
                label="Nombre de usuario"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameError(null);
                }}
                onBlur={() => {
                  if (!username.trim()) return;
                  void checkUsernameAvailabilityAction(username).then((r) => {
                    if (!r.success || !r.available) {
                      setUsernameError(r.message ?? "Este nombre de usuario ya está en uso");
                    } else {
                      setUsernameError(null);
                    }
                  });
                }}
                required
                {...eshopUsernameTextFieldProps}
              />
              {usernameError ? <p className="text-sm text-destructive">{usernameError}</p> : null}
              {requireRut ? (
                <TextField
                  label="RUT"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  required
                  helperText="Obligatorio para registrarse en esta tienda."
                />
              ) : (
                <TextField
                  label="RUT (opcional)"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              )}
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                helperText={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
                required
              />
              <TextField
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </>
          ) : null}
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
          {selectedMethod?.requiresPhone && !phone.trim() ? (
            <TextField
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              helperText="Este método de entrega requiere teléfono de contacto."
              {...chilePhoneTextFieldProps}
            />
          ) : null}
          <TextField
            label="Notas del pedido"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
          <p>
            <strong>Contacto:</strong> {name} · {email}
            {phone ? ` · ${phone}` : ""}
          </p>
          {showAccountChoice && wantsAccount ? (
            <p className="text-muted-foreground">Se creará tu cuenta al confirmar el pedido.</p>
          ) : null}
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
          {onlinePaymentEnabled ? (
            <fieldset className="space-y-2 border-0 p-0">
              <legend className="text-sm font-medium">Forma de pago</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "online"}
                  onChange={() => setPaymentMode("online")}
                />
                Pagar ahora (Mercado Pago)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "coordinate"}
                  onChange={() => setPaymentMode("coordinate")}
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
      ) : null}

      {step === "payment" && paymentIntentId && paymentPublicKey ? (
        <CheckoutPaymentBrick
          publicKey={paymentPublicKey}
          intentId={paymentIntentId}
          amount={payableTotal}
          payerEmail={email}
          onBack={() => setStep("review")}
          onSuccess={() => {
            clearCart();
            const qs = new URLSearchParams({
              doc: pendingDoc,
              method: selectedMethod?.name ?? "",
              paid: "1",
            });
            if (email.trim()) qs.set("email", email.trim());
            router.push(`/checkout/confirmacion?${qs.toString()}`);
          }}
        />
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
        {step !== "contact" && step !== "payment" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep(step === "review" ? "delivery" : "contact")}
          >
            Atrás
          </Button>
        ) : null}
        {step !== "review" && step !== "payment" ? (
          <Button
            type="button"
            variant="primary"
            className="flex-1 min-h-[44px]"
            disabled={lines.length === 0}
            onClick={goNext}
          >
            Continuar
          </Button>
        ) : step === "review" ? (
          <Button
            type="button"
            variant="primary"
            className="flex-1 min-h-[44px]"
            disabled={busy || lines.length === 0}
            onClick={() => void onSubmit()}
          >
            {busy
              ? "Procesando…"
              : onlinePaymentEnabled && paymentMode === "online"
                ? "Continuar al pago"
                : "Confirmar encargo"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
