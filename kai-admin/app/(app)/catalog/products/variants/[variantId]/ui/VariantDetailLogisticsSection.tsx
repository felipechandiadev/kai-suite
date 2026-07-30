"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@kai/ui";
import { TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { updateProductVariantLogisticsAction } from "@/features/inventory-products/actions/product.action";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";

function noop() {}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(n);
}

/** Muestra y edita con coma decimal (es-CL). */
function formatDecimalField(n: number): string {
  return formatNumber(n);
}

function sanitizeDecimalInput(raw: string): string {
  const normalized = raw.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const commaIdx = normalized.indexOf(",");
  if (commaIdx === -1) {
    return normalized;
  }
  const intPart = normalized.slice(0, commaIdx);
  const decPart = normalized.slice(commaIdx + 1).replace(/,/g, "").slice(0, 6);
  return decPart.length > 0 || normalized.endsWith(",") ? `${intPart},${decPart}` : intPart;
}

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

type LogisticsFieldProps = {
  label: string;
  name: string;
  value: string;
  setValue: (v: string) => void;
  readOnly: boolean;
  unit: string;
  placeholder?: string;
  integer?: boolean;
};

function LogisticsField({
  label,
  name,
  value,
  setValue,
  readOnly,
  unit,
  placeholder,
  integer = false,
}: LogisticsFieldProps) {
  const onChange = readOnly
    ? noop
    : (e: ChangeEvent<HTMLInputElement>) => {
        setValue(integer ? sanitizeIntegerInput(e.target.value) : sanitizeDecimalInput(e.target.value));
      };

  return (
    <TextField
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      selectOnFocus={!readOnly}
      endSymbol={unit}
      placeholder={placeholder}
      inputMode={integer ? "numeric" : "decimal"}
    />
  );
}

type VariantDetailLogisticsSectionProps = {
  variant: ProductVariantGridRow;
};

export function VariantDetailLogisticsSection({ variant }: VariantDetailLogisticsSectionProps) {
  const router = useRouter();
  const [netKg, setNetKg] = useState("");
  const [grossKg, setGrossKg] = useState("");
  const [lenCm, setLenCm] = useState("");
  const [widCm, setWidCm] = useState("");
  const [heiCm, setHeiCm] = useState("");
  const [divK, setDivK] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) {
      return;
    }
    setNetKg(
      variant.netWeightKg != null && Number.isFinite(Number(variant.netWeightKg))
        ? formatDecimalField(Number(variant.netWeightKg))
        : "",
    );
    setGrossKg(
      variant.grossWeightKg != null && Number.isFinite(Number(variant.grossWeightKg))
        ? formatDecimalField(Number(variant.grossWeightKg))
        : "",
    );
    setLenCm(
      variant.packageLengthCm != null && Number.isFinite(Number(variant.packageLengthCm))
        ? formatDecimalField(Number(variant.packageLengthCm))
        : "",
    );
    setWidCm(
      variant.packageWidthCm != null && Number.isFinite(Number(variant.packageWidthCm))
        ? formatDecimalField(Number(variant.packageWidthCm))
        : "",
    );
    setHeiCm(
      variant.packageHeightCm != null && Number.isFinite(Number(variant.packageHeightCm))
        ? formatDecimalField(Number(variant.packageHeightCm))
        : "",
    );
    setDivK(
      variant.volumetricDivisorK != null && Number.isFinite(Number(variant.volumetricDivisorK))
        ? String(Math.round(Number(variant.volumetricDivisorK)))
        : "",
    );
  }, [variant, editing]);

  const volumetricPreview = useMemo(() => {
    const L = Number(String(lenCm).replace(",", "."));
    const W = Number(String(widCm).replace(",", "."));
    const H = Number(String(heiCm).replace(",", "."));
    const K = divK.trim() ? Math.round(Number(divK)) : 5000;
    if (![L, W, H].every((x) => Number.isFinite(x) && x > 0) || !(K > 0)) {
      return null;
    }
    return (L * W * H) / K;
  }, [lenCm, widCm, heiCm, divK]);

  const parseOptNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) {
      return null;
    }
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const save = useCallback(() => {
    setError(null);
    const divKRaw = divK.trim();
    let divKParsed: number | null = null;
    if (divKRaw) {
      const n = Math.round(Number(divKRaw));
      if (!Number.isFinite(n) || n <= 0) {
        setError("El divisor K debe ser un entero mayor que 0.");
        return;
      }
      divKParsed = n;
    }
    startTransition(() => {
      void (async () => {
        const r = await updateProductVariantLogisticsAction(variant.id, {
          netWeightKg: parseOptNum(netKg),
          grossWeightKg: parseOptNum(grossKg),
          packageLengthCm: parseOptNum(lenCm),
          packageWidthCm: parseOptNum(widCm),
          packageHeightCm: parseOptNum(heiCm),
          volumetricDivisorK: divKParsed,
        });
        if (r.success) {
          setEditing(false);
          await router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  }, [variant.id, netKg, grossKg, lenCm, widCm, heiCm, divK, router]);

  const readOnly = !editing;

  const toggleEditOrSave = () => {
    setError(null);
    if (!editing) {
      setEditing(true);
      return;
    }
    save();
  };

  return (
    <section
      className={`relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12 ${
        editing ? "ring-1 ring-primary/25" : ""
      }`}
      data-test-id="pv-section-logistics"
    >
      <h2 className="text-sm font-semibold text-foreground">Despacho para transportista</h2>
      <p className="text-xs text-muted-foreground">
        Peso neto (producto), peso bruto (con embalaje), dimensiones del empaque y divisor K para peso
        volumétrico kg = (L×W×H)/K.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <LogisticsField
          label="Peso neto"
          name="pv-net-kg"
          value={netKg}
          setValue={setNetKg}
          readOnly={readOnly}
          unit="kg"
          placeholder="Ej: 0,25"
        />
        <LogisticsField
          label="Peso bruto con embalaje"
          name="pv-gross-kg"
          value={grossKg}
          setValue={setGrossKg}
          readOnly={readOnly}
          unit="kg"
          placeholder="Ej: 0,31"
        />
        <LogisticsField
          label="Largo empaque"
          name="pv-l"
          value={lenCm}
          setValue={setLenCm}
          readOnly={readOnly}
          unit="cm"
        />
        <LogisticsField
          label="Ancho empaque"
          name="pv-w"
          value={widCm}
          setValue={setWidCm}
          readOnly={readOnly}
          unit="cm"
        />
        <LogisticsField
          label="Alto empaque"
          name="pv-h"
          value={heiCm}
          setValue={setHeiCm}
          readOnly={readOnly}
          unit="cm"
        />
        <LogisticsField
          label="Divisor K (volumétrico)"
          name="pv-k"
          value={divK}
          setValue={setDivK}
          readOnly={readOnly}
          unit="K"
          placeholder="Vacío → 5000"
          integer
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Peso volumétrico estimado:{" "}
        <strong className="text-foreground">
          {volumetricPreview != null ? `${formatNumber(volumetricPreview)} kg` : "—"}
        </strong>
        {divK.trim() ? "" : " (K=5000 por defecto)"}
      </p>
      <div className="absolute bottom-2 left-4 right-2 flex flex-col items-end gap-2">
        {error ? (
          <Alert variant="error" className="w-full" data-test-id="pv-detail-logistics-error">
            {error}
          </Alert>
        ) : null}
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar despacho" : "Editar despacho"}
          onClick={toggleEditOrSave}
          disabled={pending}
          isLoading={pending}
          data-test-id="pv-detail-logistics-edit-save"
        />
      </div>
    </section>
  );
}
