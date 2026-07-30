"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, IconButton } from "@kai/ui";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { PosDetailSectionNav } from "./PosDetailSectionNav";
import { PosDetailGeneralSection } from "./PosDetailGeneralSection";
import { PosDetailPriceListsSection } from "./PosDetailPriceListsSection";
import { PosDetailPaymentMethodsSection } from "./PosDetailPaymentMethodsSection";
import { PosDetailFiscalSection } from "./PosDetailFiscalSection";
import {
  type PosDetailSectionId,
  posDetailSectionFromHash,
  posDetailTabsForKind,
} from "./pos-detail-section.types";

type Props = {
  initialPoint: PointOfSaleListItem;
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  storages: StorageListItem[];
  companyId: string | null;
};

export default function PointOfSaleDetailPage({
  initialPoint,
  branches,
  priceListCatalog,
  storages,
  companyId,
}: Props) {
  const router = useRouter();
  const [point, setPoint] = useState(initialPoint);
  const [activeSection, setActiveSection] = useState<PosDetailSectionId>("general");

  useEffect(() => {
    setPoint(initialPoint);
  }, [initialPoint]);

  const visibleTabs = useMemo(
    () => posDetailTabsForKind(point.kind ?? "SALE"),
    [point.kind],
  );

  useEffect(() => {
    const fromHash = posDetailSectionFromHash(window.location.hash);
    if (fromHash && visibleTabs.some((t) => t.id === fromHash)) {
      setActiveSection(fromHash);
    }
  }, [visibleTabs]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeSection)) {
      setActiveSection("general");
      const nextHash = "#general";
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, "", `${window.location.pathname}${nextHash}`);
      }
    }
  }, [activeSection, visibleTabs]);

  const selectSection = useCallback((id: PosDetailSectionId) => {
    setActiveSection(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${nextHash}`);
    }
  }, []);

  const goBack = useCallback(() => {
    router.push("/sales/points-of-sale");
  }, [router]);

  const kind = point.kind ?? "SALE";
  const isSale = kind === "SALE";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" data-test-id="pos-detail-root">
      <header className="border-b border-border pb-4" data-test-id="pos-detail-header">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={goBack}
            ariaLabel="Volver a puntos de venta"
            data-test-id="pos-detail-back"
          />
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {point.name}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={isSale ? "info-outlined" : "warning-outlined"}>
              {isSale ? "Caja" : "Preventa"}
            </Badge>
            <Badge variant={point.isActive ? "success" : "secondary-outlined"}>
              {point.isActive ? "Activo" : "Inactivo"}
            </Badge>
            {point.branch?.name ? (
              <Badge variant="secondary-outlined">{point.branch.name}</Badge>
            ) : null}
          </div>
        </div>
        {point.storage?.name ? (
          <p className="mt-2 text-sm text-muted-foreground" data-test-id="pos-detail-storage-label">
            Sala de venta: {point.storage.name}
          </p>
        ) : null}
      </header>

      <PosDetailSectionNav tabs={visibleTabs} activeId={activeSection} onSelect={selectSection} />

      <div
        id={`pos-section-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`pos-section-tab-${activeSection}`}
        className="min-h-[16rem]"
        data-test-id="pos-detail-section-panel"
        data-active-section={activeSection}
      >
        {activeSection === "general" ? (
          <PosDetailGeneralSection
            point={point}
            branches={branches}
            storages={storages}
            priceListCatalog={priceListCatalog}
            companyId={point.companyId ?? companyId ?? null}
            onPointUpdated={setPoint}
          />
        ) : null}

        {activeSection === "listas" ? (
          <PosDetailPriceListsSection
            point={point}
            priceListCatalog={priceListCatalog}
            onPointUpdated={setPoint}
          />
        ) : null}

        {activeSection === "medios-pago" && isSale ? (
          <PosDetailPaymentMethodsSection
            posId={point.id}
            companyId={point.companyId ?? companyId ?? null}
            active={activeSection === "medios-pago"}
          />
        ) : null}

        {activeSection === "fiscal" && isSale ? (
          <PosDetailFiscalSection posId={point.id} active={activeSection === "fiscal"} />
        ) : null}
      </div>
    </div>
  );
}
