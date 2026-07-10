"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { Button, IconButton } from "@/shared/admin-shared";
import "@kai/ui/components/Dialog/dialog.css";
import type { PublicCompany } from "@/features/company/infrastructure/public-companies.request";
import {
  readPosCompany,
  writePosCompany,
} from "@/features/company/storage/pos-company-storage";

type PosSetupClientProps = {
  companies: PublicCompany[];
  initialError?: string | null;
};

export function PosSetupClient({
  companies,
  initialError,
}: PosSetupClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    const current = readPosCompany();
    if (current?.id) {
      setSelectedId(current.id);
      setSavedAt(current.savedAt);
    }
  }, []);

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const aLabel = (a.nombreFantasia ?? a.razonSocial).toLowerCase();
      const bLabel = (b.nombreFantasia ?? b.razonSocial).toLowerCase();
      return aLabel.localeCompare(bLabel);
    });
  }, [companies]);

  const handleSave = () => {
    if (!selectedId) return;
    const target = sortedCompanies.find((c) => c.id === selectedId);
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      writePosCompany({
        id: target.id,
        razonSocial: target.razonSocial,
        nombreFantasia: target.nombreFantasia,
        rut: target.rut,
      });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la configuración",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-6 py-10"
      data-test-id="pos-setup-root"
    >
      <div className="fs-dialog__paper w-full max-w-lg overflow-hidden shadow-md">
        <div className="fs-dialog__header flex items-start gap-2 border-b border-border/70 px-4 pb-3 pt-4">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={handleCancel}
            ariaLabel="Volver al login"
            data-test-id="pos-setup-back"
            disabled={saving}
          />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-left text-lg font-semibold text-foreground">
              Configuración del POS
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige la empresa a la que se conectará este punto de venta. La
              selección se guarda en este dispositivo y no se vuelve a pedir
              hasta que se cambie aquí.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          {savedAt ? (
            <p
              className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
              data-test-id="pos-setup-current"
            >
              Configurado por última vez: {new Date(savedAt).toLocaleString()}
            </p>
          ) : null}

          {error ? (
            <p
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              data-test-id="pos-setup-error"
            >
              {error}
            </p>
          ) : null}

          {sortedCompanies.length === 0 ? (
            <div
              className="rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground"
              data-test-id="pos-setup-empty"
            >
              No hay empresas activas disponibles. Pide al super-administrador
              que cree o active una empresa en el panel de administración.
            </div>
          ) : (
            <ul
              className="max-h-[55vh] flex flex-col gap-2 overflow-y-auto py-1"
              role="listbox"
              data-test-id="pos-setup-list"
            >
              {sortedCompanies.map((c) => {
                const label = c.nombreFantasia?.trim() || c.razonSocial.trim();
                const subtitle =
                  c.nombreFantasia && c.nombreFantasia.trim() !== c.razonSocial
                    ? c.razonSocial
                    : null;
                const rutLine =
                  c.rut != null && String(c.rut).trim() !== ""
                    ? String(c.rut).trim()
                    : null;
                const active = selectedId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md border-2 px-4 py-3 text-left transition ${
                        active
                          ? "border-secondary shadow-sm"
                          : "border-transparent hover:border-border"
                      }`}
                      aria-pressed={active}
                      data-test-id={`pos-setup-option-${c.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Building2
                          className={`h-5 w-5 shrink-0 ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {label}
                          </div>
                          {subtitle ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {subtitle}
                            </div>
                          ) : null}
                          {rutLine ? (
                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                              RUT {rutLine}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-secondary" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="fs-dialog__actions flex w-full flex-wrap items-center gap-2 border-t border-border/70 px-4 pb-4 pt-3 justify-between"
          data-test-id="pos-setup-actions"
          role="group"
          aria-label="Acciones"
        >
          <Button
            type="button"
            variant="outlined"
            onClick={handleCancel}
            disabled={saving}
            data-test-id="pos-setup-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!selectedId}
            loading={saving}
            data-test-id="pos-setup-save"
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
