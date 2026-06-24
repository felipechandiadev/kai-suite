"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import {
  checkUsernameAvailabilityAction,
  registerCustomerAction,
} from "@/features/e-shop-customer-account/actions/customer-account.action";
import { StorePageShell } from "@/shared/components/StorePageShell";
import { chilePhoneTextFieldProps } from "@/shared/lib/chile-phone-field";
import { eshopUsernameTextFieldProps } from "@/shared/lib/eshop-username-field";

const MIN_PASSWORD_LENGTH = 8;

type Props = {
  requireRut?: boolean;
  initialEmail?: string;
};

export function RegistroForm({ requireRut = false, initialEmail = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cuenta";
  const loginHref = `/cuenta/login?next=${encodeURIComponent(next)}`;
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verifyUsername() {
    const raw = username.trim();
    if (!raw) {
      setUsernameError("El nombre de usuario es obligatorio");
      return false;
    }
    setUsernameChecking(true);
    setUsernameError(null);
    const result = await checkUsernameAvailabilityAction(raw);
    setUsernameChecking(false);
    if (!result.success || !result.available) {
      setUsernameError(result.message ?? "Este nombre de usuario ya está en uso");
      return false;
    }
    return true;
  }

  return (
    <StorePageShell>
      <h1 className="mb-6 text-2xl font-semibold">Crear cuenta</h1>
      <div className="mx-auto max-w-md space-y-4">
        <TextField
          label="Nombre de usuario"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError(null);
          }}
          onBlur={() => {
            if (username.trim()) void verifyUsername();
          }}
          required
          {...eshopUsernameTextFieldProps}
        />
        {usernameChecking ? (
          <p className="text-xs text-muted-foreground">Verificando disponibilidad…</p>
        ) : null}
        {usernameError ? <p className="text-sm text-destructive">{usernameError}</p> : null}
        <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <TextField
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          {...chilePhoneTextFieldProps}
        />
        {requireRut ? (
          <TextField
            label="RUT"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            helperText="Obligatorio para registrarse en esta tienda."
          />
        ) : (
          <TextField
            label="RUT (opcional)"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
        )}
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          helperText={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          variant="primary"
          className="w-full"
          disabled={busy || usernameChecking}
          onClick={() => {
            if (password.length < MIN_PASSWORD_LENGTH) {
              setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
              return;
            }
            if (!firstName.trim() || !email.trim()) {
              setError("Nombre y correo son obligatorios");
              return;
            }
            setBusy(true);
            setError(null);
            void verifyUsername().then((usernameOk) => {
              if (!usernameOk) {
                setBusy(false);
                return;
              }
              void registerCustomerAction({
                username,
                firstName,
                lastName,
                email,
                phone,
                password,
                documentNumber: documentNumber || undefined,
              })
                .then((r) => {
                  if (r.success) {
                    if (r.emailVerificationRequired) {
                      router.push("/cuenta/verificacion-pendiente");
                    } else {
                      router.push(next);
                    }
                  } else {
                    setError(r.error);
                  }
                })
                .finally(() => setBusy(false));
            });
          }}
        >
          Registrarme
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href={loginHref} className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </StorePageShell>
  );
}
