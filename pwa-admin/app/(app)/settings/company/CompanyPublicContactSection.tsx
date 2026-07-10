"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  getCompanyPublicContactAction,
  replaceCompanyPublicContactAction,
} from "@/features/companies/actions/companies-eshop.action";

type Props = { company: CompanyDetails };

export function CompanyPublicContactSection({ company }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [facebook, setFacebook] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company.id) return;
    getCompanyPublicContactAction(company.id).then((r) => {
      if (r.success) {
        setEmail(r.publicContact.email ?? "");
        setPhone(r.publicContact.phone ?? "");
        setInstagram(r.publicContact.instagram ?? "");
        setTiktok(r.publicContact.tiktok ?? "");
        setFacebook(r.publicContact.facebook ?? "");
      }
    });
  }, [company.id]);

  return (
    <section className="space-y-4" data-test-id="company-public-contact">
      <div>
        <h2 className="text-lg font-semibold">Contacto y redes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Correo y teléfono se usan en documentos impresos y en la tienda en línea. Las redes se muestran en el eShop.
        </p>
      </div>
      <div className="grid gap-4 max-w-md">
        <TextField
          label="Correo de contacto"
          type="email"
          placeholder="contacto@empresa.cl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Teléfono de contacto"
          placeholder="+56 2 2345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Instagram"
          placeholder="https://www.instagram.com/tu-marca/"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <TextField
          label="TikTok"
          placeholder="https://www.tiktok.com/@tu-marca"
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
        />
        <TextField
          label="Facebook"
          placeholder="https://www.facebook.com/tu-marca"
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />
        <Button
          variant="primary"
          disabled={busy || !company.id}
          onClick={() => {
            if (!company.id) return;
            setBusy(true);
            replaceCompanyPublicContactAction(company.id, {
              email,
              phone,
              instagram,
              tiktok,
              facebook,
            }).finally(() => {
              setBusy(false);
              router.refresh();
            });
          }}
        >
          Guardar
        </Button>
      </div>
    </section>
  );
}
