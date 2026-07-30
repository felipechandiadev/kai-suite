"use client";

import { useCallback, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Button, IconButton, TextField } from "@kai/ui";
import BarcodeScanner from "./BarcodeScanner";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { updateBarcodeAction } from "../actions/variant.action";
import { variantDetailPath } from "../lib/variant-routes";

export default function UpdateBarcodePage() {
  const router = useRouter();
  const params = useParams();
  const variantId = typeof params.variantId === "string" ? params.variantId.trim() : "";
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSave = useCallback(() => {
    if (!variantId) {
      setError("Variante no indicada");
      return;
    }
    setError("");
    startTransition(async () => {
      const r = await updateBarcodeAction({ variantId, barcode });
      if (!r.success) {
        if (handleUnauthorizedClient(r)) {
          return;
        }
        setError(r.error);
        return;
      }
      router.push(variantDetailPath(variantId));
      router.refresh();
    });
  }, [barcode, router, variantId]);

  if (!variantId) {
    return <Alert variant="error">Falta el identificador de variante.</Alert>;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-1">
        <IconButton
          icon="ArrowLeft"
          variant="neutral"
          size="md"
          ariaLabel="Volver"
          onClick={() => router.push(variantDetailPath(variantId))}
          disabled={pending}
          data-test-id="barcode-update-back"
        />
        <h1 className="text-lg font-semibold">Actualizar código de barras</h1>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <BarcodeScanner
        onScan={(code) => {
          setBarcode(code);
        }}
        paused={pending}
      />
      <TextField
        label="Código de barras"
        placeholder="Código de barras"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        disabled={pending}
      />
      <Button type="button" onClick={handleSave} loading={pending} disabled={pending}>
        Guardar Nuevo Código
      </Button>
    </div>
  );
}
