"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@kai/ui";
import type { PrintFormat } from "@kai/print-service-client";
import { getBoletaPrintPreviewAction } from "../actions/fiscal.actions";
import { printFiscalBoletaPreview } from "../print/fiscal-boleta-preview-print";
import { buildFiscalBoletaPreviewHtml } from "../print/build-fiscal-boleta-preview-html";
import { fiscalTimbrePdf417SvgForPreview } from "../print/fiscal-timbre-pdf417";
import type { FiscalBoletaPrintPreview } from "../types/fiscal.types";
import { SET_BE_CASE_LABELS } from "../types/fiscal.types";

/** Solo vista previa en navegador; el agente resuelve 58/80 mm según la impresora. */
const BROWSER_PREVIEW_FORMAT: PrintFormat = "ticket_80mm";

type Props = {
  initialPreview: FiscalBoletaPrintPreview;
};

function formatMoney(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

export function SiiBoletaPrintSection({ initialPreview }: Props) {
  const [caso, setCaso] = useState(initialPreview.caso);
  const [preview, setPreview] = useState(initialPreview);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [printResult, setPrintResult] = useState<"agent" | "browser" | "">("");
  const [pdf417Svg, setPdf417Svg] = useState("");

  const loadPreview = useCallback(async (nextCaso: string) => {
    setLoading(true);
    setError("");
    const res = await getBoletaPrintPreviewAction(nextCaso);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Error al cargar preview");
      return;
    }
    setPreview(res.preview);
  }, []);

  useEffect(() => {
    if (caso === initialPreview.caso) {
      setPreview(initialPreview);
      return;
    }
    void loadPreview(caso);
  }, [caso, initialPreview, loadPreview]);

  useEffect(() => {
    let cancelled = false;
    void fiscalTimbrePdf417SvgForPreview(preview, "ticket_80mm").then((svg) => {
      if (!cancelled) setPdf417Svg(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const previewHtml = useMemo(
    () => buildFiscalBoletaPreviewHtml(preview, BROWSER_PREVIEW_FORMAT, pdf417Svg),
    [preview, pdf417Svg],
  );

  async function handlePrint() {
    setPrinting(true);
    setPrintResult("");
    setError("");
    try {
      const channel = await printFiscalBoletaPreview(preview, { pdf417Svg });
      setPrintResult(channel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al imprimir");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!preview.emisorComplete ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete los datos del emisor en la pestaña Emisor para una representación más fiel. Puede
          imprimir igualmente con los datos disponibles.
        </div>
      ) : null}

      <label className="flex max-w-xl flex-col gap-1 text-sm">
        <span className="font-medium">Caso Set BE</span>
        <select
          className="rounded-md border border-input bg-background px-3 py-2"
          value={caso}
          onChange={(e) => setCaso(e.target.value)}
          disabled={loading}
        >
          {SET_BE_CASE_LABELS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} — {c.description}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Folio simulado: <strong className="text-foreground">{preview.folio}</strong> · Total:{" "}
          <strong className="text-foreground">{formatMoney(preview.totals.mntTotal)}</strong>
        </p>
        <p className="mt-1">
          El ancho del ticket y el logo los define Kai Printers según la línea de impresión
          configurada.
        </p>
        {preview.cafAdvisory.hasActiveCaf ? (
          <p className="mt-1">
            CAF activo — próximo folio real: {preview.cafAdvisory.nextFolio ?? "—"}
            {!preview.cafAdvisory.sufficientForSet ? " (folios insuficientes para set completo)" : ""}
          </p>
        ) : (
          <p className="mt-1">Sin CAF activo — folio hipotético para vista previa.</p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {printResult ? (
        <p className="text-sm text-muted-foreground">
          Impreso vía {printResult === "agent" ? "Kai Printers" : "navegador"}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handlePrint()} disabled={printing || loading}>
          {printing ? "Imprimiendo…" : "Imprimir boleta de prueba"}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Vista previa</p>
        <div className="overflow-x-auto rounded-md border bg-white p-2">
          <iframe
            title="Vista previa boleta"
            srcDoc={previewHtml}
            className="mx-auto block border-0"
            style={{ width: "300px", minHeight: "480px" }}
          />
        </div>
      </div>
    </div>
  );
}
