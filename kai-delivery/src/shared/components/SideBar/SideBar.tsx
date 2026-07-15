"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, User, LogOut, ImageOff } from "lucide-react";
import { Button } from "@kai/ui";
import type { CourierSession } from "@/lib/courier-session";
import { clearCourierSession } from "@/lib/courier-session";

export interface SideBarMenuItem {
  id?: string;
  label: string;
  url?: string;
  children?: SideBarMenuItem[];
  hidden?: boolean;
}

interface SideBarProps {
  menuItems: SideBarMenuItem[];
  session: CourierSession;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
  logoUrl?: string;
  expandedState?: Record<string, boolean>;
  onExpandedChange?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const APP_TITLE = "KaiStore";
const APP_SUBTITLE = "Delivery";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

export const SIDE_BAR_MENU_ITEM_CLASSNAMES =
  "px-3 py-1 rounded text-foreground font-medium text-sm tracking-tighter transition-all duration-200 hover:bg-background/80 hover:backdrop-blur-sm hover:shadow-sm hover:text-secondary";

const MENU_ITEM_CLASSES = SIDE_BAR_MENU_ITEM_CLASSNAMES;

function filterVisibleMenuItems(items: SideBarMenuItem[]): SideBarMenuItem[] {
  return items.flatMap((item) => {
    if (item.hidden) return [];
    if (Array.isArray(item.children) && item.children.length > 0) {
      const visibleChildren = filterVisibleMenuItems(item.children);
      if (visibleChildren.length === 0) return [];
      return [{ ...item, children: visibleChildren }];
    }
    return [item];
  });
}

export default function SideBar({
  menuItems,
  session,
  className,
  style,
  onClose,
  logoUrl,
  expandedState,
  onExpandedChange,
}: SideBarProps) {
  const router = useRouter();
  const [localOpenIds, setLocalOpenIds] = useState<Record<string, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const openIds = expandedState ?? localOpenIds;

  const applyOpenState = (next: Record<string, boolean>) => {
    if (typeof onExpandedChange === "function") {
      onExpandedChange(next);
    } else {
      setLocalOpenIds(next);
    }
  };

  const toggleOpen = (id: string) => {
    applyOpenState({ ...openIds, [id]: !openIds[id] });
  };

  const handleNavigate = (url?: string) => {
    if (!url) return;
    if (typeof onClose === "function") onClose();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.location.href = url;
      return;
    }
    if (typeof window !== "undefined") {
      const current = window.location.pathname + window.location.search;
      if (current === url) return;
    }
    router.push(url);
  };

  const handleLogout = () => {
    clearCourierSession();
    if (typeof onClose === "function") onClose();
    router.replace("/login");
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
            className={`${MENU_ITEM_CLASSES} flex w-full items-center justify-between`}
            onClick={() => toggleOpen(id)}
            aria-expanded={isOpen}
          >
            <span>{item.label}</span>
            <ChevronRight
              size={16}
              className={`transform transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
          <ul className={`mt-0.5 space-y-0.5 pl-5 ${isOpen ? "" : "hidden"}`}>
            {item.children!.map((child, cIdx) => (
              <li key={child.id ?? `${child.label}-${cIdx}`}>
                <button
                  type="button"
                  className={`${MENU_ITEM_CLASSES} w-full cursor-pointer text-left`}
                  onClick={() => handleNavigate(child.url)}
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
          className={`${MENU_ITEM_CLASSES} w-full cursor-pointer text-left`}
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
            {(!logoLoaded || logoError) && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-300"
                aria-hidden
              >
                {logoError ? <ImageOff className="text-neutral-400" size={32} /> : null}
              </div>
            )}
            {!logoError ? (
              <img
                src={logoUrl}
                alt={`${APP_TITLE} ${APP_SUBTITLE}`}
                className="relative mx-auto h-20 w-auto max-w-20 object-contain transition-opacity duration-300"
                style={{ opacity: logoLoaded ? 1 : 0 }}
                data-test-id="side-bar-logo"
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col items-center leading-none">
          <span className="text-lg font-bold text-foreground">{APP_TITLE}</span>
          <span className="-mt-px text-sm font-normal text-muted-foreground">
            {APP_SUBTITLE}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">v{APP_VERSION}</div>
      </div>

      <div className="mb-4 w-full px-4">
        <div
          className="flex items-start gap-3 rounded-lg border border-border px-2.5 py-1.5"
          style={{ background: "transparent", borderWidth: "0.3px" }}
        >
          <User className="mt-0.5 shrink-0 text-muted-foreground" size={24} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className="line-clamp-2 text-left text-[11px] font-semibold leading-snug text-foreground"
              title={session.displayName}
            >
              {session.displayName}
            </span>
            <span className="mt-0.5 truncate text-left text-[10px] leading-tight opacity-60">
              Repartidor
            </span>
          </div>
        </div>
      </div>

      <nav className="mt-1.5 w-full flex-1 overflow-y-auto px-3">
        <ul className="flex w-full flex-col gap-1">
          {filterVisibleMenuItems(menuItems).map((item, idx) => renderMenuItem(item, idx))}
        </ul>
      </nav>

      <div className="mt-auto w-full px-4 pb-1.5">
        <Button
          variant="outlined"
          className="flex w-full items-center justify-center gap-2"
          onClick={handleLogout}
          data-test-id="side-bar-logout-btn"
        >
          <LogOut size={18} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
