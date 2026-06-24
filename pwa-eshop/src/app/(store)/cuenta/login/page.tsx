"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import { loginCustomerAction } from "@/features/e-shop-customer-account/actions/customer-account.action";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cuenta";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <StorePageShell>
      <h1 className="mb-6 text-2xl font-semibold">Iniciar sesión</h1>
      <div className="mx-auto max-w-md space-y-4">
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            void loginCustomerAction({ email, password })
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
          <Link href="/registro" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </StorePageShell>
  );
}
