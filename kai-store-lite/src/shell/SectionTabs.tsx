import { IconButton } from "@kai/ui";
import type { AppSection } from "@/config/routes";
import { SECTION_LABELS } from "@/config/routes";
import { useAuth } from "@/providers/AuthProvider";
import { activatePosSection } from "./activate-pos-section";
import { CashSessionTitleBarActions } from "./CashSessionTitleBarActions";
import { useSectionStore } from "./section-state.store";

type SectionDef = {
  id: AppSection;
  icon: "ShoppingCart" | "Settings";
  adminOnly?: boolean;
};

const SECTIONS: SectionDef[] = [
  { id: "pos", icon: "ShoppingCart" },
  { id: "admin", icon: "Settings", adminOnly: true },
];

export function SectionTabs() {
  const active = useSectionStore((s) => s.active);
  const setActive = useSectionStore((s) => s.setActive);
  const { canAccessAdmin } = useAuth();

  const visible = SECTIONS.filter((s) => !s.adminOnly || canAccessAdmin);

  return (
    <div className="titlebar__tabs" role="tablist" aria-label="Secciones">
      {visible.map((section) => {
        const isActive = active === section.id;
        const tabButton = (
          <IconButton
            icon={section.icon}
            variant="neutral"
            size="sm"
            ariaLabel={SECTION_LABELS[section.id]}
            aria-selected={isActive}
            role="tab"
            title={SECTION_LABELS[section.id]}
            onClick={() => {
              if (section.id === "pos") {
                activatePosSection();
                return;
              }
              setActive(section.id);
            }}
            data-test-id={`section-tab-${section.id}`}
            data-active={isActive ? "true" : undefined}
            className="titlebar__tab-icon"
          />
        );

        if (section.id === "pos") {
          return (
            <div key={section.id} className="titlebar__pos-group">
              {tabButton}
              <CashSessionTitleBarActions />
            </div>
          );
        }

        return <span key={section.id}>{tabButton}</span>;
      })}
    </div>
  );
}
