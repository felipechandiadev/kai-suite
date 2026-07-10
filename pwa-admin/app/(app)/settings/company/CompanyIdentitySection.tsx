"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  getCompanyIdentityAction,
  replaceCompanyIdentityAction,
} from "@/features/companies/actions/companies-eshop.action";
import { CompanyLogoSection } from "./CompanyLogoSection";

type Props = { company: CompanyDetails };

export function CompanyIdentitySection({ company }: Props) {
  const router = useRouter();
  const [tagline, setTagline] = useState("");
  const [brandManifest, setBrandManifest] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company.id) return;
    getCompanyIdentityAction(company.id).then((r) => {
      if (r.success) {
        setTagline(r.companyIdentity.tagline ?? "");
        setBrandManifest(r.companyIdentity.brandManifest ?? "");
      }
    });
  }, [company.id]);

  return (
    <section className="space-y-8" data-test-id="company-identity">
      <div>
        <h2 className="text-lg font-semibold">Identidad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo, leyenda y manifiesto de marca. Se muestran en la tienda en línea y documentos de la empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(200px,280px)_1fr] md:items-start">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <h3 className="text-sm font-medium text-foreground">Logo</h3>
          {company.id ? <CompanyLogoSection companyId={company.id} embedded /> : null}
        </div>

        <div className="grid min-w-0 gap-4">
          <TextField
            label="Leyenda"
            placeholder="Tu tienda en línea"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <TextField
            label="Manifiesto de marca"
            placeholder="Describe la propuesta de valor y la personalidad de tu marca…"
            type="textarea"
            rows={5}
            value={brandManifest}
            onChange={(e) => setBrandManifest(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={busy || !company.id}
              onClick={() => {
                if (!company.id) return;
                setBusy(true);
                replaceCompanyIdentityAction(company.id, { tagline, brandManifest }).finally(() => {
                  setBusy(false);
                  router.refresh();
                });
              }}
            >
              Guardar leyenda y manifiesto
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
