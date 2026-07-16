"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Truck } from "lucide-react";
import { Button, IconButton, TextField } from "@kai/ui";
import { courierLoginAction } from "@/features/courier/actions/courier.action";
import {
  readDeliveryCompany,
  type DeliveryCompanyConfig,
} from "@/features/company/storage/delivery-company-storage";
import { loadCourierSession, saveCourierSession } from "@/lib/courier-session";

const POST_LOGIN_PATH = "/repartos";

export function CourierLoginForm() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [deliveryCompany, setDeliveryCompany] =
    useState<DeliveryCompanyConfig | null>(null);

  useEffect(() => {
    const session = loadCourierSession();
    setDeliveryCompany(readDeliveryCompany());
    setHasSession(Boolean(session));
    setHydrated(true);
    if (session) {
      router.replace(POST_LOGIN_PATH);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryCompany) return;
    setError("");
    setSubmitting(true);

    try {
      const session = await courierLoginAction({
        userName,
        password,
        companyId: deliveryCompany.id,
      });
      saveCourierSession({
        userId: session.userId,
        companyId: session.companyId,
        userName: session.userName,
        displayName: session.displayName,
        email: session.email,
      });
      router.push(POST_LOGIN_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciales inválidas");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || hasSession) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        data-test-id={hasSession ? "login-session-redirect" : "login-loading"}
      />
    );
  }

  if (!deliveryCompany) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        data-test-id="login-unconfigured-root"
      >
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-background/80 p-8 shadow-lg backdrop-blur-md">
          <div className="mb-4 flex items-center gap-3">
            <Truck className="h-6 w-6 shrink-0 text-secondary" aria-hidden />
            <h1 className="text-lg font-semibold">Delivery no configurado</h1>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Este dispositivo no está conectado a ninguna empresa. Configura la
            empresa antes de iniciar sesión.
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
        <IconButton
          icon="Settings"
          variant="action"
          size="md"
          className="fixed bottom-4 right-4 z-40 rounded-full border border-border bg-surface"
          onClick={() => router.push("/setup")}
          ariaLabel="Configurar empresa"
          data-test-id="login-setup-button"
        />
      </div>
    );
  }

  const companyLabel =
    deliveryCompany.nombreFantasia?.trim() || deliveryCompany.razonSocial.trim();

  return (
    <div className="flex min-h-screen items-center justify-center p-4" data-test-id="login-root">
      <div className="w-full max-w-md rounded-xl border border-border/70 bg-background/80 p-8 shadow-lg backdrop-blur-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.png" alt="KaiStore" className="h-20 w-20 object-contain" />
          <div className="mt-3 flex flex-col gap-0 leading-none">
            <span className="block text-2xl font-bold leading-tight tracking-tight text-foreground">
              KaiStore
            </span>
            <span className="-mt-px block text-[11px] font-normal leading-tight text-muted-foreground sm:text-xs">
              Delivery
            </span>
          </div>
          <p
            className="mt-3 flex max-w-full items-center justify-center gap-1.5 text-sm font-medium text-foreground"
            data-test-id="login-company-label"
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate" title={companyLabel}>
              {companyLabel}
            </span>
          </p>
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
                  Cambiar empresa
                </Button>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" className="w-full" loading={submitting}>
            Iniciar Sesión
          </Button>
        </form>
      </div>
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
    </div>
  );
}
