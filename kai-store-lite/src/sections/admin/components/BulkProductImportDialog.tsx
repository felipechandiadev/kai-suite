import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import {
  downloadLiteBulkProductTemplate,
  parseLiteBulkProductCsv,
  prepareLiteBulkProductRows,
  type LiteBulkPreparedLine,
} from "../lib/bulk-product-csv";
import { liteAdminApi } from "../api/lite-admin.api";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
};

type Step = "setup" | "preview" | "processing" | "done";

type ProcessResultItem = {
  key: string;
  sku: string;
  nombre: string;
  ok: boolean;
  message: string;
};

export function BulkProductImportDialog({ open, onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("setup");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preparedLines, setPreparedLines] = useState<LiteBulkPreparedLine[]>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ rowNumber: number; message: string }>>(
    [],
  );
  const [blocked, setBlocked] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [results, setResults] = useState<ProcessResultItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep("setup");
    setFileName(null);
    setParseError(null);
    setPreparedLines([]);
    setRowErrors([]);
    setBlocked(true);
    setProgressIndex(0);
    setProgressTotal(0);
    setResults([]);
    setApiError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) return;
    resetState();
  }, [open, resetState]);

  const handleFile = (file: File | null) => {
    setParseError(null);
    setApiError(null);
    setFileName(file?.name ?? null);
    setPreparedLines([]);
    setRowErrors([]);
    setBlocked(true);
    if (!file) return;

    void (async () => {
      const text = await file.text();
      const parsed = parseLiteBulkProductCsv(text);
      if (parsed.error) {
        setParseError(parsed.error);
        return;
      }
      const prep = prepareLiteBulkProductRows(parsed.rows);
      setPreparedLines(prep.lines);
      setRowErrors(prep.rowErrors);
      setBlocked(prep.blocked);
      setStep("preview");
    })();
  };

  const runImport = () => {
    if (blocked || !preparedLines.length) return;
    setStep("processing");
    setResults([]);
    setApiError(null);
    setProgressIndex(0);
    setProgressTotal(preparedLines.length);

    void (async () => {
      try {
        setProgressIndex(preparedLines.length);
        const res = await liteAdminApi.bulkCreateProducts(
          preparedLines.map((l) => ({
            name: l.name,
            sku: l.sku,
            barcode: l.barcode,
            productType: l.productType,
            basePrice: l.basePrice,
            categoryName: l.categoryName,
            isActive: l.isActive,
          })),
        );
        const out: ProcessResultItem[] = (res.items ?? []).map((item, i) => ({
          key: `${preparedLines[i]?.rowNumber ?? i}-${item.sku}`,
          sku: item.sku,
          nombre: item.name,
          ok: item.ok,
          message: item.message,
        }));
        setResults(out);
        setStep("done");
        if (out.some((r) => r.ok)) onDone?.();
      } catch (e) {
        setApiError(toUserMessage(e));
        setStep("preview");
      }
    })();
  };

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  const handleClose = () => {
    if (step === "processing") return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Carga masiva de productos"
      size="lg"
      scroll="paper"
      persistent={step === "processing"}
      data-test-id="bulk-product-import-dialog"
      alertArea={
        parseError || apiError ? (
          <Alert variant="error">{parseError || apiError}</Alert>
        ) : step === "done" && failCount === 0 && okCount > 0 ? (
          <Alert variant="success">Se crearon {okCount} producto(s).</Alert>
        ) : step === "done" && okCount > 0 && failCount > 0 ? (
          <Alert variant="warning">
            Parcial: {okCount} ok, {failCount} con error.
          </Alert>
        ) : step === "done" && okCount === 0 ? (
          <Alert variant="error">No se creó ningún producto.</Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="text"
            onClick={handleClose}
            disabled={step === "processing"}
            data-test-id="bulk-product-cancel"
          >
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {step === "setup" ? (
            <Button variant="primary" disabled data-test-id="bulk-product-process-disabled">
              Suba un CSV para continuar
            </Button>
          ) : null}
          {step === "preview" ? (
            <Button
              variant="primary"
              disabled={blocked || !preparedLines.length}
              onClick={runImport}
              data-test-id="bulk-product-process"
            >
              Importar {preparedLines.length} producto(s)
            </Button>
          ) : null}
          {step === "done" ? (
            <Button
              variant="primary"
              onClick={() => resetState()}
              data-test-id="bulk-product-again"
            >
              Nueva carga
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {step === "setup" || step === "preview" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Descargá la plantilla CSV, completá las filas y subí el archivo. Columnas: nombre,
              sku, codigo_barras, tipo_producto, precio, categoria, activo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outlined"
                onClick={() => downloadLiteBulkProductTemplate()}
                data-test-id="bulk-product-download-template"
              >
                Descargar plantilla
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={() => fileRef.current?.click()}
                data-test-id="bulk-product-pick-file"
              >
                Elegir CSV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {fileName ? (
              <p className="text-xs text-muted-foreground">Archivo: {fileName}</p>
            ) : null}
          </>
        ) : null}

        {step === "preview" ? (
          <div className="space-y-3">
            {rowErrors.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-md border border-border p-2 text-sm">
                <p className="mb-1 font-medium text-foreground">
                  Errores ({rowErrors.length}) — corregí el CSV para continuar
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {rowErrors.slice(0, 40).map((e) => (
                    <li key={`${e.rowNumber}-${e.message}`}>
                      Fila {e.rowNumber}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preparedLines.length > 0 ? (
              <div className="max-h-56 overflow-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1">Fila</th>
                      <th className="px-2 py-1">SKU</th>
                      <th className="px-2 py-1">Nombre</th>
                      <th className="px-2 py-1">Tipo</th>
                      <th className="px-2 py-1">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preparedLines.map((l) => (
                      <tr key={l.rowNumber} className="border-t border-border/60">
                        <td className="px-2 py-1 tabular-nums">{l.rowNumber}</td>
                        <td className="px-2 py-1 font-mono text-xs">{l.sku}</td>
                        <td className="px-2 py-1">{l.name}</td>
                        <td className="px-2 py-1">{l.productType}</td>
                        <td className="px-2 py-1 tabular-nums">{l.basePrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "processing" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <DotProgress />
            <p className="text-sm text-muted-foreground">
              Importando {progressIndex}/{progressTotal}…
            </p>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">SKU</th>
                  <th className="px-2 py-1">Nombre</th>
                  <th className="px-2 py-1">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.key} className="border-t border-border/60">
                    <td className="px-2 py-1 font-mono text-xs">{r.sku}</td>
                    <td className="px-2 py-1">{r.nombre}</td>
                    <td
                      className={`px-2 py-1 ${r.ok ? "text-success" : "text-destructive"}`}
                    >
                      {r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
