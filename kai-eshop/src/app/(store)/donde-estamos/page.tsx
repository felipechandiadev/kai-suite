import { getBranchesAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { StorePageShell } from "@/shared/components/StorePageShell";
import { BranchesMap } from "../ui/BranchesMap";

export default async function DondeEstamosPage() {
  const branches = await getBranchesAction();
  return (
    <StorePageShell className="space-y-6">
      <h1 className="text-2xl font-semibold">Dónde encontrarnos</h1>
      <BranchesMap branches={branches} />
    </StorePageShell>
  );
}
