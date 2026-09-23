import { useState } from "react";
import { IconButton } from "@kai/ui";
import { APP_CONFIG } from "@/config/app.config";
import { useAuth } from "@/providers/AuthProvider";
import { usePosCartStore } from "@/sections/pos/store/pos-cart.store";
import { SectionTabs } from "./SectionTabs";
import { UserAccountDialog } from "./UserAccountDialog";

type TitleBarProps = {
  licenseBadge?: { kind: "trial" | "licensed" | "none"; label: string } | null;
  /** Login screen: brand + badge only */
  signedOut?: boolean;
};

export function TitleBar({ licenseBadge, signedOut = false }: TitleBarProps) {
  const { user, logout } = useAuth();
  const resetSession = usePosCartStore((s) => s.resetSession);
  const [accountOpen, setAccountOpen] = useState(false);

  function onLogout() {
    resetSession();
    logout();
  }

  function onPasswordChanged() {
    setAccountOpen(false);
    resetSession();
    logout();
  }

  return (
    <>
      <header className="titlebar" data-tauri-drag-region>
        <div className="titlebar__start">
          <div className="titlebar__brand">
            <img
              src="/kai-store-lite.png"
              alt=""
              width={22}
              height={22}
              className="titlebar__brand-icon"
              draggable={false}
            />
            <span>{APP_CONFIG.productName}</span>
          </div>
          {licenseBadge ? (
            <div className="titlebar__badge" data-kind={licenseBadge.kind}>
              {licenseBadge.label}
            </div>
          ) : null}
        </div>

        {!signedOut ? (
          <div className="titlebar__end">
            <SectionTabs />
            {user ? (
              <>
                <IconButton
                  icon="User"
                  variant="neutral"
                  size="sm"
                  ariaLabel="Mi cuenta"
                  title="Mi cuenta"
                  onClick={() => setAccountOpen(true)}
                  data-test-id="titlebar-user-account"
                />
                <IconButton
                  icon="LogOut"
                  variant="neutral"
                  size="sm"
                  ariaLabel="Cerrar sesión"
                  onClick={onLogout}
                  data-test-id="titlebar-logout"
                />
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      {user ? (
        <UserAccountDialog
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          user={user}
          onPasswordChanged={onPasswordChanged}
        />
      ) : null}
    </>
  );
}
