"use client";

import React, { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronRight, User, LogOut, ImageOff } from "lucide-react";
import { useImageWithPlaceholder } from "@/shared/hooks/useImageWithPlaceholder";
import { Button } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { resolveTopbarProductLabel } from "@/config/product-brand.config";

export interface SideBarMenuItem {
  id?: string;
  label: string;
  url?: string;
  children?: SideBarMenuItem[];
  requiresRole?: "SUPER_ADMIN" | "ADMIN" | "OPERATOR";
  hidden?: boolean;
}

interface SideBarProps {
  menuItems: SideBarMenuItem[];
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
  logoUrl?: string;
  expandedState?: Record<string, boolean>;
  onExpandedChange?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onOpenChangePassword?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super-administrador",
  admin: "Administrador",
  operator: "Operador",
};

function filterVisibleMenuItems(
  items: SideBarMenuItem[],
  role: string | null | undefined,
): SideBarMenuItem[] {
  return items.flatMap((item) => {
    if (item.hidden) return [];
    if (item.requiresRole && item.requiresRole !== role) {
      return [];
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      const visibleChildren = filterVisibleMenuItems(item.children, role);
      if (visibleChildren.length === 0) return [];
      return [{ ...item, children: visibleChildren }];
    }
    return [item];
  });
}

const APP_TITLE = resolveTopbarProductLabel();
const APP_SUBTITLE = "StockControl";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export const SIDE_BAR_MENU_ITEM_CLASSNAMES =
  "px-3 py-1 rounded text-foreground font-medium text-sm tracking-tighter transition-all duration-200 hover:bg-background/80 hover:backdrop-blur-sm hover:shadow-sm hover:text-secondary";

const MENU_ITEM_CLASSES = SIDE_BAR_MENU_ITEM_CLASSNAMES;

