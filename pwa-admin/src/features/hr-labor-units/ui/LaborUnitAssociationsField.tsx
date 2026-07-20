"use client";

import { useMemo, useState } from "react";
import { IconButton, Select } from "@kai/ui";

export type LaborUnitOption = {
  id: string;
  code?: string;
  name: string;
};

type Props = {
  options: LaborUnitOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
};

/**
 * Select + Plus para asociar 0..N unidades laborales; lista con quitar debajo.
 */
export function LaborUnitAssociationsField({
  options,
  value,
  onChange,
  label = "Unidades laborales",
  disabled,
  helperText,
}: Props) {
  const [pendingId, setPendingId] = useState<string>("");

  const byId = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  );

  const available = useMemo(
    () => options.filter((o) => !value.includes(o.id)),
    [options, value],
  );

  function add() {
    if (!pendingId || value.includes(pendingId)) return;
    onChange([...value, pendingId]);
    setPendingId("");
  }

  function remove(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div className="space-y-2" data-test-id="labor-unit-associations-field">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select
            label="Agregar unidad laboral"
            value={pendingId}
            onChange={(v) => setPendingId(v != null ? String(v) : "")}
            disabled={disabled || available.length === 0}
            options={[
              { id: "", label: available.length ? "Seleccionar…" : "Sin más ULs" },
              ...available.map((o) => ({
                id: o.id,
                label: o.code ? `${o.code} · ${o.name}` : o.name,
              })),
            ]}
          />
        </div>
        <IconButton
          icon="Plus"
          variant="action"
          size="md"
          ariaLabel="Agregar unidad laboral"
          disabled={disabled || !pendingId}
          onClick={add}
          data-test-id="labor-unit-associations-add"
        />
      </div>
      {value.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {value.map((id) => {
            const opt = byId.get(id);
            const title = opt
              ? opt.code
                ? `${opt.code} · ${opt.name}`
                : opt.name
              : id;
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{title}</span>
                <IconButton
                  icon="X"
                  variant="ghost"
                  size="sm"
                  ariaLabel={`Quitar ${title}`}
                  disabled={disabled}
                  onClick={() => remove(id)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Ninguna asociada</p>
      )}
    </div>
  );
}
