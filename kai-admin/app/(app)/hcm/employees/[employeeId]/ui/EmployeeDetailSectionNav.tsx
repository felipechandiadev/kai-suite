"use client";

import "@kai/ui/components/Tabs/tabs.css";
import type {
  EmployeeDetailSectionId,
  EmployeeDetailTabItem,
} from "./employee-detail-section.types";

type Props = {
  tabs: EmployeeDetailTabItem[];
  activeId: EmployeeDetailSectionId;
  onSelect: (id: EmployeeDetailSectionId) => void;
};

export function EmployeeDetailSectionNav({ tabs, activeId, onSelect }: Props) {
  return (
    <nav
      className="flex flex-wrap border-b border-border"
      aria-label="Secciones del empleado"
      data-test-id="employee-detail-section-nav"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`employee-section-panel-${tab.id}`}
            id={`employee-section-tab-${tab.id}`}
            className={`fs-tabs__link cursor-pointer border-0 bg-transparent ${
              isActive ? "fs-tabs__link--active" : "fs-tabs__link--inactive"
            }`}
            onClick={() => onSelect(tab.id)}
            data-test-id={`employee-detail-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
