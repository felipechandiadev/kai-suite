"use client";

import { useEffect, useState } from "react";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { useCompany } from "@/providers/CompanyProvider";
import {
  getCompanyEShopSettingsAction,
  replaceCompanyEShopSettingsAction,
} from "@/features/companies/actions/companies-eshop.action";

export function ShippingPlaceholderPanel() {
  const { company } = useCompany();
  const [threshold, setThreshold] = useState("");

  useEffect(() => {
    if (!company?.id) return;
    getCompanyEShopSettingsAction(company.id).then((r) => {
      if (r.success && r.eShopSettings.eShopFreeShippingThreshold != null) {
        setThreshold(String(r.eShopSettings.eShopFreeShippingThreshold));
      }
    });
  }, [company?.id]);

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        El cálculo por distancia y combustible se implementará en una fase posterior. Por ahora puede
        configurar el umbral de envío gratis usado en el carrito de la tienda.
      </p>
      <TextField
        label="Umbral envío gratis (CLP)"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
      />
      <Button
        variant="primary"
        disabled={!company?.id}
        onClick={() => {
          if (!company?.id) return;
          replaceCompanyEShopSettingsAction(company.id, {
            eShopFreeShippingThreshold: threshold ? Number(threshold) : null,
            eShopShippingMode: "disabled",
          });
        }}
      >
        Guardar umbral
      </Button>
    </div>
  );
}
