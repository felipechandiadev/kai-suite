"use client";

import { useState } from "react";
import { IconButton } from "@kai/ui";
import SideBar from "@/shared/components/SideBar/SideBar";
import { deliveryMenuItems } from "@/navigation/deliveryMenu";
import type { CourierSession } from "@/lib/courier-session";

type DeliveryTopBarProps = {
  session: CourierSession;
};

export function DeliveryTopBar({ session }: DeliveryTopBarProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-border bg-background"
        data-test-id="delivery-top-bar"
      >
        <div className="mx-auto flex w-full max-w-lg items-center gap-2 px-3 py-2 sm:px-4">
          <IconButton
            icon="Menu"
            variant="action"
            size="md"
            strokeWidth={2.5}
            onClick={() => setShowSidebar(true)}
            ariaLabel="Abrir menú"
            data-test-id="delivery-menu-button"
          />
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 shrink-0 object-contain"
            data-test-id="delivery-top-bar-logo"
          />
          <div className="min-w-0 shrink leading-none" data-test-id="delivery-top-bar-brand">
            <p className="truncate text-base font-bold tracking-tight text-foreground">
              KaiStore
            </p>
            <p className="-mt-px truncate text-xs font-normal text-muted-foreground">
              Delivery
            </p>
          </div>
          <div className="min-w-2 flex-1" aria-hidden />
          <span
            className="max-w-32 shrink-0 truncate text-sm font-medium text-muted-foreground"
            title={session.displayName || session.userName}
            data-test-id="delivery-top-bar-user"
          >
            @{session.userName}
          </span>
        </div>
      </header>

      {showSidebar ? (
        <div
          className="fixed inset-0 z-60 flex"
          data-test-id="delivery-sidebar-shell"
          role="presentation"
        >
          <SideBar
            menuItems={deliveryMenuItems}
            session={session}
            onClose={() => setShowSidebar(false)}
            logoUrl="/logo.png"
            expandedState={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
          <div
            className="flex-1"
            style={{ backgroundColor: "var(--color-sidebar-overlay)" }}
            aria-label="Cerrar menú lateral"
            data-test-id="delivery-sidebar-overlay"
            onClick={() => setShowSidebar(false)}
          />
        </div>
      ) : null}
    </>
  );
}
