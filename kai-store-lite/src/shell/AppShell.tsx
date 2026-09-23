import { useEffect } from "react";
import { TitleBar } from "./TitleBar";
import { useTrayMenuBridge } from "./TrayMenuBridge";
import { useKeyboardSectionShortcuts } from "./useKeyboardSectionShortcuts";
import { useSectionStore } from "./section-state.store";
import { activatePosSection } from "./activate-pos-section";
import { AdminRoutes } from "@/sections/admin/AdminRoutes";
import { PosRoutes } from "@/sections/pos/PosRoutes";
import { AppLoginPage } from "@/sections/auth/AppLoginPage";
import { useAuth } from "@/providers/AuthProvider";
import { useLicense } from "@/providers/LicenseProvider";

export function AppShell() {
  const { user, canAccessAdmin } = useAuth();
  const { badge } = useLicense();
  const active = useSectionStore((s) => s.active);

  useTrayMenuBridge(canAccessAdmin);
  useKeyboardSectionShortcuts(canAccessAdmin);

  useEffect(() => {
    if (!canAccessAdmin && active === "admin") {
      activatePosSection();
    }
  }, [canAccessAdmin, active]);

  if (!user) {
    return (
      <div className="shell">
        <TitleBar licenseBadge={badge} signedOut />
        <main className="shell__body">
          <AppLoginPage />
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <TitleBar licenseBadge={badge} />
      <main className="shell__body">
        {active === "pos" ? <PosRoutes /> : null}
        {active === "admin" && canAccessAdmin ? <AdminRoutes /> : null}
      </main>
    </div>
  );
}
