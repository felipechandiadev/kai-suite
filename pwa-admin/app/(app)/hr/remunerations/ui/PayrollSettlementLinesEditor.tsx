"use client";

import { IconButton } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import {
  deductionTypeOptions,
  earningTypeOptions,
  type PayrollLineCategory,
} from "@/features/hr-remunerations/lib/payroll-line-types";
import type { PayrollSettlementDraftLine } from "@/features/hr-remunerations/lib/payroll-settlement-calc";

type PayrollSettlementLinesEditorProps = {
  title: string;
  category: PayrollLineCategory;
  lines: PayrollSettlementDraftLine[];
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onPatchLine: (id: string, patch: Partial<Pick<PayrollSettlementDraftLine, "typeId" | "amount">>) => void;
  disabled?: boolean;
  "data-test-id"?: string;
};

function typeOptions(category: PayrollLineCategory): Option[] {
  const source = category === "EARNING" ? earningTypeOptions() : deductionTypeOptions();
  return source.map((o) => ({ id: o.id, label: o.label }));
}

export function PayrollSettlementLinesEditor({
  title,
  category,
  lines,
  onAddLine,
  onRemoveLine,
  onPatchLine,
  disabled = false,
  "data-test-id": dataTestId,
}: PayrollSettlementLinesEditorProps) {
  const options = typeOptions(category);

  return (
    <div className="flex flex-col gap-3" data-test-id={dataTestId}>
      <div className="flex items-center gap-2">
        <IconButton
          type="button"
          icon="Plus"
          variant="action"
          size="sm"
          title="Agregar línea"
          ariaLabel="Agregar línea"
          onClick={onAddLine}
          disabled={disabled}
          data-test-id={dataTestId ? `${dataTestId}-add` : undefined}
        />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,11rem)_auto] sm:items-end"
            data-test-id={dataTestId ? `${dataTestId}-row-${index}` : undefined}
          >
            <Select
              label="Concepto"
              name={`payroll-line-type-${line.id}`}
              placeholder="Seleccione tipo"
              options={options}
              value={line.typeId || null}
              onChange={(v) => onPatchLine(line.id, { typeId: v != null ? String(v) : "" })}
              disabled={disabled}
              data-test-id={dataTestId ? `${dataTestId}-type-${index}` : undefined}
            />
            <TextField
              label="Monto"
              name={`payroll-line-amount-${line.id}`}
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={line.amount}
              onChange={(e) => onPatchLine(line.id, { amount: e.target.value })}
              disabled={disabled}
              data-test-id={dataTestId ? `${dataTestId}-amount-${index}` : undefined}
            />
            <div className="flex justify-end pb-1 sm:pb-0">
              <IconButton
                icon="Trash2"
                variant="action"
                size="sm"
                title="Eliminar línea"
                ariaLabel="Eliminar línea"
                onClick={() => onRemoveLine(line.id)}
                disabled={disabled}
                data-test-id={dataTestId ? `${dataTestId}-remove-${index}` : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
