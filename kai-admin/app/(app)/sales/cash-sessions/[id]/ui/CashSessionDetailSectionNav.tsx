"use client";

import "@kai/ui/components/Tabs/tabs.css";
import type {
  CashSessionDetailSectionId,
  CashSessionDetailTabItem,
} from "@/features/sales-cash-sessions/types/cash-session-detail.types";

type Props = {
  tabs: CashSessionDetailTabItem[];
  activeId: CashSessionDetailSectionId;
  onSelect: (id: CashSessionDetailSectionId) => void;
};

export function CashSessionDetailSectionNav({
  tabs,
  activeId,
  onSelect,
}: Props) {
  return (
    <nav
      className="flex flex-wrap border-b border-border"
      aria-label="Secciones de la sesión de caja"
      data-test-id="cash-session-detail-section-nav"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`cs-section-panel-${tab.id}`}
            id={`cs-section-tab-${tab.id}`}
            className={`fs-tabs__link cursor-pointer border-0 bg-transparent ${
              isActive ? "fs-tabs__link--active" : "fs-tabs__link--inactive"
            }`}
            onClick={() => onSelect(tab.id)}
            data-test-id={`cash-session-detail-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
