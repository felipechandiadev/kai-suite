"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOutToLogin } from "@/lib/auth/sign-out-to-login";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, CircleUser, ImageOff, Image as ImageIcon, Store, Wifi, WifiOff } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import {
  POS_CONTEXT_CHANGED_EVENT,
  readPosContextClient,
  type PosKind,
} from "@/features/session/lib/pos-context-storage";
import { StockAlertsDropdown } from "@/features/inventory-stock/ui/StockAlertsDropdown";
import { OfflineStatusBadge } from "@/features/pos-offline/ui/OfflineStatusBadge";
import { PrintServiceTopBarDropdown, usePrintServiceConnection } from "@kai/print-service-client";
import Dialog from "@/shared/components/Dialog/Dialog";
import { Button } from "@/shared/components/Button";
import ChangePasswordDialog from "@/shared/components/Dialog/ChangePasswordDialog";
import {
  clearPosPrintJobBrowserFallback,
  tryPosPrintJobBrowserFallback,
} from "@/features/pos-print/lib/pos-print-job-browser-fallback";

export type PosTopBarProps = {
  pointOfSaleName?: string | null;
  companyTradeName?: string | null;
  personName?: string | null;
  userRole?: string | null;
};

function roleLabel(role: string): string {
  const r = role.trim().toUpperCase();
  if (r === "ADMIN") return "Administrador";
  if (r === "MANAGER") return "Administrador";
  if (r === "CASHIER") return "Cajero";
  if (r === "SELLER") return "Vendedor";
  return role.trim();
}

type TopBarNavIconVariant = "text" | "action";

/** Primary por defecto; action cuando la ruta coincide (sección activa). */
function topBarNavIconVariant(active: boolean): TopBarNavIconVariant {
  return active ? "action" : "text";
}

function pathnameMatchesRoute(pathname: string, routePrefix: string): boolean {
  const p = pathname.trim() || "/";
  if (routePrefix === "/pos") {
    return p === "/pos" || p.startsWith("/pos/payment") || p.startsWith("/pos/credit-payment");
  }
  return p === routePrefix || p.startsWith(`${routePrefix}/`);
}

type PrintServiceNavProps = {
  connected: boolean;
  health: ReturnType<typeof usePrintServiceConnection>["health"];
  visual: ReturnType<typeof usePrintServiceConnection>["visual"];
  lastError: string | null;
  attemptedWsUrl: string | null;
  reconnect: () => void;
  notifications: ReturnType<typeof usePrintServiceConnection>["notifications"];
  unreadCount: number;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
};

type PosTopBarNavProps = {
  pathname: string;
  onNavigate: (path: string) => void;
  printService: PrintServiceNavProps;
  isPresalePos?: boolean;
  className?: string;
};

