import { Suspense } from "react";
import { BasicPageLayout, LoadingState, adminFillViewportBelowTopBarClassName } from "@kai/ui";
import TopbarPageContent from "./TopbarPageContent";

export const dynamic = "force-dynamic";

export default async function EShopTopbarPage() {
  const company = await GetCompanyUseCase.execute();

  return (
    <BasicPageLayout
      title="Topbar eShop"
      subtitle="Configure la barra superior de su tienda: enlaces, logo y carrito."
      className={adminFillViewportBelowTopBarClassName}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-test-id="eshop-topbar-page"
    >
      {company?.id == null ? (
        <p className="text-sm text-muted-foreground">No se pudo cargar la empresa activa.</p>
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto p-1">
          <Suspense
            fallback={
              <LoadingState
                className="flex items-center justify-center py-8"
                data-test-id="eshop-topbar-loading"
              />
            }
          >
            <TopbarPageContent
              companyId={company.id}
              companyName={company.nombreFantasia || company.razonSocial || "Mi tienda"}
            />
          </Suspense>
        </div>
      )}
    </BasicPageLayout>
  );
}
