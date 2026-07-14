"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyEShopFlatSettings,
  type CompanyEShopFlatSettings,
} from "@/features/companies/types/company-eshop.types";
import {
  getCompanyEShopSettingsAction,
  replaceCompanyEShopSettingsAction,
} from "@/features/companies/actions/companies-eshop.action";

type Props = { company: CompanyDetails };

export function CompanyEShopSection({ company }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<CompanyEShopFlatSettings>(
    defaultCompanyEShopFlatSettings(),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company.id) return;
    getCompanyEShopSettingsAction(company.id).then((r) => {
      if (r.success) setSettings(r.eShopSettings);
    });
  }, [company.id]);

  return (
    <section className="space-y-4" data-test-id="company-eshop-settings">
      <h2 className="text-lg font-semibold">eShop</h2>
      <Switch
        label="Tienda en línea habilitada"
        checked={settings.eShopEnabled}
        onChange={(v) => setSettings((s) => ({ ...s, eShopEnabled: v }))}
      />
      <TextField
        label="Slug público (URL /e-shop/[slug])"
        value={settings.eShopPublicSlug ?? ""}
        onChange={(e) => setSettings((s) => ({ ...s, eShopPublicSlug: e.target.value || null }))}
      />
      <p className="text-sm text-muted-foreground">
        Métodos de entrega, stock, sucursal/almacén, portal cliente y umbral de envío gratis:{" "}
        <Link
          href="/e-shop/fulfillment/metodos"
          className="text-primary underline-offset-2 hover:underline"
        >
          Encargos y envíos → Métodos
        </Link>{" "}
        y{" "}
        <Link
          href="/e-shop/fulfillment/configuracion"
          className="text-primary underline-offset-2 hover:underline"
        >
          Configuración
        </Link>
        .
      </p>
      <Button
        variant="primary"
        disabled={busy || !company.id}
        onClick={() => {
          if (!company.id) return;
          setBusy(true);
          replaceCompanyEShopSettingsAction(company.id, settings).finally(() => {
            setBusy(false);
            router.refresh();
          });
        }}
        data-test-id="company-eshop-save"
      >
        Guardar eShop
      </Button>
    </section>
  );
}
