'use client';

import './sidebar.css';
import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronRight, User, LogOut, ImageOff, Image as ImageIcon } from 'lucide-react';
import { useImageWithPlaceholder } from '@/shared/hooks/useImageWithPlaceholder';
import { isCompanyChecksEnabledFromSettings } from '@/features/companies/types/company-checks.types';
import { isCompanyTipsEnabledFromSettings } from '@/features/kaifood-tips/types/company-tips.types';
import { isEShopModuleEnabled } from '@/config/eshop-module.config';
import { isJewelryModuleEnabled } from '@/config/jewelry-module.config';
import { isKaiFoodEnabled } from '@/config/kaifood-module.config';
import { isKaiServicesEnabled } from '@/config/kaiservices-module.config';
import { isMultiCompanyModuleEnabled } from '@/config/multi-company-module.config';
import { getKaiAdminAppName } from '@/config/product-brand.config';
import { isEShopEnabledFromSettings } from '@/features/companies/types/company-eshop.types';
import { useCompany } from '@/providers/CompanyProvider';
import { Button, IconButton } from '@kai/ui';

export interface SideBarMenuItem {
  id?: string;
  label: string;
  url?: string;
  children?: SideBarMenuItem[];
  /**
   * Si está presente, el item solo se renderiza cuando el rol del usuario
   * coincide. Para items con `children`, además se filtra recursivamente
   * el árbol y si todos los hijos se ocultan, el padre también desaparece.
   */
  requiresRole?: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  /** Oculta el ítem en sidebar sin quitarlo del menú (restaurar con `hidden: false`). */
  hidden?: boolean;
  /** Solo visible si la empresa tiene habilitado el módulo de cheques en tesorería. */
  requiresChecksEnabled?: boolean;
  /** Solo visible si la empresa tiene `settings.tips.enabled`. */
  requiresTipsEnabled?: boolean;
  /** Solo visible si el módulo eShop está activo en env y `settings.eShopEnabled` es true. */
  requiresEShopEnabled?: boolean;
  /** Solo visible si el motor de reparto local está activo (`localDeliveryEnabled`). */
  requiresLocalDeliveryEnabled?: boolean;
  /** Solo visible si el despliegue incluye módulo joyería. */
  requiresJewelryEnabled?: boolean;
  /** Solo visible si el despliegue es KaiFood (`NEXT_PUBLIC_KAI_PRODUCT=kaifood`). */
  requiresKaiFoodEnabled?: boolean;
  /** Solo visible si el despliegue es Kai Services (`NEXT_PUBLIC_KAI_PRODUCT=kaiservices`). */
  requiresKaiServicesEnabled?: boolean;
  /** Solo visible en despliegues multi-empresa. */
  requiresMultiCompanyEnabled?: boolean;
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
  super_admin: 'Super-administrador',
  admin: 'Administrador',
  operator: 'Operador',
  inspector: 'Inspector',
  director: 'Director',
};

/**
 * Filtra recursivamente el árbol de menú según rol y flag `hidden`.
 * Si un padre se queda sin hijos visibles, también se oculta.
 */
