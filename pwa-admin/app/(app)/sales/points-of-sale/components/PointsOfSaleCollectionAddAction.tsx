"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { IconButton } from "@kai/ui";
import { CreatePointOfSaleDialog } from "./CreatePointOfSaleDialog";

type PointsOfSaleCollectionAddActionProps = {
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  storages: StorageListItem[];
  activeCompanyId: string | null;
};

/**
 * Controles de “añadir” para CollectionPageLayout: abre el diálogo; el alta pasa por server action.
 */
export function PointsOfSaleCollectionAddAction({
  branches,
  priceListCatalog,
  storages,
  activeCompanyId,
}: PointsOfSaleCollectionAddActionProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear punto de venta"
        onClick={() => setOpen(true)}
        data-test-id="point-of-sale-collection-add"
      />
      <CreatePointOfSaleDialog
        open={open}
        onClose={() => setOpen(false)}
        companyId={activeCompanyId}
        branches={branches}
        priceListCatalog={priceListCatalog}
        storages={storages}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
