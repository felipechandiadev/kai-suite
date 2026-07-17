import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { CreateProductionForm } from "./ui/CreateProductionForm";

export const dynamic = "force-dynamic";

export default async function NewProductionOrderPage() {
  const [branches, storages] = await Promise.all([
    listBranchesForSettingsPage(),
    listStoragesForPage(),
  ]);
  return <CreateProductionForm branches={branches} storages={storages} />;
}
