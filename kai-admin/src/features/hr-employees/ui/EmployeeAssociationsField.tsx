"use client";

import { useMemo, useState } from "react";
import { IconButton, Select } from "@kai/ui";

export type EmployeeAssociationOption = {
  id: string;
  label: string;
};

type Props = {
  options: EmployeeAssociationOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
  alertText?: string;
};

/**
 * Select + Plus para asociar 0..N empleados; lista con quitar debajo.
 */
export function EmployeeAssociationsField({
  options,
  value,
  onChange,
  label = "Empleados",
  disabled,
  helperText,
  alertText = "Un empleado no puede pertenecer a más de una unidad de producción (ni vía unidad laboral).",
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
    <div className="space-y-2" data-test-id="employee-associations-field">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
      {alertText ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-200"
          role="status"
          data-test-id="employee-associations-alert"
        >
          {alertText}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select
            label="Agregar empleado"
            value={pendingId}
            onChange={(v) => setPendingId(v != null ? String(v) : "")}
            disabled={disabled || available.length === 0}
            options={[
              {
                id: "",
                label: available.length ? "Seleccionar…" : "Sin más empleados",
              },
              ...available.map((o) => ({
                id: o.id,
                label: o.label,
              })),
            ]}
          />
        </div>
        <IconButton
          icon="Plus"
          variant="action"
          size="md"
          ariaLabel="Agregar empleado"
          disabled={disabled || !pendingId}
          onClick={add}
          data-test-id="employee-associations-add"
        />
      </div>
      {value.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {value.map((id) => {
            const opt = byId.get(id);
            const title = opt?.label ?? id;
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
        <p className="text-xs text-muted-foreground">Ninguno asociado</p>
      )}
    </div>
  );
}