function PosTopBarNav({
  pathname,
  onNavigate,
  printService,
  isPresalePos = false,
  className = "",
}: PosTopBarNavProps) {
  return (
    <nav
      className={`flex items-center gap-2 ${className}`.trim()}
      data-test-id="pos-topbar-nav"
      aria-label="Navegación principal"
    >
      <IconButton
        icon="ShoppingCart"
        variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/pos"))}
        size="md"
        ariaLabel="Ir al punto de venta"
        title="Punto de venta"
        aria-current={pathnameMatchesRoute(pathname, "/pos") ? "page" : undefined}
        onClick={() => onNavigate("/pos")}
        data-test-id="pos-topbar-pos"
      />
      {!isPresalePos ? (
        <IconButton
          icon="Users"
          variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/customers"))}
          size="md"
          ariaLabel="Clientes"
          aria-current={pathnameMatchesRoute(pathname, "/customers") ? "page" : undefined}
          onClick={() => onNavigate("/customers")}
          data-test-id="pos-topbar-customers"
        />
      ) : null}
      <StockAlertsDropdown />
      <OfflineStatusBadge />
      {!isPresalePos ? (
        <>
          <IconButton
            icon="FileCheck"
            variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/purchasing/receptions"))}
            size="md"
            ariaLabel="Recepción de compra"
            title="Recepción de compra"
            aria-current={pathnameMatchesRoute(pathname, "/purchasing/receptions") ? "page" : undefined}
            onClick={() => onNavigate("/purchasing/receptions/new")}
            data-test-id="pos-topbar-reception"
          />
          <IconButton
            icon="ArrowLeftRight"
            variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/movements"))}
            size="md"
            ariaLabel="Movimientos de caja"
            title="Movimientos de caja"
            aria-current={pathnameMatchesRoute(pathname, "/cash/movements") ? "page" : undefined}
            onClick={() => onNavigate("/cash/movements")}
            data-test-id="pos-topbar-cash-movements"
          />
          <IconButton
            icon="BanknoteArrowDown"
            variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/hub-deposit"))}
            size="md"
            ariaLabel="Ingreso de efectivo desde centro de efectivo"
            title="Ingreso desde centro de efectivo"
            aria-current={pathnameMatchesRoute(pathname, "/cash/hub-deposit") ? "page" : undefined}
            onClick={() => onNavigate("/cash/hub-deposit")}
            data-test-id="pos-topbar-hub-deposit"
          />
          <IconButton
            icon="BanknoteArrowUp"
            variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/hub-withdrawal"))}
            size="md"
            ariaLabel="Egreso de efectivo a centro de efectivo"
            title="Egreso a centro de efectivo"
            aria-current={pathnameMatchesRoute(pathname, "/cash/hub-withdrawal") ? "page" : undefined}
            onClick={() => onNavigate("/cash/hub-withdrawal")}
            data-test-id="pos-topbar-hub-withdrawal"
          />
          <IconButton
            icon="LockKeyhole"
            variant={topBarNavIconVariant(pathnameMatchesRoute(pathname, "/cash/closing"))}
            size="md"
            ariaLabel="Cerrar caja"
            title="Cerrar caja"
            aria-current={pathnameMatchesRoute(pathname, "/cash/closing") ? "page" : undefined}
            onClick={() => onNavigate("/cash/closing")}
            data-test-id="pos-topbar-cash-closing"
          />
        </>
      ) : null}
      <PrintServiceTopBarDropdown
        panelVariant="pos"
        notificationBadgeVariant="secondary"
        connected={printService.connected}
        health={printService.health}
        visual={printService.visual}
        lastError={printService.lastError}
        attemptedWsUrl={printService.attemptedWsUrl}
        reconnect={printService.reconnect}
        notifications={printService.notifications}
        unreadCount={printService.unreadCount}
        markNotificationsRead={printService.markNotificationsRead}
        clearNotifications={printService.clearNotifications}
        triggerClassName={`fs-icon-button fs-icon-button--action relative inline-flex items-center justify-center overflow-visible w-10 h-10 shrink-0 ${
          printService.connected
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
        renderLocalAgentStatus={({ connected }) => {
          const label = connected
            ? "Conectado al servicio local de impresión"
            : "Sin conexión al servicio local de impresión";
          return (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
              title={label}
              aria-label={label}
              role="img"
            >
              {connected ? (
                <Wifi
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  size={24}
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <WifiOff
                  className="shrink-0 text-red-600 dark:text-red-400"
                  size={24}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </span>
          );
        }}
        data-test-id="pos-topbar-session-print"
      />
    </nav>
  );
}

function userRoleLabel(raw: unknown): string {
  const r = typeof raw === "string" ? raw.trim() : "";
  return r ? roleLabel(r) : "—";
}

function posAppSubtitle(posKind?: PosKind | null): string {
  return posKind === "PRESALE" ? "Preventa" : "POS";
}

function posAppLabel(posKind?: PosKind | null): string {
  return posKind === "PRESALE" ? "KaiStore Preventa" : "KaiStore POS";
}

export default function PosTopBar({
  pointOfSaleName = null,
  companyTradeName = null,
  personName = null,
  userRole = null,
}: PosTopBarProps) {
  const [posNameFromClient, setPosNameFromClient] = useState<string | null>(null);
  const [posKindFromClient, setPosKindFromClient] = useState<PosKind | null>(null);
  useEffect(() => {
    const syncFromContext = () => {
      const parsed = readPosContextClient();
      if (!parsed) return;
      const pn = typeof parsed.pointOfSaleName === "string" ? parsed.pointOfSaleName.trim() : "";
      const bn = typeof parsed.branchName === "string" ? parsed.branchName.trim() : "";
      const label = [pn, bn].filter(Boolean).join(" — ").trim();
      setPosNameFromClient(label || null);
      setPosKindFromClient(
        parsed.posKind === "PRESALE" || parsed.posKind === "SALE" ? parsed.posKind : null,
      );
    };
    syncFromContext();
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, syncFromContext);
    return () => window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, syncFromContext);
  }, []);

  const effectivePosName = (pointOfSaleName?.trim() ? pointOfSaleName.trim() : "") || posNameFromClient || "";
  const effectiveCompany = companyTradeName?.trim() ? companyTradeName.trim() : "";
  const effectivePerson = personName?.trim() ? personName.trim() : "";
  const effectiveRole = userRole?.trim() ? roleLabel(userRole) : "";
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const title = "KaiStore";
  const subtitle = posAppSubtitle(posKindFromClient);
  const logoSrc = "/logo.png";

  const printServiceDebug =
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PRINT_SERVICE_DEBUG === "1";

  const onPrintJobFailed = useCallback((jobId: string, error: string) => {
    const isAndroid =
      typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      tryPosPrintJobBrowserFallback(jobId, error);
    }
    return false;
  }, []);

  const onPrintJobDone = useCallback((jobId: string) => {
    clearPosPrintJobBrowserFallback(jobId);
  }, []);

  const printService = usePrintServiceConnection({
    clientId: "pwa-pos",
    requiredPurposes: ["tickets", "documents"],
    appLabel: posAppLabel(posKindFromClient),
    userDisplayName: effectivePerson || undefined,
    companyName: effectiveCompany || undefined,
    pointOfSaleName: effectivePosName || undefined,
    debug: printServiceDebug,
    enableInAppNotifications: true,
    briefWsErrorMessages: true,
    onPrintJobFailed,
    onPrintJobDone,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoLoaded(false);
    setLogoError(false);
  }, [logoSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLogoLoaded(true);
    }
  }, []);

  const showContextColumn = Boolean(effectiveCompany || effectivePosName);
  const showUserColumn = Boolean(effectivePerson || effectiveRole);

  /** Layout móvil: nav inferior. Tablets POS grandes (iMin) usan desktop. */
  const sidebarNav = usePosCompactLayout();
  const headerRef = useRef<HTMLElement | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  /** Alinea `--app-topbar-height` con la altura real (subtítulo, etc.) para que la sidebar no tape el border-b. */
  useEffect(() => {
    const el = headerRef.current;
    if (!el) {
      return;
    }
    const apply = () => {
      document.documentElement.style.setProperty("--app-topbar-height", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const printServiceNav: PrintServiceNavProps = {
    connected: printService.connected,
    health: printService.health,
    visual: printService.visual,
    lastError: printService.lastError,
    attemptedWsUrl: printService.attemptedWsUrl,
    reconnect: printService.reconnect,
    notifications: printService.notifications,
    unreadCount: printService.unreadCount,
    markNotificationsRead: printService.markNotificationsRead,
    clearNotifications: printService.clearNotifications,
  };

  const isPresalePos = posKindFromClient === "PRESALE";

  const navProps: PosTopBarNavProps = {
    pathname,
    onNavigate: (path) => router.push(path),
    printService: printServiceNav,
    isPresalePos,
  };

  const userName = effectivePerson || "—";
  const roleText = userRoleLabel(effectiveRole);

  return (
    <>
    <header
      ref={headerRef}
      className="fixed top-0 z-40 w-full border-b max-[1025px]:left-0 max-[1025px]:right-0 min-[1026px]:left-0"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
      data-test-id="top-bar-root"
    >
      <div
        className={`flex items-center justify-between gap-2 py-2 ${
          sidebarNav ? "px-3" : "gap-4 px-10 pb-3"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logoSrc ? (
            <div
              className="relative h-10 w-10 shrink-0"
              data-test-id="top-bar-logo-box"
              suppressHydrationWarning
            >
              {(!logoLoaded || logoError) && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-300"
                  data-test-id="top-bar-logo-skeleton"
                  aria-hidden
                  suppressHydrationWarning
                >
                  {logoError ? <ImageOff className="text-neutral-400" size={20} /> : null}
                </div>
              )}
              {!logoError ? (
                <img
                  ref={imgRef}
                  src={logoSrc}
                  alt="Logo"
                  className="relative h-10 w-10 object-contain transition-opacity duration-300"
                  style={{ opacity: logoLoaded ? 1 : 0 }}
                  data-test-id="top-bar-logo"
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoError(true)}
                  suppressHydrationWarning
                />
              ) : null}
            </div>
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-300"
              data-test-id="top-bar-logo-placeholder"
              aria-hidden
            >
              <ImageIcon className="text-neutral-400" size={20} />
            </div>
          )}

          <div
            className={
              subtitle.trim()
                ? "flex shrink-0 flex-col gap-0 leading-none"
                : "flex min-h-10 shrink-0 items-center"
            }
          >
            <span
              className="block text-lg font-bold leading-tight tracking-tight"
              style={{ color: "var(--color-foreground)" }}
              data-test-id="top-bar-title"
            >
              {title}
            </span>
            {subtitle.trim() ? (
              <span
                className="-mt-px block text-[11px] font-normal leading-tight sm:text-xs"
                style={{ color: "var(--color-foreground)" }}
                data-test-id="top-bar-subtitle"
              >
                {subtitle}
              </span>
            ) : null}
          </div>

          {!sidebarNav && (showContextColumn || showUserColumn) ? (
            <div
              className="flex min-w-0 shrink items-center gap-5 border-l border-border pl-3"
              data-test-id="pos-topbar-right-columns"
            >
              {showContextColumn ? (
                <div
                  className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                  data-test-id="pos-topbar-context"
                  suppressHydrationWarning
                >
                  {effectiveCompany ? (
                    <span
                      className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                      style={{ color: "var(--color-foreground)" }}
                      data-test-id="pos-topbar-company-trade-name"
                      title={effectiveCompany}
                    >
                      <Building2
                        size={14}
                        className="shrink-0 text-muted"
                        aria-hidden
                        data-test-id="pos-topbar-company-icon"
                      />
                      <span className="min-w-0 truncate">{effectiveCompany}</span>
                    </span>
                  ) : null}
                  {effectivePosName ? (
                    <span
                      className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                      style={{ color: "var(--color-foreground)" }}
                      data-test-id="pos-topbar-pos-name"
                      title={effectivePosName}
                    >
                      <Store
                        size={14}
                        className="shrink-0 text-muted"
                        aria-hidden
                        data-test-id="pos-topbar-store-icon"
                      />
                      <span className="min-w-0 truncate">{effectivePosName}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showUserColumn ? (
                <div
                  className="flex min-w-0 flex-col gap-0 py-0.5 leading-none"
                  data-test-id="pos-topbar-user"
                >
                  {effectivePerson ? (
                    <span
                      className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                      style={{ color: "var(--color-foreground)" }}
                      data-test-id="pos-topbar-person-name"
                      title={effectivePerson}
                    >
                      <button
                        type="button"
                        onClick={() => setUserDialogOpen(true)}
                        className="shrink-0 rounded-sm text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Ver información de usuario"
                        data-test-id="pos-topbar-user-icon-btn"
                      >
                        <CircleUser
                          size={14}
                          aria-hidden
                          data-test-id="pos-topbar-user-icon"
                        />
                      </button>
                      <span className="min-w-0 truncate">{effectivePerson}</span>
                    </span>
                  ) : null}
                  {effectiveRole ? (
                    <span
                      className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-tight sm:text-xs"
                      style={{ color: "var(--color-foreground)" }}
                      data-test-id="pos-topbar-user-role"
                      title={effectiveRole}
                    >
                      <BadgeCheck
                        size={14}
                        className="shrink-0 text-muted"
                        aria-hidden
                        data-test-id="pos-topbar-user-role-icon"
                      />
                      <span className="min-w-0 truncate">{effectiveRole}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {sidebarNav && (effectiveCompany || effectivePosName) ? (
            <div
              className="ml-auto min-w-0 max-w-[48%] shrink-0 text-right leading-tight"
              data-test-id="pos-topbar-mobile-context"
              suppressHydrationWarning
            >
              {effectiveCompany ? (
                <p
                  className="truncate text-[10px] font-medium text-foreground sm:text-[11px]"
                  title={effectiveCompany}
                >
                  {effectiveCompany}
                </p>
              ) : null}
              {effectivePosName ? (
                <p
                  className="truncate text-[10px] text-muted-foreground sm:text-[11px]"
                  title={effectivePosName}
                >
                  {effectivePosName}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {!sidebarNav ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            <PosTopBarNav {...navProps} />
            <IconButton
              icon="Settings"
              variant={
                topBarNavIconVariant(pathnameMatchesRoute(pathname, "/settings"))
              }
              size="md"
              ariaLabel="Configuración del punto de venta"
              title="Configuración"
              aria-current={
                pathnameMatchesRoute(pathname, "/settings") ? "page" : undefined
              }
              onClick={() => router.push("/settings")}
              data-test-id="pos-topbar-settings"
            />
            <IconButton
              icon="LogOut"
              variant="text"
              size="md"
              ariaLabel="Cerrar sesión"
              onClick={() => void signOutToLogin()}
              data-test-id="pos-topbar-logout"
            />
          </div>
        ) : null}
      </div>
    </header>

    {sidebarNav ? (
      <nav
        className="fs-app-sidebar fixed inset-x-0 bottom-0 z-30 flex h-(--app-bottom-nav-height) items-center border-t px-2 pb-[env(safe-area-inset-bottom,0px)]"
        data-test-id="pos-bottom-nav"
        aria-label="Accesos rápidos"
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-1">
          <PosTopBarNav
            {...navProps}
            className="flex min-w-0 flex-1 flex-row items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
          <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-1">
            <IconButton
              icon="CircleUser"
              variant="action"
              size="md"
              ariaLabel="Ver información de usuario"
              title="Usuario"
              onClick={() => setUserDialogOpen(true)}
              data-test-id="pos-sidebar-user"
            />
            <IconButton
              icon="Settings"
              variant={
                topBarNavIconVariant(pathnameMatchesRoute(pathname, "/settings"))
              }
              size="md"
              ariaLabel="Configuración del punto de venta"
              title="Configuración"
              aria-current={
                pathnameMatchesRoute(pathname, "/settings") ? "page" : undefined
              }
              onClick={() => router.push("/settings")}
              data-test-id="pos-sidebar-settings"
            />
            <IconButton
              icon="LogOut"
              variant="action"
              size="md"
              ariaLabel="Cerrar sesión"
              title="Cerrar sesión"
              onClick={() => void signOutToLogin()}
              data-test-id="pos-sidebar-logout"
            />
          </div>
        </div>
      </nav>
    ) : null}

    <Dialog
      open={userDialogOpen}
      onClose={() => setUserDialogOpen(false)}
      title="Usuario"
      size="sm"
      scroll="body"
      data-test-id="pos-user-dialog"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={() => setUserDialogOpen(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setUserDialogOpen(false);
              setChangePasswordOpen(true);
            }}
          >
            Cambiar contraseña
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md border border-border bg-muted/15 px-3 py-2">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="mt-0.5 font-medium text-foreground">{effectiveCompany || "—"}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/15 px-3 py-2">
          <p className="text-xs text-muted-foreground">Punto de venta</p>
          <p className="mt-0.5 font-medium text-foreground">{effectivePosName || "—"}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/15 px-3 py-2">
          <p className="text-xs text-muted-foreground">Usuario</p>
          <p className="mt-0.5 font-medium text-foreground">{userName}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/15 px-3 py-2">
          <p className="text-xs text-muted-foreground">Rol</p>
          <p className="mt-0.5 font-medium text-foreground">{roleText}</p>
        </div>
      </div>
    </Dialog>

    <ChangePasswordDialog isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
