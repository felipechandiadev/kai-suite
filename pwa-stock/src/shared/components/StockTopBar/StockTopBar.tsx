"use client";

import { useState } from "react";
import { IconButton } from "@kai/ui";
import SideBar from "@/shared/components/SideBar/SideBar";
import { stockMenuItems } from "@/navigation/stockMenu";

export default function StockTopBar() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});

  return (
    <>
      <header
        className="fixed top-0 z-30 w-full border-b"
        style={{
          backgroundColor: "var(--color-background)",
          borderColor: "var(--color-border)",
        }}
        data-test-id="stock-top-bar"
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2">
          <IconButton
            icon="Menu"
            variant="action"
            size="md"
            strokeWidth={2.5}
            onClick={() => setShowSidebar(true)}
            ariaLabel="Abrir menú"
            data-test-id="stock-menu-button"
          />
          <div className="flex shrink-0 items-center gap-2" data-test-id="stock-top-bar-brand">
            <div className="flex flex-col text-right leading-none">
              <span className="text-base font-bold tracking-tight">KaiStore</span>
              <span className="text-xs font-normal text-muted-foreground">StockControl</span>
            </div>
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 shrink-0 object-contain"
              data-test-id="stock-top-bar-logo"
            />
          </div>
        </div>
      </header>

      {showSidebar ? (
        <div
          className="fixed inset-0 z-[60] flex"
          data-test-id="stock-sidebar-shell"
          role="presentation"
        >
          <SideBar
            menuItems={stockMenuItems}
            onClose={() => setShowSidebar(false)}
            logoUrl="/logo.png"
            expandedState={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
          <div
            className="flex-1"
            style={{ backgroundColor: "var(--color-sidebar-overlay)" }}
            aria-label="Cerrar menú lateral"
            data-test-id="stock-sidebar-overlay"
            onClick={() => setShowSidebar(false)}
          />
        </div>
      ) : null}
    </>
  );
}
