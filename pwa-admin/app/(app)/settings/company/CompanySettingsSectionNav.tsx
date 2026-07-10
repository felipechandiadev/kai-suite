"use client";

import "@kai/ui/components/Tabs/tabs.css";
import type { CompanySettingsTabId, CompanySettingsTabItem } from "./company-settings-tabs.types";

type Props = {
  tabs: CompanySettingsTabItem[];
  activeId: CompanySettingsTabId;
  onSelect: (id: CompanySettingsTabId) => void;
};

export function CompanySettingsSectionNav({ tabs, activeId, onSelect }: Props) {
  return (
    <nav
      className="flex w-full min-w-0 overflow-x-auto border-b border-border"
      aria-label="Secciones de configuración de empresa"
      data-test-id="settings-company-section-nav"
    >
      <div className="flex flex-nowrap">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`company-settings-panel-${tab.id}`}
            id={`company-settings-tab-${tab.id}`}
            className={`fs-tabs__link cursor-pointer border-0 bg-transparent whitespace-nowrap ${
              isActive ? "fs-tabs__link--active" : "fs-tabs__link--inactive"
            }`}
            onClick={() => onSelect(tab.id)}
            data-test-id={`settings-company-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
      </div>
    </nav>
  );
}
