"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";
import {
  defaultCompanyMercadoPagoSettings,
  toMercadoPagoForm,
  type CompanyMercadoPagoSettingsForm,
} from "@/features/company-integrations/types/company-mercado-pago.types";
import { replaceCompanyMercadoPagoSettingsAction } from "@/features/company-integrations/actions/companies-mercado-pago.action";
import { MercadoPagoLogo } from "@/shared/components/MercadoPagoLogo";

type Props = {
  companyId: string;
  initial: CompanyMercadoPagoSettingsForm;
};

export function IntegrationsSettingsForm({ companyId, initial }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Cuenta Mercado Pago</h2>
          <MercadoPagoLogo width={180} />
        </div>
        <p className="text-sm text-muted-foreground">
          Credenciales compartidas para POS Point y pago online del eShop.
        </p>
        <Switch
          label="Integración habilitada (POS Point)"
          checked={settings.enabled}
          onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
        />
        <p className="text-xs text-muted-foreground">
          El pago online del eShop solo requiere credenciales abajo y activar el checkout en
          eShop → Integraciones. Este switch habilita además cobro con terminal Point en caja.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Entorno</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={settings.environment}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                environment: e.target.value as "sandbox" | "production",
              }))
            }
          >
            <option value="sandbox">Sandbox (pruebas)</option>
            <option value="production">Producción</option>
          </select>
        </label>
        <TextField
          label="Public Key"
          value={settings.publicKey}
          onChange={(e) => setSettings((s) => ({ ...s, publicKey: e.target.value }))}
        />
        <TextField
          label="Access Token"
          type="password"
          value={settings.accessToken}
          placeholder={
            settings.accessTokenConfigured
              ? `Configurado (${settings.accessTokenMasked ?? "****"})`
              : "Pegar token de Mercado Pago"
          }
          onChange={(e) => setSettings((s) => ({ ...s, accessToken: e.target.value }))}
          helperText="Solo se guarda si ingresa un valor nuevo (no enmascarado)."
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">POS — Mercado Pago Point</h2>
        <Switch
          label="Cobro con terminal Point en caja"
          checked={settings.posPointEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, posPointEnabled: v }))}
        />
        <TextField
          label="ID terminal / dispositivo Point"
          value={settings.pointTerminalId ?? ""}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              pointTerminalId: e.target.value.trim() || null,
            }))
          }
        />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Configuración guardada.</p> : null}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            setSaved(false);
            void replaceCompanyMercadoPagoSettingsAction(companyId, settings).then((r) => {
              setBusy(false);
              if (!r.success) {
                setError(r.error);
                return;
              }
              setSettings(toMercadoPagoForm(r.mercadoPagoSettings));
              setSaved(true);
              router.refresh();
            });
          }}
        >
          Guardar integraciones
        </Button>
        <Link href="/e-shop/integrations" className="text-sm text-primary underline-offset-2 hover:underline self-center">
          Configurar checkout eShop
        </Link>
      </div>
    </div>
  );
}
