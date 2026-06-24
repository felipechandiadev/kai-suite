"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import { registerCustomerAction } from "@/features/e-shop-customer-account/actions/customer-account.action";
import { StorePageShell } from "@/shared/components/StorePageShell";

type Props = {
  requireRut?: boolean;
};

export default function RegistroPage({ requireRut = false }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <StorePageShell>
      <h1 className="mb-6 text-2xl font-semibold">Crear cuenta</h1>
      <div className="mx-auto max-w-md space-y-4">
        <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            void registerCustomerAction({
              firstName,
              lastName,
              email,
              phone,
              password,
              documentNumber: documentNumber || undefined,
            })
              .then((r) => {
                if (r.success) router.push("/cuenta");
                else setError(r.error);
              })
              .finally(() => setBusy(false));
          }}
        >
          Registrarme
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/cuenta/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </StorePageShell>
  );
}
