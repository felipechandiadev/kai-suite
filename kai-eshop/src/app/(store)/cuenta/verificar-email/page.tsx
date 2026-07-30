"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmailAction } from "@/features/e-shop-customer-account/actions/customer-account.action";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default function VerificarEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    void verifyEmailAction(token).then((r) => {
      if (r.success) {
        setStatus("ok");
        setMessage("Correo verificado correctamente.");
      } else {
        setStatus("error");
        setMessage(r.error);
      }
    });
  }, [token]);

  return (
    <StorePageShell>
      <h1 className="mb-6 text-2xl font-semibold">Verificar correo</h1>
      <div className="mx-auto max-w-md space-y-4 text-center">
        {!token ? <p className="text-sm text-muted-foreground">Enlace inválido.</p> : null}
        {status === "idle" && token ? <p className="text-sm">Verificando…</p> : null}
        {status === "ok" ? <p className="text-sm text-success">{message}</p> : null}
        {status === "error" ? <p className="text-sm text-destructive">{message}</p> : null}
        <Link href="/cuenta" className="text-sm text-primary hover:underline">
          Ir a Mi cuenta
        </Link>
      </div>
    </StorePageShell>
  );
}
