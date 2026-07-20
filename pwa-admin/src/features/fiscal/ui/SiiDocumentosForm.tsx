"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Switch } from "@kai/ui";
import { updateFiscalDocumentFamiliesAction } from "../actions/fiscal.actions";
import {
  FISCAL_DOCUMENT_FAMILY_META,
  type FiscalDocumentFamilies,
  type FiscalDocumentFamilyKey,
} from "../types/fiscal-document-family";

type Props = {
  initial: FiscalDocumentFamilies;
};

export function SiiDocumentosForm({ initial }: Props) {
  const router = useRouter();
  const [families, setFamilies] = useState<FiscalDocumentFamilies>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(key: FiscalDocumentFamilyKey, checked: boolean) {
    if (key === "boleta" && !checked) {
      const othersOn = (Object.keys(families) as FiscalDocumentFamilyKey[]).some(
        (k) => k !== "boleta" && families[k],
      );
      if (!othersOn) {
        setError("Debe habilitar al menos un tipo de documento.");
        return;
      }
    }
    setFamilies((prev) => ({ ...prev, [key]: checked }));
    setError("");
  }

  async function save() {
    const anyEnabled = Object.values(families).some(Boolean);
    if (!anyEnabled) {
      setError("Debe habilitar al menos un tipo de documento.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const res = await updateFiscalDocumentFamiliesAction(families);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Documentos habilitados actualizados.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Alert variant="info">
        Los tabs de Certificación y Folios mostrarán solo las familias habilitadas aquí. La boleta
        usa API REST; factura, nota de crédito y guía usan Web Services SOAP del SII.
      </Alert>

      <ul className="space-y-4">
        {FISCAL_DOCUMENT_FAMILY_META.map((meta) => (
          <li
            key={meta.key}
            className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium">{meta.label}</p>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
              <p className="text-xs font-mono text-muted-foreground">
                DTE {meta.dteType} · {meta.pipeline}
              </p>
            </div>
            <Switch
              checked={families[meta.key]}
              onChange={(checked) => toggle(meta.key, checked)}
              aria-label={`Habilitar ${meta.label}`}
            />
          </li>
        ))}
      </ul>

      <Button onClick={save} disabled={busy}>
        {busy ? "Guardando…" : "Guardar"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
    </div>
  );
}
