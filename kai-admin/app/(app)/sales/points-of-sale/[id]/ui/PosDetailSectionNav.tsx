"use client";

import "@kai/ui/components/Tabs/tabs.css";
import type { PosDetailSectionId, PosDetailTabItem } from "./pos-detail-section.types";

type PosDetailSectionNavProps = {
  tabs: PosDetailTabItem[];
  activeId: PosDetailSectionId;
  onSelect: (id: PosDetailSectionId) => void;
};

export function PosDetailSectionNav({ tabs, activeId, onSelect }: PosDetailSectionNavProps) {
  return (
    <nav
      className="flex flex-wrap border-b border-border"
      aria-label="Secciones del punto de venta"
      data-test-id="pos-detail-section-nav"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`pos-section-panel-${tab.id}`}
            id={`pos-section-tab-${tab.id}`}
            className={`fs-tabs__link cursor-pointer border-0 bg-transparent ${
              isActive ? "fs-tabs__link--active" : "fs-tabs__link--inactive"
            }`}
            onClick={() => onSelect(tab.id)}
            data-test-id={`pos-detail-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
