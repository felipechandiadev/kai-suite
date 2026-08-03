"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { switchCompanyAction } from "../actions/companies.action";
import type { CompanyOption } from "../types/company.types";

interface CompanySwitcherProps {
  fallbackCompanies?: CompanyOption[];
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

  const role = session?.user?.role ?? null;
  const activeCompanyId = session?.user?.activeCompanyId;
  const multiCompanyMode = !!session?.user?.multiCompanyMode;
  const memberships = session?.user?.memberships ?? [];
  const sessionCompanies = session?.user?.companies;

  const companies = useMemo<CompanyOption[]>(() => {
    if (Array.isArray(sessionCompanies) && sessionCompanies.length > 0) {
      return sessionCompanies;
    }
    return Array.isArray(fallbackCompanies) ? fallbackCompanies : [];
  }, [sessionCompanies, fallbackCompanies]);

  const isSuperAdmin = role === "SUPER_ADMIN";
  const canSwitch =
    isSuperAdmin ||
    companies.length > 1 ||
    (memberships.some((m) => m.roles.includes("ADMIN")) &&
      companies.length >= 2);

  const resolvedCompanies = useMemo<CompanyOption[]>(() => {
    if (companies.length > 0) {
      return companies;
    }
    if (isSuperAdmin) {
      return [];
    }
    const fb =
      typeof fallbackCompanyLabel === "string"
        ? fallbackCompanyLabel.trim()
        : "";
    if (!fb || !session?.user) {
      return [];
    }
    const cid =
      (typeof activeCompanyId === "string" && activeCompanyId.trim() !== ""
        ? activeCompanyId
        : null) ??
      session.user.companyId ??
      "";
    return [{ id: cid, razonSocial: fb, nombreFantasia: null }];
  }, [companies, isSuperAdmin, fallbackCompanyLabel, session, activeCompanyId]);

  const activeCompany = useMemo<CompanyOption | null>(() => {
    if (!activeCompanyId) {
      return null;
    }
    return resolvedCompanies.find((c) => c.id === activeCompanyId) ?? null;
  }, [resolvedCompanies, activeCompanyId]);

  // Si quedó multiCompanyMode (login antiguo), salir a la 1.ª empresa.
  useEffect(() => {
    if (!multiCompanyMode) return;
    const first = resolvedCompanies[0];
    if (!first?.id) return;
    startTransition(async () => {
      const res = await switchCompanyAction(first.id);
      if (res.success) {
        await update({
          activeCompanyId: res.activeCompanyId,
          multiCompanyMode: false,
        });
        router.refresh();
      }
    });
  }, [multiCompanyMode, resolvedCompanies, update, router]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", onClick);
    }
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!session?.user) return null;
  if (resolvedCompanies.length === 0) return null;

  const label =
    activeCompany?.nombreFantasia?.trim() ||
    activeCompany?.razonSocial?.trim() ||
    (multiCompanyMode ? "Cargando…" : "Sin empresa");

  if (!canSwitch) {
    return (
      <div className="hidden items-center gap-1.5 text-sm text-foreground md:flex">
        <Building2 size={14} className="text-muted-foreground" aria-hidden />
        <span className="truncate font-semibold" title={label}>
          {label}
        </span>
      </div>
    );
  }

  function handleSelect(companyId: string) {
    if (companyId === activeCompanyId && !multiCompanyMode) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchCompanyAction(companyId);
      if (res.success) {
        await update({
          activeCompanyId: res.activeCompanyId,
          multiCompanyMode: false,
        });
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
          className="absolute right-0 z-50 mt-1 min-w-56 overflow-hidden rounded-md border border-border bg-background shadow-lg"
          role="listbox"
          data-test-id="company-switcher-dropdown"
        >
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Empresa activa
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {resolvedCompanies.map((c) => {
              const isActive = !multiCompanyMode && c.id === activeCompanyId;
              const optionLabel =
                c.nombreFantasia?.trim() || c.razonSocial.trim();
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/10 ${
                      isActive
                        ? "font-semibold text-foreground"
                        : "text-foreground"
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
