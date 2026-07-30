"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, TextField } from "@kai/ui";
import { loginCustomerAction } from "@/features/e-shop-customer-account/actions/customer-account.action";

type LoginFormProps = {
  initialEmail?: string;
};

export function LoginForm({ initialEmail = "" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cuenta";
  const registerHref = `/registro?next=${encodeURIComponent(next)}`;
  const [login, setLogin] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <TextField
        label="Correo o usuario"
        type="text"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoComplete="username"
        placeholder="tu@correo.com o nombre de usuario"
        required
        helperText="Puedes usar tu correo o tu nombre de usuario (sin @)."
      />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        placeholder="Ingresa tu contraseña"
        required
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        variant="primary"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void loginCustomerAction({ login, password })
            .then((r) => {
              if (r.success) router.push(next);
              else setError(r.error);
            })
            .finally(() => setBusy(false));
        }}
      >
        Entrar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href={registerHref} className="text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
