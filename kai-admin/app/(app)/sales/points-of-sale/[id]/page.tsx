import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getPointOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import PointOfSaleDetailPage from "./ui/PointOfSaleDetailPage";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;

  const [posRes, branches, priceListCatalog, storages] = await Promise.all([
    getPointOfSaleForPage(id),
    listBranchesForSettingsPage(),
    listPriceListsForPage(),
    listStoragesForPage(),
  ]);

  if (!posRes.ok) {
    notFound();
  }

  return (
    <PointOfSaleDetailPage
      initialPoint={posRes.point}
      branches={branches}
      priceListCatalog={priceListCatalog}
      storages={storages}
      companyId={posRes.point.companyId ?? activeCompanyId ?? null}
    />
  );
}
