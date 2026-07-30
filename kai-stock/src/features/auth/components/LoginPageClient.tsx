"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Warehouse } from "lucide-react";
import { Alert, Button, IconButton, TextField } from "@kai/ui";
import LoginPageShell from "@/shared/components/LoginPageShell/LoginPageShell";
import { validateLoginInput } from "../application/login.usecase";
import {
  readStockCompany,
  type StockCompanyConfig,
} from "@/features/company/storage/stock-company-storage";

function postLoginPath(): string {
  if (typeof window === "undefined") return "/scan";
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/scan";
}

function LoginPaperCard({ children }: { children: React.ReactNode }) {
  return <div className="w-full bg-background">{children}</div>;
}

export default function LoginPageClient() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stockCompany, setStockCompany] = useState<StockCompanyConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStockCompany(readStockCompany());
    setHydrated(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCompany) return;
    setError("");
    const validated = validateLoginInput({ userName, password });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        userName: validated.data.userName,
        password: validated.data.password,
        companyId: stockCompany.id,
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError(
          result?.error === "CredentialsSignin"
            ? "Credenciales inválidas"
            : result?.error || "No se pudo iniciar sesión",
        );
        return;
      }
      router.push(postLoginPath());
    } finally {
      setSubmitting(false);
    }
  };

  const settingsButton = (
    <IconButton
      icon="Settings"
      variant="action"
      size="md"
      className="fixed bottom-4 right-4 z-40 rounded-full border border-border bg-surface"
      onClick={() => router.push("/setup")}
      ariaLabel="Configurar empresa"
      data-test-id="login-setup-button"
      disabled={submitting}
    />
  );

  if (!hydrated) {
    return (
      <LoginPageShell>
        <div className="flex flex-1 items-center justify-center py-12" data-test-id="login-loading" />
      </LoginPageShell>
    );
  }

  if (!stockCompany) {
    return (
      <LoginPageShell>
        <div className="flex flex-1 flex-col justify-center py-2">
          <LoginPaperCard>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <Warehouse className="h-6 w-6 shrink-0 text-secondary" aria-hidden />
                <h1 className="text-lg font-semibold">StockControl no configurado</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Este dispositivo no está conectado a ninguna empresa. Configura la empresa
                antes de iniciar sesión.
              </p>
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => router.push("/setup")}
                data-test-id="login-configure-button"
              >
                Configurar empresa
              </Button>
            </div>
          </LoginPaperCard>
        </div>
        {settingsButton}
      </LoginPageShell>
    );
  }

  const companyLabel =
    stockCompany.nombreFantasia?.trim() || stockCompany.razonSocial.trim();

  return (
    <LoginPageShell>
      <div className="flex flex-1 flex-col justify-center py-2">
        <LoginPaperCard>
          <div className="flex flex-col gap-6" data-test-id="login-root">
            <div className="text-center">
              <img
                src="/logo.png"
                alt="KaiStore"
                className="mx-auto h-16 w-16 object-contain"
              />
              <div className="mt-2 flex flex-col leading-none">
                <span className="text-xl font-bold tracking-tight">KaiStore</span>
                <span className="text-xs text-muted-foreground">StockControl</span>
              </div>
              <p
                className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium"
                data-test-id="login-company-label"
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate" title={companyLabel}>
                  {companyLabel}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error ? <Alert variant="error">{error}</Alert> : null}
              <TextField
                label="Usuario"
                placeholder="Ingresá tu usuario"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoComplete="username"
                required
                disabled={submitting}
              />
              <TextField
                label="Contraseña"
                placeholder="Ingresá tu contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
              <Button type="submit" loading={submitting} disabled={submitting} className="w-full">
                Iniciar sesión
              </Button>
            </form>
          </div>
        </LoginPaperCard>
      </div>
      {settingsButton}
    </LoginPageShell>
  );
}
