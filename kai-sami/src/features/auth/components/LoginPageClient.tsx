"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Alert, Button, IconButton, TextField } from "@kai/ui";
import LoginPageShell from "@/shared/components/LoginPageShell";
import { validateLoginInput } from "../application/login.usecase";
import {
  readSamiCompany,
  type SamiCompanyConfig,
} from "@/features/company/storage/sami-company-storage";
import { getKaiProductLabel } from "@/config/product-brand.config";

const PRODUCT_LABEL = getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT);

export default function LoginPageClient() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<SamiCompanyConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCompany(readSamiCompany());
    setHydrated(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
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
        companyId: company.id,
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
      router.push("/chat");
    } catch {
      setError("No se pudo iniciar sesión. Revisá que NEXTAUTH_SECRET esté configurado.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return <LoginPageShell><div className="flex flex-1" /></LoginPageShell>;
  }

  if (!company) {
    return (
      <LoginPageShell>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-lg font-semibold">SaMI no configurado</h1>
          <p className="text-sm text-muted-foreground">
            Elegí la empresa de este dispositivo antes de iniciar sesión.
          </p>
          <Button type="button" onClick={() => router.push("/setup")}>
            Configurar empresa
          </Button>
        </div>
      </LoginPageShell>
    );
  }

  const companyLabel = company.nombreFantasia?.trim() || company.razonSocial.trim();

  return (
    <LoginPageShell>
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <img src="/logo.png" alt="" className="mx-auto h-16 w-16 object-contain" />
            <div className="mt-2 text-xl font-bold">{PRODUCT_LABEL}</div>
            <div className="text-xs text-muted-foreground">SaMI</div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {companyLabel}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error ? <Alert variant="error">{error}</Alert> : null}
            <TextField
              label="Usuario"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              autoComplete="username"
              required
              disabled={submitting}
            />
            <TextField
              label="Contraseña"
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
      </div>
      <IconButton
        icon="Settings"
        variant="action"
        size="md"
        className="fixed bottom-4 right-4 z-40"
        onClick={() => router.push("/setup")}
        ariaLabel="Configurar empresa"
      />
    </LoginPageShell>
  );
}
