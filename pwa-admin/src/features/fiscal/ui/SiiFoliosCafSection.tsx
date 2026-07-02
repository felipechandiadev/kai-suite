"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import type { FiscalCafItem } from "../types/fiscal.types";
import { uploadFiscalCafAction } from "../actions/fiscal.actions";

type Props = {
  cafs: FiscalCafItem[];
};

function formatUploadedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-CL");
}

function envLabel(env: string): string {
  return env === "production" ? "Producción" : "Certificación";
}

export function SiiFoliosCafSection({ cafs }: Props) {
  const router = useRouter();
  const cafInputRef = useRef<HTMLInputElement>(null);
  const [cafEnv, setCafEnv] = useState<"certification" | "production">("production");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadCaf() {
    const file = cafInputRef.current?.files?.[0];
    if (!file) {
      setError("Seleccione archivo CAF XML");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("environment", cafEnv);
    const res = await uploadFiscalCafAction(fd);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("CAF cargado correctamente");
    if (cafInputRef.current) cafInputRef.current.value = "";
    router.refresh();
  }

  return (
    <section className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Código de autorización de folios (boleta electrónica tipo 39) por ambiente.
      </p>
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
      <Button onClick={uploadCaf} disabled={busy}>
        {busy ? "Subiendo…" : "Subir CAF"}
      </Button>

      {cafs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4">Ambiente</th>
                <th className="py-2 pr-4">Rango</th>
                <th className="py-2 pr-4">Siguiente folio</th>
                <th className="py-2 pr-4">Disponibles</th>
                <th className="py-2 pr-4">Activo</th>
                <th className="py-2">Subido</th>
              </tr>
            </thead>
            <tbody>
              {cafs.map((c) => {
                const available = Math.max(0, c.rangeTo - c.nextFolio + 1);
                return (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{envLabel(c.environment)}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {c.rangeFrom} – {c.rangeTo}
                    </td>
                    <td className="py-2 pr-4 font-mono">{c.nextFolio}</td>
                    <td className="py-2 pr-4 font-mono">{available}</td>
                    <td className="py-2 pr-4">{c.isActive ? "Sí" : "No"}</td>
                    <td className="py-2">{formatUploadedAt(c.uploadedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin CAF cargados.</p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </section>
  );
}
