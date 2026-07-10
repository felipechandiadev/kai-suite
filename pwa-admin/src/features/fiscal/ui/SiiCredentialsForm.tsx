"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { FiscalProfile } from "../types/fiscal.types";
import {
  deleteFiscalCertificateAction,
  testFiscalSiiTokenAction,
  uploadFiscalCertificateAction,
} from "../actions/fiscal.actions";

type Props = {
  profile: FiscalProfile;
};

export function SiiCredentialsForm({ profile }: Props) {
  const router = useRouter();
  const certInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadCert() {
    const file = certInputRef.current?.files?.[0];
    if (!file || !password) {
      setError("Seleccione archivo .pfx e ingrese contraseña");
      return;
    }
    setBusy("cert");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("password", password);
    const res = await uploadFiscalCertificateAction(fd);
    setBusy("");
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Certificado cargado correctamente");
    setPassword("");
    router.refresh();
  }

  async function removeCert() {
    setBusy("del");
    setError("");
    const res = await deleteFiscalCertificateAction();
    setBusy("");
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Certificado eliminado");
    router.refresh();
  }

  async function testToken() {
    setBusy("token");
    setError("");
    setMessage("");
    const res = await testFiscalSiiTokenAction();
    setBusy("");
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage(`Token SII obtenido (${res.tokenPreview})`);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">Certificado digital (.pfx)</h2>
        <p className="text-sm text-muted-foreground">
          Estado:{" "}
          {profile.hasCertificate
            ? `Cargado${profile.certificateExpiresAt ? ` · vence ${new Date(profile.certificateExpiresAt).toLocaleDateString("es-CL")}` : ""}`
            : "No cargado"}
        </p>
        <input ref={certInputRef} type="file" accept=".pfx,.p12" className="text-sm" />
        <TextField
          label="Contraseña del certificado"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={uploadCert} disabled={busy !== ""}>
            {busy === "cert" ? "Subiendo…" : "Subir certificado"}
          </Button>
          {profile.hasCertificate ? (
            <Button variant="secondary" onClick={removeCert} disabled={busy !== ""}>
              Eliminar
            </Button>
          ) : null}
          <Button variant="secondary" onClick={testToken} disabled={busy !== "" || !profile.hasCertificate}>
            {busy === "token" ? "Probando…" : "Probar token SII"}
          </Button>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        Los archivos CAF (folios boleta 39) se gestionan en{" "}
        <Link href="/settings/sii/folios" className="font-medium text-primary underline-offset-2 hover:underline">
          SII → Folios
        </Link>
        .
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
