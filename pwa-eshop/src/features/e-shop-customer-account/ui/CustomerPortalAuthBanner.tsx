"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isCustomerLoggedInAction } from "@/features/e-shop-customer-account/actions/customer-account.action";

type CustomerPortalAuthBannerProps = {
  customerPortalEnabled?: boolean;
  /** Correo sugerido para registro (p. ej. post-checkout). */
  suggestedEmail?: string;
  /** Pedido recién creado — destino tras login. */
  orderId?: string;
};

export function CustomerPortalAuthBanner({
  customerPortalEnabled = false,
  suggestedEmail,
  orderId,
}: CustomerPortalAuthBannerProps) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!customerPortalEnabled) return;
    void isCustomerLoggedInAction().then(setLoggedIn);
  }, [customerPortalEnabled]);

  if (!customerPortalEnabled || loggedIn === null || loggedIn) {
    return null;
  }

  const email = suggestedEmail?.trim() ?? "";
  const loginNext = orderId?.trim() ? `/cuenta/pedidos/${orderId.trim()}` : "/cuenta";
  const loginParams = new URLSearchParams({ next: loginNext });
  if (email) loginParams.set("email", email);
  const loginHref = `/cuenta/login?${loginParams.toString()}`;

  const registerParams = new URLSearchParams();
  if (email) registerParams.set("email", email);
  registerParams.set("next", loginNext);
  const registerHref = `/registro?${registerParams.toString()}`;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">
      <p className="font-medium text-foreground">¿Quieres seguir tus pedidos en línea?</p>
      <p className="mt-1 text-muted-foreground">
        Crea una cuenta con el mismo correo del pedido y verás el historial en Mi cuenta.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <Link href={registerHref} className="font-medium text-primary hover:underline">
          Crear cuenta
        </Link>
        <Link href={loginHref} className="text-muted-foreground hover:text-foreground hover:underline">
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
}
