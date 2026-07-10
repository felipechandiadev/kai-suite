"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { uploadFiscalCafAction } from "../actions/fiscal.actions";

export function SiiFoliosCafSection() {
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
    setMessage("CAF cargado. Se creó un nuevo paquete y el anterior quedó archivado.");
    if (cafInputRef.current) cafInputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada archivo CAF XML importado crea un paquete con código único. Un XML corresponde a un
        tipo DTE (39 = boleta electrónica). Al subir un nuevo CAF del mismo tipo y ambiente, el
        paquete activo anterior pasa a archivado.
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
