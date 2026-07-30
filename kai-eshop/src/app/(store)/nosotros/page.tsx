import Link from "next/link";
import { getStorefrontAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";
import { EShopPublicContactLinks } from "@/shared/components/EShopPublicContactLinks";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default async function NosotrosPage() {
  const storefront = await getStorefrontAction();
  const contact = storefront.publicContact ?? {};

  return (
    <StorePageShell className="space-y-10">
      <header className="space-y-4">
        <EShopCompanyLogo
          companyName={storefront.companyName}
          logoUrl={storefront.companyLogoUrl}
          size="md"
        />
        <h1 className="text-2xl font-semibold">Nosotros</h1>
        {storefront.tagline ? (
          <p className="max-w-2xl text-lg text-muted-foreground">{storefront.tagline}</p>
        ) : null}
      </header>

      {storefront.brandManifest ? (
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {storefront.brandManifest}
        </div>
      ) : (
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            En {storefront.companyName} trabajamos para que compres con confianza: productos seleccionados,
            atención cercana y opciones de retiro o envío según tu zona.
          </p>
          <p>
            Puedes retirar en nuestras sucursales o coordinar el despacho al momento de tu compra. Si tienes
            dudas, escríbenos por los canales de contacto indicados abajo.
          </p>
        </div>
      )}

      {contact.email || contact.phone || contact.instagram || contact.tiktok || contact.facebook ? (
        <section className="max-w-2xl space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Contacto</h2>
          <EShopPublicContactLinks
            contact={contact}
            className="space-y-1 text-sm text-muted-foreground"
            linkClassName="text-primary hover:underline"
          />
        </section>
      ) : null}

      <p className="text-sm">
        <Link href="/donde-estamos" className="text-primary hover:underline">
          Ver sucursales y mapa
        </Link>
      </p>
    </StorePageShell>
  );
}
