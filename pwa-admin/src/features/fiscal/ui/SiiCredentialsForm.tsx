"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import type { FiscalCafItem, FiscalProfile } from "../types/fiscal.types";
import {
  deleteFiscalCertificateAction,
  testFiscalSiiTokenAction,
  uploadFiscalCafAction,
  uploadFiscalCertificateAction,
} from "../actions/fiscal.actions";

type Props = {
  profile: FiscalProfile;
  cafs: FiscalCafItem[];
};

export function SiiCredentialsForm({ profile, cafs }: Props) {
  const router = useRouter();
  const certInputRef = useRef<HTMLInputElement>(null);
  const cafInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [cafEnv, setCafEnv] = useState<"certification" | "production">("certification");
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

  async function uploadCaf() {
    const file = cafInputRef.current?.files?.[0];
    if (!file) {
      setError("Seleccione archivo CAF XML");
      return;
    }
    setBusy("caf");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("environment", cafEnv);
    const res = await uploadFiscalCafAction(fd);
    setBusy("");
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("CAF cargado correctamente");
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

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">CAF boleta 39</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Ambiente del CAF</span>
          <select
            className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={cafEnv}
            onChange={(e) => setCafEnv(e.target.value as "certification" | "production")}
          >
            <option value="certification">Certificación</option>
            <option value="production">Producción</option>
          </select>
        </label>
        <input ref={cafInputRef} type="file" accept=".xml" className="text-sm" />
        <Button onClick={uploadCaf} disabled={busy !== ""}>
          {busy === "caf" ? "Subiendo…" : "Subir CAF"}
        </Button>

        {cafs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4">Ambiente</th>
                  <th className="py-2 pr-4">Rango</th>
                  <th className="py-2 pr-4">Siguiente folio</th>
                  <th className="py-2">Activo</th>
                </tr>
              </thead>
              <tbody>
                {cafs.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{c.environment}</td>
                    <td className="py-2 pr-4">
                      {c.rangeFrom} – {c.rangeTo}
                    </td>
                    <td className="py-2 pr-4">{c.nextFolio}</td>
                    <td className="py-2">{c.isActive ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin CAF cargados.</p>
        )}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
