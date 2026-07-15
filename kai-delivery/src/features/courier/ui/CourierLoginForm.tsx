"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@kai/ui";
import { courierLoginAction } from "@/features/courier/actions/courier.action";
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

  useEffect(() => {
    const session = loadCourierSession();
    setHasSession(Boolean(session));
    setHydrated(true);
    if (session) {
      router.replace(POST_LOGIN_PATH);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const session = await courierLoginAction({ userName, password });
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
          {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}
          <Button type="submit" className="w-full" loading={submitting}>
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
