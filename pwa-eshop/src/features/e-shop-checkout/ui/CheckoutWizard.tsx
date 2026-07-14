"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Stepper } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import {
  fetchFulfillmentMethodsAction,
  fetchPaymentSettingsAction,
  getCheckoutProfilePrefillAction,
  prepareCheckoutAction,
  submitCheckoutAction,
} from "@/features/e-shop-checkout/actions/checkout.action";
import {
  checkUsernameAvailabilityAction,
  isCustomerLoggedInAction,
  registerCustomerAction,
} from "@/features/e-shop-customer-account/actions/customer-account.action";
import { CheckoutPaymentBrick } from "@/app/(store)/checkout/CheckoutPaymentBrick";
import { buildCheckoutSteps, type CheckoutStepId } from "@/features/e-shop-checkout/lib/checkout-steps";
import { useCheckoutDraft } from "@/features/e-shop-checkout/hooks/useCheckoutDraft";
import { CheckoutCartStep } from "@/features/e-shop-checkout/ui/CheckoutCartStep";
import {
  CheckoutContactStep,
  MIN_PASSWORD_LENGTH,
} from "@/features/e-shop-checkout/ui/CheckoutContactStep";
import { CheckoutFulfillmentStep } from "@/features/e-shop-checkout/ui/CheckoutFulfillmentStep";
import { CheckoutReviewStep } from "@/features/e-shop-checkout/ui/CheckoutReviewStep";
import { createEmptyLocationState } from "@/features/e-shop-checkout/ui/CheckoutLocationStep";
import { fetchDeliveryQuoteAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { isDeliveryAdvancedEnabled } from "@/features/e-shop-checkout/lib/checkout-steps";
import type { CheckoutLocationState } from "@/features/e-shop-checkout/ui/CheckoutLocationStep";
import type { EShopFulfillmentMethodPublic } from "@/features/e-shop-checkout/types/checkout.types";

type Props = {
  customerPortalEnabled?: boolean;
  requireRut?: boolean;
};

function splitFullName(full: string): { firstName: string; lastName?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "" };
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function CheckoutWizard({ customerPortalEnabled = false, requireRut = false }: Props) {
  const router = useRouter();
  const {
    lines,
    subtotal,
    clearCart,
    cartId,
    cartToken,
    lockForCheckout,
    revalidateCart,
    issues,
  } = useEShopCart();

  const [step, setStep] = useState<CheckoutStepId>("cart");
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
  const [location, setLocation] = useState<CheckoutLocationState>(createEmptyLocationState);
  const [deliveryOccurrenceId, setDeliveryOccurrenceId] = useState("");
  const [localDeliveryShippingFee, setLocalDeliveryShippingFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [methods, setMethods] = useState<EShopFulfillmentMethodPublic[]>([]);
  const [methodId, setMethodId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "coordinate">("coordinate");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentPreferenceId, setPaymentPreferenceId] = useState<string | null>(null);
  const [paymentPublicKey, setPaymentPublicKey] = useState<string | null>(null);
  const [payableTotal, setPayableTotal] = useState(0);
  const [pendingDoc, setPendingDoc] = useState("");
  const [checkoutAttemptId, setCheckoutAttemptId] = useState<string | null>(null);

  const showAccountChoice = customerPortalEnabled && !isLoggedIn;
  const guestCheckout = !isLoggedIn && (!customerPortalEnabled || !wantsAccount);
  const phoneRequired = guestCheckout;

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === methodId) ?? null,
    [methods, methodId],
  );
  const shippingCost =
    selectedMethod?.type === "LOCAL_DELIVERY"
      ? localDeliveryShippingFee
      : (selectedMethod?.price ?? 0);
  const estimatedTotal = subtotal + shippingCost;

  const visibleSteps = useMemo(
    () =>
      buildCheckoutSteps({
        includeCartStep: true,
        includePaymentStep: onlinePaymentEnabled && paymentMode === "online",
      }),
    [onlinePaymentEnabled, paymentMode],
  );

  const draftApi = useCheckoutDraft(
    cartId,
    cartToken,
    {
      step,
      contact: {
        name,
        email,
        phone,
        wantsAccount,
        username,
        documentNumber,
      },
      delivery: {
        methodId,
        address,
        commune,
        region,
        notes,
        location,
        deliveryOccurrenceId,
      },
      paymentMode,
    },
    Boolean(cartId && cartToken),
  );

  useEffect(() => {
    void lockForCheckout();
    void revalidateCart();
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

    const restored = draftApi.restore();
    if (restored) {
      setStep(restored.step);
      setName(restored.contact.name);
      setEmail(restored.contact.email);
      setPhone(restored.contact.phone);
      setWantsAccount(restored.contact.wantsAccount);
      setUsername(restored.contact.username);
      setDocumentNumber(restored.contact.documentNumber);
      setMethodId(restored.delivery.methodId);
      setAddress(restored.delivery.address);
      setCommune(restored.delivery.commune);
      setRegion(restored.delivery.region);
      setNotes(restored.delivery.notes);
      if (restored.delivery.location) setLocation(restored.delivery.location);
      if (restored.delivery.deliveryOccurrenceId) {
        setDeliveryOccurrenceId(restored.delivery.deliveryOccurrenceId);
      }
      setPaymentMode(restored.paymentMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchFulfillmentMethodsAction(subtotal)
      .then((rows) => {
        const deliveryAdvanced = isDeliveryAdvancedEnabled();
        const available = deliveryAdvanced
          ? rows
          : rows.filter((m) => m.type === "PICKUP").length > 0
            ? rows.filter((m) => m.type === "PICKUP")
            : rows;
        setMethods(available);
        setMethodId((current) =>
          current && available.some((m) => m.id === current)
            ? current
            : (available[0]?.id ?? ""),
        );
      })
      .catch(() => setError("No se pudieron cargar los métodos de entrega"));
  }, [subtotal]);

  useEffect(() => {
    const zoneId = location.zone?.zoneId;
    if (selectedMethod?.type !== "LOCAL_DELIVERY" || !zoneId) {
      setLocalDeliveryShippingFee(0);
      return;
    }
    void fetchDeliveryQuoteAction(zoneId, subtotal)
      .then((q) => setLocalDeliveryShippingFee(q.shippingFee))
      .catch(() => setLocalDeliveryShippingFee(location.zone?.shippingFee ?? 0));
  }, [selectedMethod?.type, location.zone, subtotal]);

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

  function buildCheckoutBody() {
    const isLocal = selectedMethod?.type === "LOCAL_DELIVERY";
    const effectiveAddress = isLocal ? location.address : address;
    const effectiveCommune = isLocal ? location.commune : commune;
    const effectiveRegion = isLocal ? location.region : region;
    return {
      customerName: name,
      customerEmail: email,
      customerPhone: phone || undefined,
      fulfillmentMethodId: methodId,
      address: effectiveAddress || undefined,
      shippingAddress: effectiveAddress
        ? {
            line1: effectiveAddress,
            commune: effectiveCommune || undefined,
            region: effectiveRegion || undefined,
          }
        : undefined,
      cartId: cartId ?? undefined,
      cartToken: cartToken ?? undefined,
      checkoutAttemptId: checkoutAttemptId ?? undefined,
      notes: notes || undefined,
      deliveryZoneId: isLocal ? location.zone?.zoneId : undefined,
      deliveryOccurrenceId: isLocal ? deliveryOccurrenceId || undefined : undefined,
      latitude: isLocal ? (location.latitude ?? undefined) : undefined,
      longitude: isLocal ? (location.longitude ?? undefined) : undefined,
    };
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

      const checkoutBody = buildCheckoutBody();

      if (onlinePaymentEnabled && paymentMode === "online") {
        const prepared = await prepareCheckoutAction(checkoutBody);
        if (!prepared.paymentIntentId || !prepared.publicKey || !prepared.preferenceId) {
          setError("Pago en línea no disponible. Elija coordinar pago después.");
          return;
        }
        setCheckoutAttemptId(prepared.checkoutAttemptId ?? null);
        setPaymentIntentId(prepared.paymentIntentId);
        setPaymentPreferenceId(prepared.preferenceId);
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
      draftApi.clear();
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
      if (/Variante no válida|carrito/i.test(message)) {
        setError(
          "Uno o más productos del carrito ya no están disponibles. Actualiza el carrito e intenta de nuevo.",
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
    if (step === "cart") {
      if (issues.some((i) => i.code === "VARIANT_UNAVAILABLE")) {
        setError("Elimina los productos no disponibles antes de continuar");
        return;
      }
      setStep("contact");
      return;
    }
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
      if (selectedMethod?.type === "LOCAL_DELIVERY") {
        if (!location.address.trim() || !location.communeCode) {
          setError("Ingresa y valida tu dirección de reparto");
          return;
        }
        if (!location.covered || !location.zone) {
          setError("Tu dirección no está dentro de la cobertura de reparto");
          return;
        }
        if (!deliveryOccurrenceId) {
          setError("Selecciona una franja de reparto disponible");
          return;
        }
        setAddress(location.address);
        setCommune(location.commune);
        setRegion(location.region);
      } else if (selectedMethod?.requiresAddress && !address.trim()) {
        setError("La dirección es obligatoria para este método");
        return;
      }
      setStep("review");
    }
  }

  function goBack() {
    setError(null);
    if (step === "payment") setStep("review");
    else if (step === "review") setStep("delivery");
    else if (step === "delivery") setStep("contact");
    else if (step === "contact") setStep("cart");
  }

  const stepIndex = visibleSteps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6">
      <Stepper
        steps={visibleSteps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
        }))}
        activeIndex={Math.max(0, stepIndex)}
      />

      {step === "cart" ? <CheckoutCartStep /> : null}
      {step === "contact" ? (
        <CheckoutContactStep
          showAccountChoice={showAccountChoice}
          wantsAccount={wantsAccount}
          onWantsAccountChange={setWantsAccount}
          phoneRequired={phoneRequired}
          requireRut={requireRut}
          name={name}
          email={email}
          phone={phone}
          username={username}
          documentNumber={documentNumber}
          password={password}
          confirmPassword={confirmPassword}
          usernameError={usernameError}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPhoneChange={setPhone}
          onUsernameChange={setUsername}
          onDocumentNumberChange={setDocumentNumber}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onUsernameErrorChange={setUsernameError}
        />
      ) : null}
      {step === "delivery" ? (
        <CheckoutFulfillmentStep
          methods={methods}
          methodId={methodId}
          onMethodIdChange={setMethodId}
          selectedMethod={selectedMethod}
          location={location}
          onLocationChange={setLocation}
          deliveryOccurrenceId={deliveryOccurrenceId}
          onDeliveryOccurrenceIdChange={setDeliveryOccurrenceId}
          localDeliveryShippingFee={localDeliveryShippingFee}
          notes={notes}
          phone={phone}
          onNotesChange={setNotes}
          onPhoneChange={setPhone}
        />
      ) : null}
      {step === "review" ? (
        <CheckoutReviewStep
          name={name}
          email={email}
          phone={phone}
          showAccountChoice={showAccountChoice}
          wantsAccount={wantsAccount}
          selectedMethod={selectedMethod}
          subtotal={subtotal}
          shippingCost={shippingCost}
          estimatedTotal={estimatedTotal}
          onlinePaymentEnabled={onlinePaymentEnabled}
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
        />
      ) : null}
      {step === "payment" && paymentIntentId && paymentPublicKey && paymentPreferenceId ? (
        <CheckoutPaymentBrick
          publicKey={paymentPublicKey}
          preferenceId={paymentPreferenceId}
          intentId={paymentIntentId}
          amount={payableTotal}
          payerEmail={email}
          onBack={() => setStep("review")}
          onSuccess={() => {
            void clearCart();
            draftApi.clear();
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
          {/carrito/i.test(error) ? (
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                void clearCart();
                router.push("/productos");
              }}
            >
              Vaciar carrito e ir al catálogo
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        {step !== "cart" && step !== "payment" ? (
          <Button type="button" variant="secondary" onClick={goBack}>
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
