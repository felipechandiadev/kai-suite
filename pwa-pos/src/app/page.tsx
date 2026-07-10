"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Store } from "lucide-react";
import { Button, IconButton, TextField } from "@kai/ui";
import {
  readPosCompany,
  type PosCompanyConfig,
} from "@/features/company/storage/pos-company-storage";
import { usePosTabletDensity } from "@/shared/hooks/usePosTabletDensity";

const POST_LOGIN_PATH = "/session-setup";

export default function LoginPage() {
  usePosTabletDensity();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posCompany, setPosCompany] = useState<PosCompanyConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    setPosCompany(readPosCompany());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace(POST_LOGIN_PATH);
    }
  }, [sessionStatus, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posCompany) return;
    setError("");
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        userName,
        password,
        companyId: posCompany.id,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Credenciales inválidas"
            : result.error,
        );
        return;
      }

      router.push(POST_LOGIN_PATH);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || sessionStatus === "loading" || sessionStatus === "authenticated") {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background px-6"
        data-test-id={
          sessionStatus === "authenticated" ? "login-session-redirect" : "login-loading"
        }
      />
    );
  }

  // POS sin configurar: bloqueo el formulario para forzar la elección de
  // empresa en /setup. Es una decisión deliberada: sin companyId, el backend
  // multitenant no podría servir productos/clientes/etc.
  if (!posCompany) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background px-6"
        data-test-id="login-unconfigured-root"
      >
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-md">
          <div className="mb-4 flex items-center gap-3 text-gray-700">
            <Store className="h-6 w-6 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
            <h1 className="text-xl font-bold">POS no configurado</h1>
          </div>
          <p className="mb-6 text-sm text-gray-600">
            Este punto de venta no está conectado a ninguna empresa. Configura
            la empresa antes de iniciar sesión.
          </p>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => router.push("/setup")}
            data-test-id="login-configure-button"
          >
            Configurar POS
          </Button>
        </div>
      </div>
    );
  }

  const companyLabel =
    posCompany.nombreFantasia?.trim() || posCompany.razonSocial.trim();

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-6"
      data-test-id="login-root"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="KaiStore"
            className="h-20 w-20 object-contain"
          />
          <div className="mt-3 flex w-full max-w-full flex-col items-center gap-0 leading-none">
            <span className="block text-2xl font-bold leading-tight tracking-tight text-foreground">
              KaiStore
            </span>
            <span className="-mt-px block text-[11px] font-normal leading-tight text-muted-foreground sm:text-xs">
              POS
            </span>
            <p
              className="mt-3 flex max-w-full items-center justify-center gap-1.5 text-sm font-medium text-foreground"
              data-test-id="login-company-label"
            >
              <Building2
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="truncate" title={companyLabel}>
                {companyLabel}
              </span>
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <TextField
              label="Usuario"
              name="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder=""
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
              placeholder=""
              required
              disabled={submitting}
              autoComplete="current-password"
              className="w-full"
            />
          </div>
          {error ? (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-red-500">{error}</p>
              {error.toLowerCase().includes("empresa") ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push("/setup")}
                  disabled={submitting}
                >
                  Cambiar empresa del POS
                </Button>
              ) : null}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            loading={submitting}
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>

      <IconButton
        icon="Settings"
        variant="action"
        size="md"
        className="fixed bottom-4 right-4 z-10 rounded-full border border-border bg-background shadow-sm"
        onClick={() => router.push("/setup")}
        ariaLabel="Configurar POS"
        title="Configurar POS"
        data-test-id="login-setup-button"
        disabled={submitting}
      />
    </div>
  );
}
