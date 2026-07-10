"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import {
  type CompanyMercadoPagoSettingsPublic,
} from "@/features/company-integrations/types/company-mercado-pago.types";
import { updateEShopMercadoPagoSettingsAction } from "@/features/e-shop-integrations/actions/eshop-mercado-pago.action";
import { MercadoPagoLogo } from "@/shared/components/MercadoPagoLogo";

type Props = {
  initial: CompanyMercadoPagoSettingsPublic;
};

function mercadoPagoCredentialChecks(settings: CompanyMercadoPagoSettingsPublic) {
  return {
    integrationEnabled: settings.enabled,
    publicKey: Boolean(settings.publicKey?.trim()),
    accessToken: settings.accessTokenConfigured,
  };
}

function isCheckoutOperational(settings: CompanyMercadoPagoSettingsPublic): boolean {
  const c = mercadoPagoCredentialChecks(settings);
  return c.publicKey && c.accessToken && settings.eshopOnlinePaymentEnabled;
}

export function EShopIntegrationsForm({ initial }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const credentials = useMemo(() => mercadoPagoCredentialChecks(settings), [settings]);
  const checkoutOperational = useMemo(() => isCheckoutOperational(settings), [settings]);
  const missingForCheckout: string[] = [];
  if (!credentials.publicKey) missingForCheckout.push("Public Key");
  if (!credentials.accessToken) missingForCheckout.push("Access Token");

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        Las credenciales de Mercado Pago se configuran en{" "}
        <Link href="/settings/integrations" className="text-primary underline-offset-2 hover:underline">
          Configuración → Integraciones
        </Link>
        . Podés activar el pago online aquí antes de tener credenciales; la tienda solo lo
        mostrará cuando la cuenta MP esté completa.
      </p>

      <section className="rounded-lg border border-border p-4 space-y-3 text-sm">
        <p>
          <strong>Cuenta MP:</strong>{" "}
          {credentials.integrationEnabled && credentials.accessToken
            ? "Configurada"
            : "Sin credenciales"}
        </p>
        <p>
          <strong>Public Key:</strong> {credentials.publicKey ? "Presente" : "Falta"}
        </p>
        <p>
          <strong>Integración MP:</strong>{" "}
          {credentials.integrationEnabled ? "Habilitada" : "Deshabilitada"}
        </p>
        <p>
          <strong>Checkout en tienda:</strong>{" "}
          {checkoutOperational
            ? "Activo (clientes pueden pagar en línea)"
            : settings.eshopOnlinePaymentEnabled
              ? "Pendiente — faltan credenciales o integración MP"
              : "Desactivado"}
        </p>
        {settings.eshopOnlinePaymentEnabled && missingForCheckout.length > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            Para que el checkout muestre Mercado Pago, en{" "}
            <Link href="/settings/integrations" className="font-medium underline underline-offset-2">
              Integraciones
            </Link>{" "}
            debes: {missingForCheckout.join(", ")}.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Checkout — pago online</h2>
          <MercadoPagoLogo width={170} />
        </div>
        <Switch
          label="Permitir pagar en línea en el checkout"
          checked={settings.eshopOnlinePaymentEnabled}
          onChange={(v) =>
            setSettings((s) => ({ ...s, eshopOnlinePaymentEnabled: v }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Guarda la preferencia de la tienda. Sin Public Key y Access Token en{" "}
          <Link href="/settings/integrations" className="text-primary underline-offset-2 hover:underline">
            Integraciones
          </Link>
          , el checkout seguirá mostrando solo encargo.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Modo por defecto</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={settings.eshopDefaultPaymentMode}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                eshopDefaultPaymentMode: e.target.value as "online" | "coordinate",
              }))
            }
          >
            <option value="online">Pagar ahora (Mercado Pago)</option>
            <option value="coordinate">Coordinar pago después (encargo)</option>
          </select>
        </label>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        variant="primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError("");
          void updateEShopMercadoPagoSettingsAction({
            eshopOnlinePaymentEnabled: settings.eshopOnlinePaymentEnabled,
            eshopDefaultPaymentMode: settings.eshopDefaultPaymentMode,
          }).then((r) => {
            setBusy(false);
            if (!r.success) {
              setError(r.error);
              return;
            }
            setSettings(r.mercadoPagoSettings);
            router.refresh();
          });
        }}
      >
        Guardar checkout eShop
      </Button>
    </div>
  );
}
