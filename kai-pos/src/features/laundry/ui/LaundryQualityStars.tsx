"use client";

import type { LaundryAttributeValue } from "@/features/laundry/types/laundry.types";

export const LAUNDRY_QUALITY_ATTRIBUTE_CODE = "CALIDAD";

type Props = {
  label: string;
  values: LaundryAttributeValue[];
  valueId: string | null;
  onChange: (valueId: string | null) => void;
  "data-test-id"?: string;
};

/**
 * Selector 1–5 estrellas para el atributo de catálogo `CALIDAD`.
 * Mapea estrella n → valor activo ordenado por `sortOrder` (índice n-1).
 */
export default function LaundryQualityStars({
  label,
  values,
  valueId,
  onChange,
  "data-test-id": dataTestId,
}: Props) {
  const ordered = [...values]
    .filter((v) => v.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  const selectedIndex = valueId
    ? ordered.findIndex((v) => v.id === valueId)
    : -1;
  const selectedStars = selectedIndex >= 0 ? selectedIndex + 1 : 0;
  const selectedLabel =
    selectedIndex >= 0 ? ordered[selectedIndex]?.label ?? null : null;

  const maxStars = Math.min(5, Math.max(1, ordered.length || 5));

  return (
    <div className="space-y-1.5" data-test-id={dataTestId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {selectedLabel ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(null)}
            data-test-id={dataTestId ? `${dataTestId}-clear` : undefined}
          >
            Quitar
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <div className="flex shrink-0 items-center gap-1">
          {Array.from({ length: maxStars }, (_, i) => {
            const stars = i + 1;
            const value = ordered[i];
            const active = selectedStars >= stars;
            return (
              <button
                key={stars}
                type="button"
                disabled={!value}
                title={value?.label ?? `${stars} estrella${stars === 1 ? "" : "s"}`}
                aria-label={value?.label ?? `${stars} estrellas`}
                aria-pressed={selectedStars === stars}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-lg leading-none transition-colors disabled:opacity-40 ${
                  active
                    ? "text-amber-500"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                }`}
                onClick={() => {
                  if (!value) return;
                  onChange(valueId === value.id ? null : value.id);
                }}
                data-test-id={
                  dataTestId ? `${dataTestId}-star-${stars}` : undefined
                }
              >
                ★
              </button>
            );
          })}
        </div>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {selectedLabel ?? "Sin calidad indicada"}
        </p>
      </div>
    </div>
  );
}
