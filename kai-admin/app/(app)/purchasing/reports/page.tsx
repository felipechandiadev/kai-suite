import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { PurchasingReportsWorkspace } from "@/features/purchasing-reports/ui/PurchasingReportsWorkspace";

function supplierLabel(row: {
  id: string;
  alias?: string | null;
  person?: {
    businessName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    documentNumber?: string | null;
  } | null;
}): string {
  const p = row.person;
  const name =
    p?.businessName?.trim() ||
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
    row.alias?.trim() ||
    "Proveedor";
  const doc = p?.documentNumber?.trim();
  return doc ? `${name} · ${doc}` : name;
}

export default async function PurchasingReportsPage() {
  const [suppliersRes, storages] = await Promise.all([
    listSuppliersForGrid(),
    listStoragesForPage(),
  ]);

  const suppliers = (suppliersRes.rows ?? []).map((s) => ({
    id: s.id,
    label: supplierLabel(s),
  }));

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      data-test-id="purchasing-reports-page-root"
    >
      <PurchasingReportsWorkspace suppliers={suppliers} storages={storages} />
    </div>
  );
}
