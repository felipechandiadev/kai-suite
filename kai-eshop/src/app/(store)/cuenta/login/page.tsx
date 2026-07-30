import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StorePageShell } from "@/shared/components/StorePageShell";
import { requireCustomerPortalEnabled } from "@/features/e-shop-customer-account/lib/customer-portal-storefront";
import { getValidCustomerSessionToken } from "@/features/e-shop-customer-account/lib/customer-portal-session";
import { CustomerPortalDisabledMessage } from "@/features/e-shop-customer-account/ui/CustomerPortalDisabledMessage";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const storefront = await requireCustomerPortalEnabled();
  if (!storefront) {
    return <CustomerPortalDisabledMessage />;
  }
  const { email, next } = await searchParams;
  const nextPath = next?.trim() || "/cuenta";
  const sessionToken = await getValidCustomerSessionToken();
  if (sessionToken) {
    redirect(nextPath);
  }

  return (
    <StorePageShell>
      <h1 className="mb-6 text-2xl font-semibold">Iniciar sesión</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <LoginForm initialEmail={email?.trim() ?? ""} />
      </Suspense>
    </StorePageShell>
  );
}