export default function SideBar({
  menuItems,
  className,
  style,
  onClose,
  logoUrl,
  expandedState,
  onExpandedChange,
  onOpenChangePassword,
}: SideBarProps) {
  const { data: session } = useSession();
  const [localOpenIds, setLocalOpenIds] = useState<Record<string, boolean>>({});
  const {
    ref: sideLogoRef,
    loaded: sideLogoLoaded,
    error: sideLogoError,
    onLoad: onSideLogoLoad,
    onError: onSideLogoError,
  } = useImageWithPlaceholder(logoUrl ?? "");

  const openIds = expandedState ?? localOpenIds;

  const applyOpenState = (next: Record<string, boolean>) => {
    if (typeof onExpandedChange === "function") {
      onExpandedChange(next);
    } else {
      setLocalOpenIds(next);
    }
  };

  const toggleOpen = (id: string) => {
    const next = { ...openIds, [id]: !openIds[id] };
    applyOpenState(next);
  };

  const router = useRouter();

  const handleNavigate = (url?: string) => {
    if (!url) return;
    if (typeof onClose === "function") onClose();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.location.href = url;
      return;
    }
    if (typeof window !== "undefined") {
      const current = window.location.pathname + window.location.search;
      if (current === url) {
        return;
      }
    }
    router.push(url);
  };

  const renderMenuItem = (item: SideBarMenuItem, idx: number) => {
    const id = item.id ?? `${item.label}-${idx}`;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (hasChildren) {
      const isOpen = !!openIds[id];
      return (
        <li key={id}>
          <button
            type="button"
            className={`${MENU_ITEM_CLASSES} w-full flex justify-between items-center`}
            onClick={() => toggleOpen(id)}
            aria-expanded={isOpen}
            data-test-id={`side-bar-parent-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <span>{item.label}</span>
            <ChevronRight
              size={16}
              className={`transform transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
          <ul className={`pl-5 space-y-0.5 mt-0.5 ${isOpen ? "" : "hidden"}`}>
            {item.children!.map((child, cIdx) => (
              <li key={child.id ?? `${child.label}-${cIdx}`}>
                <button
                  type="button"
                  className={`${MENU_ITEM_CLASSES} w-full text-left cursor-pointer`}
                  onClick={() => handleNavigate(child.url)}
                  data-test-id={`side-bar-child-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {child.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li key={id}>
        <button
          type="button"
          className={`${MENU_ITEM_CLASSES} w-full text-left cursor-pointer`}
          onClick={() => handleNavigate(item.url)}
          data-test-id={`side-bar-menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`fs-app-sidebar flex h-full min-h-0 w-[13.6rem] shrink-0 flex-col items-center py-4 shadow-xl backdrop-saturate-150 ${className ?? ""}`}
      style={style}
      data-test-id="side-bar-root"
    >
      <div className="mb-4 text-center">
        {logoUrl ? (
          <div className="relative mx-auto mb-2 h-20 w-20" data-test-id="side-bar-logo-box">
            {(!sideLogoLoaded || sideLogoError) && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-300"
                data-test-id="side-bar-logo-skeleton"
                aria-hidden
              >
                {sideLogoError ? <ImageOff className="text-neutral-400" size={32} /> : null}
              </div>
            )}
            {!sideLogoError && (
              <img
                ref={sideLogoRef}
                src={logoUrl}
                alt={`${APP_TITLE} ${APP_SUBTITLE}`}
                className="relative mx-auto h-20 w-auto max-w-20 object-contain transition-opacity duration-300"
                style={{ opacity: sideLogoLoaded ? 1 : 0 }}
                data-test-id="side-bar-logo"
                onLoad={onSideLogoLoad}
                onError={onSideLogoError}
              />
            )}
          </div>
        ) : null}
        <div className="flex flex-col items-center leading-none">
          <span className="text-lg font-bold text-foreground" data-test-id="side-bar-app-name">
            {APP_TITLE}
          </span>
          <span
            className="-mt-px text-sm font-normal text-muted-foreground"
            data-test-id="side-bar-app-subtitle"
          >
            {APP_SUBTITLE}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground" data-test-id="side-bar-app-version">
          v{APP_VERSION}
        </div>
      </div>

      {session?.user
        ? (() => {
            const user = session.user as Record<string, unknown>;
            const displayName =
              (user.userName as string | undefined) ||
              (user.name as string | undefined) ||
              "Usuario";
            const roleKey = (
              (user.role as string | undefined) ?? (user.rol as string | undefined)
            )?.toLowerCase();
            return (
              <div className="mb-4 w-full px-4">
                <div
                  className="flex items-start justify-between gap-2.5 rounded-lg border border-border px-2.5 py-1.5"
                  style={{ background: "transparent", borderWidth: "0.3px" }}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <User className="mt-0.5 shrink-0 text-muted-foreground" size={24} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className="line-clamp-2 wrap-break-word text-left text-[11px] font-semibold leading-snug text-foreground"
                        title={displayName}
                      >
                        {displayName}
                      </span>
                      <span className="mt-0.5 truncate text-left text-[10px] capitalize leading-tight opacity-60">
                        {roleKey ? (ROLE_LABELS[roleKey] ?? roleKey) : ""}
                      </span>
                    </div>
                  </div>
                  {onOpenChangePassword ? (
                    <IconButton
                      className="shrink-0 self-center"
                      icon="KeyRound"
                      variant="action"
                      size="sm"
                      onClick={onOpenChangePassword}
                      ariaLabel="Cambiar contraseña"
                    />
                  ) : null}
                </div>
              </div>
            );
          })()
        : null}

      <nav className="mt-1.5 w-full flex-1 overflow-y-auto px-3">
        <ul className="flex w-full flex-col gap-1">
          {filterVisibleMenuItems(
            menuItems,
            ((session?.user as Record<string, unknown> | undefined)?.role as string | undefined) ??
              ((session?.user as Record<string, unknown> | undefined)?.rol as string | undefined) ??
              null,
          ).map((item, idx) => renderMenuItem(item, idx))}
        </ul>
      </nav>

      <div className="mt-auto w-full px-4 pb-1.5">
        <Button
          variant="outlined"
          className="flex w-full items-center justify-center gap-2"
          onClick={async () => {
            await signOut({ callbackUrl: "/" });
          }}
          data-test-id="side-bar-logout-btn"
        >
          <LogOut size={18} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
