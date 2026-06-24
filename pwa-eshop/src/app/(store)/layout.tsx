import { Suspense } from "react";
import { EShopCartProvider } from "@/features/e-shop-cart/EShopCartProvider";
import { getStorefrontAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { EShopApiError } from "@/features/e-shop-storefront/infrastructure/eshop-api-error";
import { isLightHexColor } from "@/features/e-shop-storefront/lib/is-light-hex-color";
import { CLASSIC_THEME_FALLBACK } from "@/features/e-shop-storefront/lib/build-theme-css-vars";
import { DEFAULT_ESHOP_TOP_BAR } from "@/features/e-shop-storefront/lib/default-eshop-shell";
import { EShopThemeShell } from "@/features/e-shop-storefront/ui/EShopThemeShell";
import { EShopTopBar } from "@/shared/components/EShopTopBar";
import { EShopCartDrawer } from "@/shared/components/EShopCartDrawer";
import { EShopFooter } from "@/shared/components/EShopFooter";
import { EShopStoreUnavailable } from "@/shared/components/EShopStoreUnavailable";
import { LegacyHashRedirect } from "./ui/LegacyHashRedirect";
import { getValidCustomerSessionToken } from "@/features/e-shop-customer-account/lib/customer-portal-session";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let storefront;
  try {
    storefront = await getStorefrontAction();
  } catch (e) {
    if (e instanceof EShopApiError) {
      if (e.status === 503) {
        return <EShopStoreUnavailable reason="disabled" />;
      }
      if (e.status === 404) {
        return <EShopStoreUnavailable reason="not_found" />;
      }
    }
    throw e;
  }

  const chrome =
    storefront.theme?.tokens.chrome ?? CLASSIC_THEME_FALLBACK.tokens.chrome;
  const chromeIsLight = isLightHexColor(chrome);
  const portalEnabled = storefront.eShopCustomerPortalEnabled === true;
  const customerLoggedIn = portalEnabled ? Boolean(await getValidCustomerSessionToken()) : false;

  return (
    <EShopThemeShell theme={storefront.theme}>
      <EShopCartProvider initialFreeShippingThreshold={storefront.eShopFreeShippingThreshold}>
        <LegacyHashRedirect />
        <Suspense fallback={null}>
          <EShopTopBar
            companyName={storefront.companyName}
            companyLogoUrl={storefront.companyLogoUrl}
            topBar={storefront.topBar ?? DEFAULT_ESHOP_TOP_BAR}
            chromeIsLight={chromeIsLight}
            customerPortalEnabled={portalEnabled}
            customerLoggedIn={customerLoggedIn}
          />
        </Suspense>
        <main className="w-full flex-1">{children}</main>
        <EShopFooter storefront={storefront} />
        <EShopCartDrawer />
      </EShopCartProvider>
    </EShopThemeShell>
  );
}
