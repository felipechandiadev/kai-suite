"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { Button, IconButton, TextField } from "@kai/ui";
import { getPublicCompaniesAction } from "@/features/companies/actions/public-companies.action";
import type { PublicCompany } from "@/features/companies/infrastructure/public-companies.request";
import {
  readAdminLoginContext,
  writeAdminLoginContext,
  type AdminLoginContextPreference,
} from "@/features/companies/storage/admin-login-context-storage";
import { getKaiProductLabel } from "@/config/product-brand.config";

const POST_LOGIN_PATH = "/dashboard";
const PRODUCT_LABEL = getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT);

function companyLabel(c: PublicCompany): string {
  return c.nombreFantasia?.trim() || c.razonSocial.trim() || "Empresa";
}

function resolveDefaultCompanyPref(
  list: PublicCompany[],
  stored: AdminLoginContextPreference | null,
): AdminLoginContextPreference | null {
  if (list.length === 0) return null;
  if (
    stored?.kind === "company" &&
    list.some((c) => c.id === stored.companyId)
  ) {
    return stored;
  }
  // Primera creada (listado público ordenado por createdAt ASC).
  return { kind: "company", companyId: list[0].id };
}

export default function LoginPage() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminLoginContextPreference | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const gearRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    const stored = readAdminLoginContext();
    setHydrated(true);
    void getPublicCompaniesAction().then((res) => {
      if (res.success) {
        setCompanies(res.companies);
        setCompaniesError(null);
        const pref = resolveDefaultCompanyPref(res.companies, stored);
        if (pref) {
          writeAdminLoginContext(pref);
          setSelected(pref);
        }
      } else {
        setCompanies([]);
        setCompaniesError(res.error);
      }
    });
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(POST_LOGIN_PATH);
    }
  }, [status, router]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!gearRef.current) return;
      if (!gearRef.current.contains(e.target as Node)) {
        setGearOpen(false);
      }
    }
    if (gearOpen) {
      window.addEventListener("mousedown", onClick);
    }
    return () => window.removeEventListener("mousedown", onClick);
  }, [gearOpen]);

  const contextLabel = useMemo(() => {
    if (selected?.kind === "company") {
      const c = companies.find((x) => x.id === selected.companyId);
      if (c) return companyLabel(c);
      return "Empresa seleccionada";
    }
    return null;
  }, [selected, companies]);

  function pickContext(pref: Extract<AdminLoginContextPreference, { kind: "company" }>) {
    writeAdminLoginContext(pref);
    setSelected(pref);
    setGearOpen(false);
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let pref = selected ?? readAdminLoginContext();
    if (!pref || pref.kind !== "company") {
      const fallback = resolveDefaultCompanyPref(companies, null);
      if (!fallback) {
        setError("No hay empresas disponibles");
        setGearOpen(true);
        return;
      }
      pref = fallback;
      writeAdminLoginContext(pref);
      setSelected(pref);
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        userName,
        password,
        companyId: pref.companyId,
        redirect: false,
      });

      if (result?.error) {
        const msg = result.error;
        setError(
          msg === "CredentialsSignin"
            ? "Credenciales inválidas o sin acceso a la empresa elegida"
            : msg,
        );
        return;
      }

      writeAdminLoginContext(pref);
      router.push(POST_LOGIN_PATH);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || status === "loading" || status === "authenticated") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        data-test-id="login-session-redirect"
      />
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
      data-test-id="login-root"
    >
      <div className="w-full max-w-md rounded-xl border border-border/70 bg-background/80 p-8 shadow-lg backdrop-blur-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt={PRODUCT_LABEL}
            className="h-20 w-20 object-contain"
          />
          <div className="mt-3 flex flex-col gap-0 leading-none">
            <span className="block text-2xl font-bold leading-tight tracking-tight text-foreground">
              {PRODUCT_LABEL}
            </span>
            <span className="-mt-px block text-[11px] font-normal leading-tight text-muted-foreground sm:text-xs">
              Administración
            </span>
          </div>
          {contextLabel ? (
            <p
              className="mt-3 flex max-w-full items-center justify-center gap-1.5 text-sm font-medium text-foreground"
              data-test-id="login-company-label"
            >
              <Building2
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="truncate" title={contextLabel}>
                {contextLabel}
              </span>
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <TextField
              label="Usuario"
              name="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nombre de usuario"
              required
              disabled={submitting}
              autoComplete="username"
              className="w-full"
            />
          </div>
          <div className="mb-6">
            <TextField
              label="Contraseña"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
              disabled={submitting}
              autoComplete="current-password"
              className="w-full"
            />
          </div>
          {error ? (
            <p className="mb-4 text-sm text-red-500" data-test-id="login-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={submitting}>
            Iniciar Sesión
          </Button>
        </form>
      </div>

      <div className="fixed bottom-4 right-4 z-40" ref={gearRef}>
        {gearOpen ? (
          <div
            className="absolute bottom-14 right-0 mb-1 min-w-56 overflow-hidden rounded-md border border-border bg-background shadow-lg"
            role="listbox"
            data-test-id="login-company-gear-dropdown"
          >
            <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Empresa
            </div>
            {companiesError ? (
              <p className="px-3 py-2 text-sm text-error">{companiesError}</p>
            ) : null}
            <ul className="max-h-72 overflow-y-auto py-1">
              {companies.map((c) => {
                const isActive =
                  selected?.kind === "company" && selected.companyId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() =>
                        pickContext({ kind: "company", companyId: c.id })
                      }
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted/10 ${
                        isActive
                          ? "font-semibold text-foreground"
                          : "text-foreground"
                      }`}
                      data-test-id={`login-pick-company-${c.id}`}
                    >
                      <span className="min-w-0 truncate">{companyLabel(c)}</span>
                      {isActive ? (
                        <Check
                          size={14}
                          className="shrink-0 text-secondary"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <IconButton
          icon="Settings"
          variant="action"
          size="md"
          className="rounded-full border border-border bg-background shadow-sm"
          onClick={() => setGearOpen((v) => !v)}
          ariaLabel="Elegir empresa"
          title="Elegir empresa"
          data-test-id="login-company-gear"
          disabled={submitting}
        />
      </div>
    </div>
  );
}