function filterVisibleMenuItems(
  items: SideBarMenuItem[],
  role: string | null | undefined,
  checksEnabled: boolean,
  tipsEnabled: boolean,
  eShopEnabled: boolean,
  localDeliveryEnabled: boolean,
  jewelryEnabled: boolean,
  kaiFoodEnabled: boolean,
  kaiServicesEnabled: boolean,
  multiCompanyEnabled: boolean,
): SideBarMenuItem[] {
  return items.flatMap((item) => {
    if (item.hidden) return [];
    if (item.requiresRole && item.requiresRole !== role) {
      return [];
    }
    if (item.requiresChecksEnabled && !checksEnabled) {
      return [];
    }
    if (item.requiresTipsEnabled && !tipsEnabled) {
      return [];
    }
    if (item.requiresEShopEnabled && !eShopEnabled) {
      return [];
    }
    if (item.requiresLocalDeliveryEnabled && !localDeliveryEnabled) {
      return [];
    }
    if (item.requiresJewelryEnabled && !jewelryEnabled) {
      return [];
    }
    if (item.requiresKaiFoodEnabled && !kaiFoodEnabled) {
      return [];
    }
    if (item.requiresKaiServicesEnabled && !kaiServicesEnabled) {
      return [];
    }
    if (item.requiresMultiCompanyEnabled && !multiCompanyEnabled) {
      return [];
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      const visibleChildren = filterVisibleMenuItems(
        item.children,
        role,
        checksEnabled,
        tipsEnabled,
        eShopEnabled,
        localDeliveryEnabled,
        jewelryEnabled,
        kaiFoodEnabled,
        kaiServicesEnabled,
        multiCompanyEnabled,
      );
      if (visibleChildren.length === 0) return [];
      return [{ ...item, children: visibleChildren }];
    }
    return [item];
  });
}

const APP_NAME = getKaiAdminAppName();
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
const APP_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE || '21-Diciembre-2025';

/** Padding vertical reducido; mismo hover en padres, hojas e hijos (como el antiguo segundo nivel). */
export const SIDE_BAR_MENU_ITEM_CLASSNAMES =
  "px-3 py-1 rounded text-foreground font-medium text-sm tracking-tighter transition-all duration-200 hover:bg-background/80 hover:backdrop-blur-sm hover:shadow-sm hover:text-secondary";

const MENU_ITEM_CLASSES = SIDE_BAR_MENU_ITEM_CLASSNAMES;

