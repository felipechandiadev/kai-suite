import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { listPointsOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { PointsOfSaleCollection } from "./components/PointsOfSaleCollection";
import { authOptions } from "@/lib/auth/auth-options";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;

  const [initialPointsOfSale, branches, priceListCatalog, storages] = await Promise.all([
    listPointsOfSaleForPage(),
    listBranchesForSettingsPage(),
    listPriceListsForPage(),
    listStoragesForPage(),
  ]);

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="pos-page-skeleton" />
      }
    >
      <PointsOfSaleCollection
        initialPointsOfSale={initialPointsOfSale}
        branches={branches}
        priceListCatalog={priceListCatalog}
        storages={storages}
        activeCompanyId={activeCompanyId ?? null}
      />
    </Suspense>
  );
}
