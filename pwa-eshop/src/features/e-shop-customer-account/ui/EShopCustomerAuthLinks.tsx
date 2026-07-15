"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isCustomerLoggedInAction } from "@/features/e-shop-customer-account/actions/customer-account.action";

type EShopCustomerAuthLinksProps = {
  customerPortalEnabled: boolean;
  customerLoggedIn: boolean;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function EShopCustomerAuthLinks({
  customerPortalEnabled,
  customerLoggedIn: initialLoggedIn,
  variant,
  onNavigate,
}: EShopCustomerAuthLinksProps) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);

  useEffect(() => {
    setLoggedIn(initialLoggedIn);
  }, [initialLoggedIn]);

  useEffect(() => {
    if (!customerPortalEnabled) return;
    void isCustomerLoggedInAction().then(setLoggedIn);
  }, [customerPortalEnabled, pathname]);

  if (!customerPortalEnabled) {
    return null;
  }

  const linkClass =
    variant === "mobile"
      ? "rounded-md px-3 py-3 text-base text-chrome-foreground/90 hover:bg-chrome-foreground/10 hover:text-chrome-foreground"
      : "whitespace-nowrap text-sm font-medium text-chrome-foreground/90 hover:text-chrome-foreground";

  const registerClass =
    variant === "mobile"
      ? "rounded-md px-3 py-3 text-base font-medium text-chrome-foreground hover:bg-chrome-foreground/10"
      : "fs-button fs-button--outlined inline-flex items-center justify-center px-3 py-1.5 text-sm !border-chrome-foreground !text-chrome-foreground hover:!bg-chrome-foreground/10 hover:!text-chrome-foreground hover:!border-chrome-foreground";

  function handleClick() {
    onNavigate?.();
  }

  if (loggedIn) {
    return (
      <Link href="/cuenta" className={linkClass} onClick={handleClick}>
        Mi cuenta
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <>
        <div className="my-2 border-t border-chrome-foreground/10" />
        <Link href="/cuenta/login" className={linkClass} onClick={handleClick}>
          Ingresar
        </Link>
        <Link href="/registro" className={registerClass} onClick={handleClick}>
          Crear cuenta
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/cuenta/login" className={linkClass}>
        Ingresar
      </Link>
      <Link href="/registro" className={registerClass}>
        Registrarse
      </Link>
    </>
  );
}