const SideBar: React.FC<SideBarProps> = ({
  menuItems,
  className,
  style,
  onClose,
  logoUrl,
  expandedState,
  onExpandedChange,
  onOpenChangePassword,
}) => {
  const { data: session } = useSession();
  const { company, localDeliveryEnabled } = useCompany();
  const checksEnabled = isCompanyChecksEnabledFromSettings(company?.settings);
  const tipsEnabled = isCompanyTipsEnabledFromSettings(
    company?.settings as Record<string, unknown> | undefined,
  );
  const eShopEnabled =
    isEShopModuleEnabled() &&
    isEShopEnabledFromSettings(company?.settings as Record<string, unknown> | undefined);
  const jewelryEnabled = isJewelryModuleEnabled();
  const kaiFoodEnabled = isKaiFoodEnabled();
  const kaiServicesEnabled = isKaiServicesEnabled();
  const multiCompanyEnabled = isMultiCompanyModuleEnabled();

  // Track which parent items are open using their id or label
  const [localOpenIds, setLocalOpenIds] = useState<Record<string, boolean>>({});
  const {
    ref: sideLogoRef,
    loaded: sideLogoLoaded,
    error: sideLogoError,
    onLoad: onSideLogoLoad,
    onError: onSideLogoError,
  } = useImageWithPlaceholder(logoUrl ?? '');

  const openIds = expandedState ?? localOpenIds;

  const applyOpenState = (next: Record<string, boolean>) => {
    if (typeof onExpandedChange === 'function') {
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
    // Close sidebar BEFORE navigating for faster perceived response
    if (typeof onClose === 'function') onClose();
    // External URLs: open in same tab
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.location.href = url;
      return;
    }
    // if already on the target url, do nothing (no flash)
    if (typeof window !== 'undefined') {
      const current = window.location.pathname + window.location.search;
      if (current === url) {
        return;
      }
    }
    // use next/router push to avoid full reload
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
            className={`${MENU_ITEM_CLASSES} w-full flex justify-between items-center`}
            onClick={() => toggleOpen(id)}
            aria-expanded={isOpen}
            data-test-id={`side-bar-parent-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span>{item.label}</span>
            <ChevronRight
              size={16}
              className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
          <ul className={`pl-5 space-y-0.5 mt-0.5 ${isOpen ? '' : 'hidden'}`}>
            {item.children!.map((child, cIdx) => (
              <li key={(child.id ?? `${child.label}-${cIdx}`)}>
                <button
                  className={`${MENU_ITEM_CLASSES} w-full text-left cursor-pointer`}
                  onClick={() => handleNavigate(child.url)}
                  data-test-id={`side-bar-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
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
          className={`${MENU_ITEM_CLASSES} w-full text-left cursor-pointer`}
          onClick={() => handleNavigate(item.url)}
          data-test-id={`side-bar-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.label}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`fs-app-sidebar flex h-full min-h-0 w-[13.6rem] shrink-0 flex-col items-center py-4 shadow-xl backdrop-saturate-150 ${className ? className : ""}`}
      style={{
        backgroundColor: "var(--color-sidebar-bg)",
        color: "var(--color-foreground)",
        borderRight: "1px solid var(--color-border)",
        WebkitBackdropFilter: "blur(var(--sidebar-backdrop-blur))",
        backdropFilter: "blur(var(--sidebar-backdrop-blur))",
        ...style,
      }}
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
                {sideLogoError && (
                  <ImageOff className="text-neutral-400" size={32} />
                )}
              </div>
            )}
            {!sideLogoError && (
              <img
                ref={sideLogoRef}
                src={logoUrl}
                alt={`${APP_NAME} Logo`}
                className="relative mx-auto h-20 w-auto max-w-20 object-contain transition-opacity duration-300"
                style={{ opacity: sideLogoLoaded ? 1 : 0 }}
                data-test-id="side-bar-logo"
                onLoad={onSideLogoLoad}
                onError={onSideLogoError}
              />
            )}
          </div>
        ) : null}
        {/* <div className="text-xl font-bold" data-test-id="side-bar-app-name">{APP_NAME}</div> */}
        {/* <div className="text-sm opacity-70" data-test-id="side-bar-app-version">{'1.2.12'}</div> */}
        <div className="text-lg font-bold text-foreground" data-test-id="side-bar-app-name">{APP_NAME}</div>
        <div className="text-sm text-muted-foreground" data-test-id="side-bar-app-version">v{APP_VERSION}</div>
      </div>

      {session?.user && (() => {
        const user = session.user as Record<string, unknown>;
        const displayName = (user.userName as string | undefined)
          || (user.name as string | undefined)
          || 'Usuario';
        const roleKey = (user.role as string | undefined)?.toLowerCase();
        return (
          <div className="w-full px-4 mb-4">
            <div className="flex items-start justify-between gap-2.5 border border-border rounded-lg px-2.5 py-1.5" style={{ background: "transparent", borderWidth: "0.3px" }}>
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
                    {roleKey ? ROLE_LABELS[roleKey] ?? roleKey : ''}
                  </span>
                </div>
              </div>
              <IconButton
                className="shrink-0 self-center"
                icon="KeyRound"
                variant="action"
                size="sm"
                onClick={onOpenChangePassword}
                title="Cambiar contraseña"
              />
            </div>
          </div>
        );
      })()}

      <nav className="w-full px-3 flex-1 mt-1.5 overflow-y-auto">
        <ul className="flex w-full flex-col gap-1">
          {filterVisibleMenuItems(
            menuItems,
            (session?.user?.role as string | undefined) ?? null,
            checksEnabled,
            tipsEnabled,
            eShopEnabled,
            localDeliveryEnabled,
            jewelryEnabled,
            kaiFoodEnabled,
            kaiServicesEnabled,
            multiCompanyEnabled,
          ).map((item, idx) => renderMenuItem(item, idx))}
        </ul>
      </nav>

      <div className="w-full mt-auto px-4 pb-1.5">
        <Button
          variant="outlined"
          className="w-full flex items-center justify-center gap-2"
          onClick={async () => {
            await signOut({ callbackUrl: '/' });
          }}
          data-test-id="side-bar-logout-btn"
        >
          <LogOut size={18} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
};

export default SideBar;
