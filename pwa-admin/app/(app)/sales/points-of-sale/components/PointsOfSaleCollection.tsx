"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { PointsOfSaleCollectionAddAction } from "./PointsOfSaleCollectionAddAction";
import { PointOfSaleCard } from "./PointOfSaleCard";

type PointsOfSaleCollectionProps = {
  initialPointsOfSale: PointOfSaleListItem[];
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  storages: StorageListItem[];
  activeCompanyId: string | null;
};

/**
 * Búsqueda y filtrado en cliente (query `?search=`) sobre la lista resuelta en el servidor;
 * patrón «Colección admin» (sucursales / usuarios).
 */
export function PointsOfSaleCollection({
  initialPointsOfSale,
  branches,
  priceListCatalog,
  storages,
  activeCompanyId,
}: PointsOfSaleCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialPointsOfSale;
    }
    return initialPointsOfSale.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.deviceId && p.deviceId.toLowerCase().includes(q)) ||
        (p.branch?.name && p.branch.name.toLowerCase().includes(q)),
    );
  }, [initialPointsOfSale, q]);

  return (
    <CollectionPageLayout
      title="Puntos de venta"
      addAction={
        <PointsOfSaleCollectionAddAction
          branches={branches}
          priceListCatalog={priceListCatalog}
          storages={storages}
          activeCompanyId={activeCompanyId}
        />
      }
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay puntos de venta que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((p) => (
              <PointOfSaleCard
                key={p.id}
                point={p}
                branches={branches}
                priceListCatalog={priceListCatalog}
                storages={storages}
                activeCompanyId={activeCompanyId}
                data-test-id={`pos-card-${p.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      data-test-id="points-of-sale-collection"
    />
  );
}
