"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import {
  createProductPagePath,
  isCreateProductPath,
} from "@/features/product/lib/product-routes";
import {
  isVariantDetailPath,
  SCAN_PATH,
  SEARCH_PATH,
} from "@/features/variant/lib/variant-routes";
import SideBar from "@/shared/components/SideBar/SideBar";
import { stockMenuItems } from "@/navigation/stockMenu";

function StockBrandBlock() {
  return (
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
  );
}

const stockNavIconProps = {
  variant: "action" as const,
  size: "md" as const,
  strokeWidth: 2.5,
};

function StockScanNavButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      icon="Scan"
      {...stockNavIconProps}
      onClick={onClick}
      ariaLabel="Escáner"
      data-test-id="variant-search-go-scan"
    />
  );
}

function StockSearchNavButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      icon="Search"
      {...stockNavIconProps}
      onClick={onClick}
      ariaLabel="Buscador"
      data-test-id="variant-search-engine"
    />
  );
}

function StockCreateProductNavButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      icon="Plus"
      {...stockNavIconProps}
      onClick={onClick}
      ariaLabel="Crear producto"
      data-test-id="stock-create-product-nav"
    />
  );
}

function StockScanSearchNavButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (isCreateProductPath(pathname)) {
    return (
      <>
        <StockScanNavButton onClick={() => router.push(SCAN_PATH)} />
        <StockSearchNavButton onClick={() => router.push(SEARCH_PATH)} />
      </>
    );
  }

  if (pathname === SCAN_PATH) {
    return (
      <>
        <StockSearchNavButton onClick={() => router.push(SEARCH_PATH)} />
        <StockCreateProductNavButton onClick={() => router.push(createProductPagePath())} />
      </>
    );
  }

  if (pathname === SEARCH_PATH) {
    return (
      <>
        <StockScanNavButton onClick={() => router.push(SCAN_PATH)} />
        <StockCreateProductNavButton onClick={() => router.push(createProductPagePath())} />
      </>
    );
  }

  if (isVariantDetailPath(pathname)) {
    return (
      <>
        <StockScanNavButton onClick={() => router.push(SCAN_PATH)} />
        <StockSearchNavButton onClick={() => router.push(SEARCH_PATH)} />
        <StockCreateProductNavButton onClick={() => router.push(createProductPagePath())} />
      </>
    );
  }

  return null;
}

type StockPageShellProps = {
  children: ReactNode;
};

export default function StockPageShell({ children }: StockPageShellProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});

  const openSidebar = () => setShowSidebar(true);
  const closeSidebar = () => setShowSidebar(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className="fixed top-0 z-30 flex h-[var(--app-topbar-height)] w-full border-b"
        style={{
          backgroundColor: "var(--color-background)",
          borderColor: "var(--color-border)",
        }}
        data-test-id="stock-app-header"
      >
        <div className="mx-auto flex h-full w-full max-w-md items-center justify-between gap-3 px-4">
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              icon="Menu"
              variant="action"
              size="md"
              strokeWidth={2.5}
              onClick={openSidebar}
              ariaLabel="Abrir menú"
              data-test-id="stock-menu-button"
            />
            <StockScanSearchNavButton />
          </div>
          <StockBrandBlock />
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
            onClose={closeSidebar}
            logoUrl="/logo.png"
            expandedState={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
          <div
            className="min-h-0 min-w-0 flex-1 cursor-default"
            style={{ backgroundColor: "var(--color-sidebar-overlay)" }}
            aria-label="Cerrar menú lateral"
            data-test-id="stock-sidebar-overlay"
            onClick={closeSidebar}
          />
        </div>
      ) : null}

      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6"
        style={{ paddingTop: "calc(var(--app-topbar-height) + var(--app-main-gap-top))" }}
      >
        {children}
      </main>
    </div>
  );
}
