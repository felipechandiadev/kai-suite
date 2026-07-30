import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireCustomerPortalEnabled } from "@/features/e-shop-customer-account/lib/customer-portal-storefront";
import { getValidCustomerSessionToken } from "@/features/e-shop-customer-account/lib/customer-portal-session";
import { CustomerPortalDisabledMessage } from "@/features/e-shop-customer-account/ui/CustomerPortalDisabledMessage";
import { RegistroForm } from "./RegistroForm";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const storefront = await requireCustomerPortalEnabled();
  if (!storefront) {
    return <CustomerPortalDisabledMessage />;
  }
  const { email, next } = await searchParams;
  const sessionToken = await getValidCustomerSessionToken();
  if (sessionToken) {
    redirect(next?.trim() || "/cuenta");
  }

  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Cargando…</p>}>
      <RegistroForm
        requireRut={storefront.eShopRegistrationRequireRut === true}
        initialEmail={email?.trim() ?? ""}
      />
    </Suspense>
  );
}
