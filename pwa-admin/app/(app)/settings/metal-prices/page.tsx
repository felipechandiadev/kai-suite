import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { listMetalPricesForPage } from "@/features/metal-prices/actions/metal-price.action";
import { isJewelryModuleEnabled } from "@/config/jewelry-module.config";
import { redirect } from "next/navigation";
import { MetalPricesDataGrid } from "./ui/MetalPricesDataGrid";

export const dynamic = "force-dynamic";

export default async function MetalPricesPage() {
  if (!isJewelryModuleEnabled()) {
    redirect("/settings");
  }

  const rows = await listMetalPricesForPage();

  return (
    <BasicPageLayout
      title="Precios de metales"
      subtitle="Histórico de cotización por metal en pesos chilenos (CLP)"
    >
      <MetalPricesDataGrid rows={rows} />
    </BasicPageLayout>
  );
}
