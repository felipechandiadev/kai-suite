"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import { isEShopModuleEnabled } from "@/config/eshop-module.config";
import { isKaiFoodEnabledForCompany } from "@/config/kaifood-module.config";
import { useCompany } from "@/providers/CompanyProvider";
import {
  createProductAction,
  createProductVariantAction,
  patchProductGridFlagsAction,
} from "@/features/inventory-products/actions/product.action";
import { prepareBulkProductImportAction } from "@/features/inventory-products/actions/bulk-product.action";
import {
  buildBulkProductTemplateBuffer,
  downloadBulkProductTemplate,
  parseBulkProductExcel,
} from "@/features/inventory-products/lib/bulk-product-excel";
import type { BulkProductPreparedRow } from "@/features/inventory-products/lib/bulk-product-prepare.types";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "setup" | "preview" | "processing" | "done";

type ProcessResultItem = {
  key: string;
  sku: string;
  nombre: string;
  ok: boolean;
  message: string;
};

function flagLabel(v: boolean): string {
  return v ? "sí" : "no";
}

export function BulkProductImportDialog({ open, onClose }: Props) {
  const router = useRouter();
  const { company } = useCompany();
  const allowEshop = isEShopModuleEnabled();
  const allowMenu = isKaiFoodEnabledForCompany(company?.kaiProduct);

  const [step, setStep] = useState<Step>("setup");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparedRows, setPreparedRows] = useState<BulkProductPreparedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ rowNumber: number; message: string }>>(
    [],
  );
  const [blocked, setBlocked] = useState(true);
  const [pending, startTransition] = useTransition();
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [results, setResults] = useState<ProcessResultItem[]>([]);

  const resetState = useCallback(() => {
    setStep("setup");
    setFileName(null);
    setParseError(null);
    setPrepareError(null);
    setPreparedRows([]);
    setRowErrors([]);
    setBlocked(true);
    setProgressIndex(0);
    setProgressTotal(0);
    setResults([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetState();
  }, [open, resetState]);

  const handleDownloadTemplate = () => {
    void buildBulkProductTemplateBuffer().then((buf) => {
      downloadBulkProductTemplate(buf);
    });
  };

  const handleFile = (file: File | null) => {
    setParseError(null);
    setPrepareError(null);
    setFileName(file?.name ?? null);
    setPreparedRows([]);
    setRowErrors([]);
    setBlocked(true);
    if (!file) return;

    startTransition(() => {
      void (async () => {
        const buffer = await file.arrayBuffer();
        const parsed = await parseBulkProductExcel(buffer);
        if (parsed.error) {
          setParseError(parsed.error);
          return;
        }
        const prep = await prepareBulkProductImportAction({
          rows: parsed.rows,
          allowEshop,
          allowMenu,
        });
        if (!prep.success) {
          setPrepareError(prep.error);
          return;
        }
        setPreparedRows(prep.rows);
        setRowErrors(prep.rowErrors);
        setBlocked(prep.blocked);
        setStep("preview");
      })();
    });
  };

  const runCreateLoop = () => {
    if (blocked || !preparedRows.length) return;
    setStep("processing");
    setResults([]);
    setProgressIndex(0);
    setProgressTotal(preparedRows.length);

    void (async () => {
      const out: ProcessResultItem[] = [];
      for (let i = 0; i < preparedRows.length; i++) {
        const row = preparedRows[i]!;
        setProgressIndex(i + 1);
        const key = `${row.rowNumber}-${row.sku}`;

        const productRes = await createProductAction({
          name: row.nombre,
          categoryId: row.categoryId ?? undefined,
          productType: "PHYSICAL",
          isActive: row.isActive,
          visibleInEShop: row.visibleInEShop,
        });
        if (!productRes.success) {
          out.push({
            key,
            sku: row.sku,
            nombre: row.nombre,
            ok: false,
            message: productRes.error,
          });
          setResults([...out]);
          continue;
        }

        const variantRes = await createProductVariantAction({
          productId: productRes.id,
          sku: row.sku,
          barcode: row.barcode,
          basePrice: row.basePrice,
          unitId: row.unitId,
          isActive: row.isActive,
          visibleInEShop: row.visibleInEShop,
          priceListItems: row.priceListItems,
          trackInventory: true,
          allowNegativeStock: false,
          minimumStock: 0,
          maximumStock: 0,
          reorderPoint: 0,
        });
        if (!variantRes.success) {
          out.push({
            key,
            sku: row.sku,
            nombre: row.nombre,
            ok: false,
            message: variantRes.error,
          });
          setResults([...out]);
          continue;
        }

        if (row.onMenu) {
          const patch = await patchProductGridFlagsAction({
            id: productRes.id,
            onMenu: true,
          });
          if (!patch.success) {
            out.push({
              key,
              sku: row.sku,
              nombre: row.nombre,
              ok: false,
              message: `Producto creado, pero no se pudo activar menú: ${patch.error}`,
            });
            setResults([...out]);
            continue;
          }
        }

        out.push({
          key,
          sku: row.sku,
          nombre: row.nombre,
          ok: true,
          message: "Creado",
        });
        setResults([...out]);
      }
      setStep("done");
      router.refresh();
    })();
  };

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  const handleClose = () => {
    if (step === "processing") return;
    onClose();
  };

  const gatingNoteParts: string[] = [];
  if (!allowEshop) gatingNoteParts.push("eshop se ignorará (módulo eShop desactivado)");
  if (!allowMenu) gatingNoteParts.push("menu se ignorará (KaiFood no activo para esta empresa)");

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
        parseError || prepareError ? (
          <Alert variant="error">{parseError || prepareError}</Alert>
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
            <Button
              variant="primary"
              disabled
              data-test-id="bulk-product-process-disabled"
            >
              Suba un Excel para continuar
            </Button>
          ) : null}
          {step === "preview" ? (
            <Button
              variant="primary"
              disabled={blocked || pending || !preparedRows.length}
              onClick={runCreateLoop}
              data-test-id="bulk-product-process"
            >
              Procesar {preparedRows.length} producto(s)
            </Button>
          ) : null}
          {step === "done" ? (
            <Button
              variant="primary"
              onClick={() => {
                resetState();
              }}
              data-test-id="bulk-product-again"
            >
              Nueva carga
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {(step === "setup" || step === "preview") && (
          <>
            <p className="text-sm text-muted-foreground">
              Descargue la plantilla, complete una fila por producto (stock) y
              súbala. Cada fila crea un producto PHYSICAL con su primera
              variante (SKU, código de barras, flags y precio).
            </p>
            {gatingNoteParts.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Nota: {gatingNoteParts.join("; ")}.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outlined"
                onClick={handleDownloadTemplate}
                data-test-id="bulk-product-download-template"
              >
                Descargar plantilla
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40">
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    handleFile(f);
                    e.target.value = "";
                  }}
                  data-test-id="bulk-product-file-input"
                />
                {pending ? "Validando…" : "Subir Excel"}
              </label>
              {fileName ? (
                <span className="text-xs text-muted-foreground">{fileName}</span>
              ) : null}
            </div>
          </>
        )}

        {step === "preview" ? (
          <div className="flex flex-col gap-3">
            {rowErrors.length > 0 ? (
              <div
                className="max-h-40 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm"
                data-test-id="bulk-product-row-errors"
              >
                <p className="mb-1 font-medium text-destructive">
                  Errores de fila ({rowErrors.length}) — corrija el Excel y vuelva a
                  subir.
                </p>
                <ul className="list-inside list-disc text-xs">
                  {rowErrors.slice(0, 50).map((e) => (
                    <li key={`${e.rowNumber}-${e.message}`}>
                      Fila {e.rowNumber}: {e.message}
                    </li>
                  ))}
                  {rowErrors.length > 50 ? (
                    <li>… y {rowErrors.length - 50} más</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div
              className="max-h-56 overflow-auto rounded-md border border-border"
              data-test-id="bulk-product-rows-preview"
            >
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="p-2">Fila</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Activo</th>
                    <th className="p-2">eShop</th>
                    <th className="p-2">Menú</th>
                    <th className="p-2">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {preparedRows.map((r) => (
                    <tr key={`${r.rowNumber}-${r.sku}`} className="border-b border-border/60">
                      <td className="p-2">{r.rowNumber}</td>
                      <td className="p-2">{r.nombre}</td>
                      <td className="p-2">{r.sku}</td>
                      <td className="p-2 text-muted-foreground">
                        {r.categoryName ?? "—"}
                      </td>
                      <td className="p-2">{flagLabel(r.isActive)}</td>
                      <td className="p-2">{flagLabel(r.visibleInEShop)}</td>
                      <td className="p-2">{flagLabel(r.onMenu)}</td>
                      <td className="p-2">{r.basePrice}</td>
                    </tr>
                  ))}
                  {preparedRows.length === 0 ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={8}>
                        Sin filas válidas para procesar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === "processing" || step === "done" ? (
          <div className="flex flex-col gap-3" data-test-id="bulk-product-progress">
            {step === "processing" ? (
              <div className="flex items-center gap-3">
                <DotProgress />
                <span className="text-sm">
                  Procesando producto {progressIndex} de {progressTotal}…
                </span>
              </div>
            ) : null}
            <ul className="max-h-64 space-y-1 overflow-auto text-sm">
              {results.map((r) => (
                <li
                  key={r.key}
                  className={r.ok ? "text-foreground" : "text-destructive"}
                >
                  {r.ok ? "✓" : "✗"} {r.nombre} · {r.sku}: {r.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
