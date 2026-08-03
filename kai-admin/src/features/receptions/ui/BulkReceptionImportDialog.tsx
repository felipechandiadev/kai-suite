"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, DotProgress, Select } from "@kai/ui";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { prepareBulkReceptionImportAction } from "@/features/receptions/actions/bulk-reception.action";
import { createDirectReceptionAction } from "@/features/receptions/actions/reception.action";
import {
  buildBulkReceptionTemplateBuffer,
  downloadBulkReceptionTemplate,
  parseBulkReceptionExcel,
} from "@/features/receptions/lib/bulk-reception-excel";
import type { BulkReceptionPreparedGroup } from "@/features/receptions/lib/bulk-reception-group";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "setup" | "preview" | "processing" | "done";

type ProcessResultItem = {
  key: string;
  numeroFactura: string;
  supplierName: string;
  ok: boolean;
  message: string;
  receptionId?: string;
};

function pickDefaultBranchId(branches: BranchListItem[]): string {
  const hq = branches.find((b) => b.isHeadquarters && b.isActive !== false);
  if (hq) return hq.id;
  const active = branches.find((b) => b.isActive !== false);
  return active?.id ?? branches[0]?.id ?? "";
}

export function BulkReceptionImportDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [storages, setStorages] = useState<StorageListItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [storageId, setStorageId] = useState<string | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [groups, setGroups] = useState<BulkReceptionPreparedGroup[]>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ rowNumber: number; message: string }>>([]);
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
    setGroups([]);
    setRowErrors([]);
    setBlocked(true);
    setProgressIndex(0);
    setProgressTotal(0);
    setResults([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetState();
    setRefLoading(true);
    setRefError(null);
    void Promise.all([listBranchesForSettingsPage(), listStoragesForPage()]).then(
      ([b, s]) => {
        setBranches(b);
        setStorages(s);
        const defBranch = pickDefaultBranchId(b);
        setBranchId(defBranch);
        const forBranch = s.filter(
          (st) => st.isActive !== false && (!st.branchId || st.branchId === defBranch),
        );
        const defStorage =
          forBranch.find((st) => st.isDefault)?.id ?? forBranch[0]?.id ?? s.find((st) => st.isActive !== false)?.id ?? null;
        setStorageId(defStorage);
        setRefLoading(false);
      },
      (e) => {
        setRefError(e instanceof Error ? e.message : "No se pudo cargar sucursales/almacenes.");
        setRefLoading(false);
      },
    );
  }, [open, resetState]);

  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.isActive !== false)
        .map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const storageOptions = useMemo(() => {
    const list = storages.filter((st) => {
      if (st.isActive === false) return false;
      if (!branchId) return true;
      return !st.branchId || st.branchId === branchId;
    });
    return list.map((st) => ({
      id: st.id,
      label: st.branch?.name ? `${st.name} · ${st.branch.name}` : st.name,
    }));
  }, [storages, branchId]);

  useEffect(() => {
    if (!branchId) return;
    const stillValid =
      storageId &&
      storageOptions.some((o) => String(o.id) === String(storageId));
    if (!stillValid) {
      setStorageId(storageOptions[0] ? String(storageOptions[0].id) : null);
    }
  }, [branchId, storageOptions, storageId]);

  const handleDownloadTemplate = () => {
    void buildBulkReceptionTemplateBuffer().then((buf) => {
      downloadBulkReceptionTemplate(buf);
    });
  };

  const handleFile = (file: File | null) => {
    setParseError(null);
    setPrepareError(null);
    setFileName(file?.name ?? null);
    setGroups([]);
    setRowErrors([]);
    setBlocked(true);
    if (!file) return;

    startTransition(() => {
      void (async () => {
        const buffer = await file.arrayBuffer();
        const parsed = await parseBulkReceptionExcel(buffer);
        if (parsed.error) {
          setParseError(parsed.error);
          return;
        }
        if (!branchId.trim() || !storageId?.trim()) {
          setPrepareError("Seleccione sucursal y almacén antes de validar.");
          return;
        }
        const prep = await prepareBulkReceptionImportAction({
          rows: parsed.rows,
          branchId,
          storageId,
        });
        if (!prep.success) {
          setPrepareError(prep.error);
          return;
        }
        setGroups(prep.groups);
        setRowErrors(prep.rowErrors);
        setBlocked(prep.blocked);
        setStep("preview");
      })();
    });
  };

  const processableGroups = useMemo(
    () => groups.filter((g) => !g.duplicate),
    [groups],
  );

  const runCreateLoop = () => {
    if (blocked || !processableGroups.length) return;
    setStep("processing");
    setResults([]);
    setProgressIndex(0);
    setProgressTotal(processableGroups.length);

    void (async () => {
      const out: ProcessResultItem[] = [];
      for (let i = 0; i < processableGroups.length; i++) {
        const g = processableGroups[i]!;
        setProgressIndex(i + 1);
        const res = await createDirectReceptionAction(g.createInput);
        if (res.success) {
          out.push({
            key: g.key,
            numeroFactura: g.numeroFactura,
            supplierName: g.supplierName,
            ok: true,
            message: res.internalDocumentNumber
              ? `Creada ${res.internalDocumentNumber}`
              : "Creada",
            receptionId: res.receptionId,
          });
        } else {
          out.push({
            key: g.key,
            numeroFactura: g.numeroFactura,
            supplierName: g.supplierName,
            ok: false,
            message: res.error,
          });
        }
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Carga masiva de recepciones"
      size="lg"
      scroll="paper"
      persistent={step === "processing"}
      data-test-id="bulk-reception-import-dialog"
      alertArea={
        parseError || prepareError || refError ? (
          <Alert variant="error">{parseError || prepareError || refError}</Alert>
        ) : step === "done" && failCount === 0 && okCount > 0 ? (
          <Alert variant="success">
            Se crearon {okCount} recepción(es) con pago pendiente.
          </Alert>
        ) : step === "done" && okCount > 0 && failCount > 0 ? (
          <Alert variant="warning">
            Parcial: {okCount} ok, {failCount} con error.
          </Alert>
        ) : step === "done" && okCount === 0 ? (
          <Alert variant="error">No se creó ninguna recepción.</Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="text"
            onClick={handleClose}
            disabled={step === "processing"}
            data-test-id="bulk-reception-cancel"
          >
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {step === "setup" ? (
            <Button
              variant="primary"
              disabled
              data-test-id="bulk-reception-process-disabled"
            >
              Suba un Excel para continuar
            </Button>
          ) : null}
          {step === "preview" ? (
            <Button
              variant="primary"
              disabled={blocked || pending || !processableGroups.length}
              onClick={runCreateLoop}
              data-test-id="bulk-reception-process"
            >
              Procesar {processableGroups.length} factura(s)
            </Button>
          ) : null}
          {step === "done" ? (
            <Button
              variant="primary"
              onClick={() => {
                resetState();
              }}
              data-test-id="bulk-reception-again"
            >
              Nueva carga
            </Button>
          ) : null}
        </>
      }
    >
      {refLoading ? (
        <div className="flex justify-center py-8">
          <DotProgress />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(step === "setup" || step === "preview") && (
            <>
              <p className="text-sm text-muted-foreground">
                Descargue la plantilla, complete una fila por línea de producto y
                súbala. Las filas se agrupan por RUT + número de factura. Las
                recepciones quedan con pago pendiente.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Sucursal"
                  alwaysShowLabel
                  value={branchId || null}
                  onChange={(id) => setBranchId(id != null ? String(id) : "")}
                  options={branchOptions}
                  data-test-id="bulk-reception-branch"
                />
                <Select
                  label="Almacén destino"
                  alwaysShowLabel
                  value={storageId}
                  onChange={(id) => setStorageId(id != null ? String(id) : null)}
                  options={storageOptions}
                  data-test-id="bulk-reception-storage"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  data-test-id="bulk-reception-download-template"
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
                    data-test-id="bulk-reception-file-input"
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
                  data-test-id="bulk-reception-row-errors"
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
                data-test-id="bulk-reception-groups-preview"
              >
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="p-2">Proveedor</th>
                      <th className="p-2">Factura</th>
                      <th className="p-2">Líneas</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.key} className="border-b border-border/60">
                        <td className="p-2">
                          {g.supplierName}
                          <div className="text-muted-foreground">{g.supplierRut}</div>
                        </td>
                        <td className="p-2">{g.numeroFactura}</td>
                        <td className="p-2">{g.lines.length}</td>
                        <td className="p-2">
                          {g.duplicate ? (
                            <span className="text-destructive">
                              {g.duplicateMessage ?? "Duplicada"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Lista</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === "processing" || step === "done" ? (
            <div className="flex flex-col gap-3" data-test-id="bulk-reception-progress">
              {step === "processing" ? (
                <div className="flex items-center gap-3">
                  <DotProgress />
                  <span className="text-sm">
                    Procesando factura {progressIndex} de {progressTotal}…
                  </span>
                </div>
              ) : null}
              <ul className="max-h-64 space-y-1 overflow-auto text-sm">
                {results.map((r) => (
                  <li
                    key={r.key}
                    className={r.ok ? "text-foreground" : "text-destructive"}
                  >
                    {r.ok ? "✓" : "✗"} {r.supplierName} · {r.numeroFactura}: {r.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
