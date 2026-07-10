"use client";

import "@kai/ui/components/Tabs/tabs.css";
import type { VariantDetailSectionId, VariantDetailTabItem } from "./variant-detail-section.types";

type VariantDetailSectionNavProps = {
  tabs: VariantDetailTabItem[];
  activeId: VariantDetailSectionId;
  onSelect: (id: VariantDetailSectionId) => void;
};

export function VariantDetailSectionNav({ tabs, activeId, onSelect }: VariantDetailSectionNavProps) {
  return (
    <nav
      className="flex flex-wrap border-b border-border"
      aria-label="Secciones de la variante"
      data-test-id="product-variant-detail-section-nav"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`pv-section-panel-${tab.id}`}
            id={`pv-section-tab-${tab.id}`}
            className={`fs-tabs__link cursor-pointer border-0 bg-transparent ${
              isActive ? "fs-tabs__link--active" : "fs-tabs__link--inactive"
            }`}
            onClick={() => onSelect(tab.id)}
            data-test-id={`product-variant-detail-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
