"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { switchCompanyAction } from "../actions/companies.action";
import type { CompanyOption } from "../types/company.types";

interface CompanySwitcherProps {
  /** Si se quiere forzar el listado (para testing). Si no, se toma de la session. */
  fallbackCompanies?: CompanyOption[];
  /**
   * ADMIN: si la sesión aún no trae `companies` pero el layout resolvió la empresa (RSC),
   * mostrar este nombre hasta el próximo login con payload completo.
   */
  fallbackCompanyLabel?: string | null;
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  fallbackCompanies,
  fallbackCompanyLabel,
}) => {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  const role = (session?.user as { role?: string | null })?.role ?? null;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const sessionCompanies = (session?.user as { companies?: CompanyOption[] | null })?.companies;

  const companies = useMemo<CompanyOption[]>(() => {
    if (Array.isArray(sessionCompanies) && sessionCompanies.length > 0) {
      return sessionCompanies;
    }
    return Array.isArray(fallbackCompanies) ? fallbackCompanies : [];
  }, [sessionCompanies, fallbackCompanies]);

  const isSuperAdmin = role === "SUPER_ADMIN";

  const resolvedCompanies = useMemo<CompanyOption[]>(() => {
    if (companies.length > 0) {
      return companies;
    }
    if (isSuperAdmin) {
      return [];
    }
    const fb = typeof fallbackCompanyLabel === "string" ? fallbackCompanyLabel.trim() : "";
    if (!fb || !session?.user) {
      return [];
    }
    const cid =
      (typeof activeCompanyId === "string" && activeCompanyId.trim() !== ""
        ? activeCompanyId
        : null) ??
      (session.user as { companyId?: string | null }).companyId ??
      "";
    return [{ id: cid, razonSocial: fb, nombreFantasia: null }];
  }, [companies, isSuperAdmin, fallbackCompanyLabel, session, activeCompanyId]);

  const activeCompany = useMemo<CompanyOption | null>(() => {
    if (!activeCompanyId) {
      return null;
    }
    return resolvedCompanies.find((c) => c.id === activeCompanyId) ?? null;
  }, [resolvedCompanies, activeCompanyId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", onClick);
      return () => window.removeEventListener("mousedown", onClick);
    }
    return undefined;
  }, [open]);

  if (!session?.user) return null;
  if (resolvedCompanies.length === 0) return null;

  const label =
    activeCompany?.nombreFantasia?.trim() ||
    activeCompany?.razonSocial?.trim() ||
    "Sin empresa";

  // Solo SUPER_ADMIN ve el switcher (puede operar varias empresas).
  // ADMIN/OPERATOR están fijos a una empresa: solo muestran el nombre.
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        <Building2 size={14} className="text-muted-foreground" aria-hidden />
        <span className="truncate font-semibold" title={label}>
          {label}
        </span>
      </div>
    );
  }

  function handleSelect(companyId: string) {
    if (companyId === activeCompanyId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchCompanyAction(companyId);
      if (res.success) {
        await update({ activeCompanyId: res.activeCompanyId });
        setOpen(false);
        router.refresh();
      } else {
        alert(`Error al cambiar de empresa: ${res.error}`);
      }
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground transition hover:border-secondary disabled:opacity-60"
        disabled={pending}
        data-test-id="company-switcher-button"
      >
        <Building2 size={14} className="text-muted-foreground" aria-hidden />
        <span className="max-w-[10rem] truncate" title={label}>
          {label}
        </span>
        <ChevronDown size={14} className="text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[14rem] overflow-hidden rounded-md border border-border bg-background shadow-lg"
          role="listbox"
          data-test-id="company-switcher-dropdown"
        >
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cambiar empresa
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {resolvedCompanies.map((c) => {
              const isActive = c.id === activeCompanyId;
              const optionLabel = c.nombreFantasia?.trim() || c.razonSocial.trim();
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/10 ${
                      isActive ? "font-semibold text-foreground" : "text-foreground"
                    }`}
                  >
                    <span className="min-w-0 truncate">{optionLabel}</span>
                    {isActive ? (
                      <Check size={14} className="shrink-0 text-secondary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default CompanySwitcher;
