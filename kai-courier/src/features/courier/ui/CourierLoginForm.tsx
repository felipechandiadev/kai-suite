"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@kai/ui";
import { courierLoginAction } from "@/features/courier/actions/courier.action";
import { saveCourierSession } from "@/lib/courier-session";

export function CourierLoginForm() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        void courierLoginAction({
          userName,
          password,
          companyId: companyId || undefined,
        })
          .then((session) => {
            saveCourierSession({
              userId: session.userId,
              companyId: session.companyId,
              userName: session.userName,
              displayName: session.displayName,
              email: session.email,
            });
            router.replace("/hoy");
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Error de acceso"))
          .finally(() => setBusy(false));
      }}
    >
      <h1 className="text-xl font-semibold">Kai Courier</h1>
      <TextField label="Usuario" value={userName} onChange={(e) => setUserName(e.target.value)} required />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <TextField
        label="Empresa (opcional)"
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        helperText="UUID de empresa si aplica"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy} className="min-h-[44px]">
        {busy ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
