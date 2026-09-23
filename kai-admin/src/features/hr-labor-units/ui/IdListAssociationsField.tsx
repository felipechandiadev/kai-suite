"use client";

import { useMemo, useState } from "react";
import { IconButton, Select } from "@kai/ui";

export type IdListAssociationOption = {
  id: string;
  code?: string;
  name: string;
};

type Props = {
  options: IdListAssociationOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
  addLabel: string;
  addAriaLabel: string;
  emptyAvailableLabel: string;
  noneLabel?: string;
  disabled?: boolean;
  helperText?: string;
  testId?: string;
  addTestId?: string;
};

function optionTitle(opt: IdListAssociationOption | undefined, fallbackId: string): string {
  if (!opt) return fallbackId;
  return opt.code ? `${opt.code} · ${opt.name}` : opt.name;
}

export function IdListAssociationsField({
  options,
  value,
  onChange,
  label,
  addLabel,
  addAriaLabel,
  emptyAvailableLabel,
  noneLabel = "Ninguna asociada",
  disabled,
  helperText,
  testId,
  addTestId,
}: Props) {
  const [pendingId, setPendingId] = useState("");

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

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
    <div className="space-y-2" data-test-id={testId}>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select
            label={addLabel}
            value={pendingId}
            onChange={(v) => setPendingId(v != null ? String(v) : "")}
            disabled={disabled || available.length === 0}
            options={[
              {
                id: "",
                label: available.length ? "Seleccionar…" : emptyAvailableLabel,
              },
              ...available.map((o) => ({
                id: o.id,
                label: optionTitle(o, o.id),
              })),
            ]}
          />
        </div>
        <IconButton
          icon="Plus"
          variant="action"
          size="md"
          ariaLabel={addAriaLabel}
          disabled={disabled || !pendingId}
          onClick={add}
          data-test-id={addTestId}
        />
      </div>
      {value.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {value.map((id) => {
            const title = optionTitle(byId.get(id), id);
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
        <p className="text-xs text-muted-foreground">{noneLabel}</p>
      )}
    </div>
  );
}
