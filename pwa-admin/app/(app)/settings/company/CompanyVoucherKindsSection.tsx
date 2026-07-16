"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, IconButton, LoadingState, Select, Switch, TextField } from "@kai/ui";
import type {
  CompanyVoucherKind,
  VoucherFaceValueMode,
} from "@/features/companies/types/company-voucher-kinds.types";
import { emptyCompanyVoucherKind } from "@/features/companies/types/company-voucher-kinds.types";
import {
  getCompanyVoucherKindsAction,
  replaceCompanyVoucherKindsAction,
} from "@/features/companies/actions/companies-voucher-kinds.action";

type Props = {
  companyId: string;
};

type EditableKind = Omit<CompanyVoucherKind, "id" | "code"> & {
  id?: string;
  code?: string;
  _key: string;
};

const FACE_MODE_OPTIONS = [
  { id: "OPEN", label: "Abierto (obligatorio en venta)" },
  { id: "FIXED", label: "Fijo (valor predefinido)" },
];

export function CompanyVoucherKindsSection({ companyId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<EditableKind[]>([]);
  const [initial, setInitial] = useState<EditableKind[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getCompanyVoucherKindsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          const mapped = res.voucherKinds.map((k) => ({
            ...k,
            _key: k.id,
          }));
          setItems(mapped);
          setInitial(mapped);
        } else {
          setLoadError(res.error);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  function updateAt(index: number, patch: Partial<EditableKind>) {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      { ...emptyCompanyVoucherKind(), _key: `new-${Date.now()}` },
    ]);
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const payload = items
        .map((k) => ({
          ...(k.id ? { id: k.id } : {}),
          name: k.name.trim(),
          isActive: k.isActive,
          faceValueMode: k.faceValueMode,
          defaultFaceValue:
            k.faceValueMode === "FIXED"
              ? Math.round(Number(k.defaultFaceValue) || 0)
              : null,
          requireFaceValue: k.faceValueMode === "OPEN",
          defaultIssuerName: k.defaultIssuerName?.trim() || null,
        }))
        .filter((k) => k.name.length > 0);
      for (const k of payload) {
        if (k.faceValueMode === "FIXED" && !(Number(k.defaultFaceValue) > 0)) {
          setError(`"${k.name}": en modo fijo el valor nominal debe ser > 0.`);
          return;
        }
      }
      const res = await replaceCompanyVoucherKindsAction(companyId, payload as CompanyVoucherKind[]);
      if (!res.success) {
        setError(res.error);
        return;
      }
      const mapped = res.voucherKinds.map((k) => ({ ...k, _key: k.id }));
      setItems(mapped);
      setInitial(mapped);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="settings-company-voucher-kinds-section"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Tipos de voucher
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El código se genera automáticamente al guardar. Soft-delete al
            quitar de la lista. En valor nominal abierto, siempre se exige
            definir el valor en la venta.
          </p>
        </div>
        <IconButton
          icon="Plus"
          variant="action"
          size="md"
          ariaLabel="Agregar tipo de voucher"
          disabled={busy || loading}
          onClick={addRow}
          data-test-id="settings-company-voucher-kinds-add"
        />
      </div>

      {loadError ? <p className="text-sm text-error">{loadError}</p> : null}
      {error ? (
        <Alert variant="error" className="mb-3" data-test-id="settings-company-voucher-kinds-error">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay tipos. Creá uno antes de agregar un medio de pago Voucher.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((row, index) => (
            <li
              key={row._key}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-3"
              data-test-id={`settings-company-voucher-kind-row-${index}`}
            >
              <TextField
                label="Nombre"
                name={`voucher-kind-name-${index}`}
                value={row.name}
                onChange={(e) => updateAt(index, { name: e.target.value })}
                alwaysShowLabel
                density="compact"
                placeholder="Voucher gas"
                data-test-id={`settings-company-voucher-kind-name-${index}`}
              />
              <Select
                label="Valor nominal"
                name={`voucher-kind-mode-${index}`}
                value={row.faceValueMode}
                onChange={(id) =>
                  updateAt(index, {
                    faceValueMode: (id != null
                      ? String(id)
                      : "OPEN") as VoucherFaceValueMode,
                    ...(id != null && String(id) === "OPEN"
                      ? { requireFaceValue: true }
                      : {}),
                  })
                }
                options={FACE_MODE_OPTIONS}
                alwaysShowLabel
                density="compact"
                data-test-id={`settings-company-voucher-kind-mode-${index}`}
              />
              {row.faceValueMode === "FIXED" ? (
                <TextField
                  type="currency"
                  label="Valor predefinido"
                  name={`voucher-kind-face-${index}`}
                  value={
                    row.defaultFaceValue != null
                      ? String(Math.round(Number(row.defaultFaceValue)))
                      : ""
                  }
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    updateAt(index, {
                      defaultFaceValue: digits ? Math.round(Number(digits)) : null,
                    });
                  }}
                  alwaysShowLabel
                  density="compact"
                  data-test-id={`settings-company-voucher-kind-face-${index}`}
                />
              ) : null}
              <TextField
                label="Emisión"
                name={`voucher-kind-issuer-${index}`}
                value={row.defaultIssuerName ?? ""}
                onChange={(e) =>
                  updateAt(index, { defaultIssuerName: e.target.value || null })
                }
                alwaysShowLabel
                density="compact"
                placeholder="Opcional"
              />
              <div className="flex items-end justify-between gap-2 pb-1">
                <Switch
                  checked={row.isActive}
                  onChange={(v) => updateAt(index, { isActive: v })}
                  label="Activo"
                />
                <IconButton
                  icon="Trash2"
                  variant="neutral"
                  size="sm"
                  ariaLabel="Eliminar tipo"
                  disabled={busy}
                  onClick={() => removeAt(index)}
                  data-test-id={`settings-company-voucher-kind-delete-${index}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !dirty}
          onClick={() => {
            setItems(initial);
            setError(null);
          }}
        >
          Descartar
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={busy || !dirty}
          onClick={() => void handleSave()}
          data-test-id="settings-company-voucher-kinds-save"
        >
          Guardar tipos
        </Button>
      </div>
    </section>
  );
}
