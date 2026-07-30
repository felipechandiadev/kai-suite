"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";

export type VariantAttributesPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  attributes: AttributeListItem[];
  selections: Record<string, string | null>;
  onSave: (next: Record<string, string | null>) => void;
  title?: string;
  "data-test-id"?: string;
};

export function VariantAttributesPickerDialog({
  open,
  onClose,
  attributes,
  selections,
  onSave,
  title = "Atributos de la variante",
  "data-test-id": dataTestId,
}: VariantAttributesPickerDialogProps) {
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const becameOpen = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!becameOpen) {
      return;
    }
    const next: Record<string, string | null> = {};
    for (const a of attributes) {
      next[a.id] = selections[a.id] ?? null;
    }
    setDraft(next);
  }, [open, attributes, selections]);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      scroll="paper"
      maxHeight="min(70vh, 560px)"
      zIndex={60}
      actionsJustify="end"
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onClose}
            data-test-id={dataTestId ? `${dataTestId}-cancel` : undefined}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            data-test-id={dataTestId ? `${dataTestId}-save` : undefined}
          >
            Guardar
          </Button>
        </>
      }
      data-test-id={dataTestId}
    >
      <div className="flex flex-col gap-6 py-1">
        {attributes.map((a) => (
          <div key={a.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{a.name}</p>
              {draft[a.id] != null ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
                  onClick={() => setDraft((p) => ({ ...p, [a.id]: null }))}
                  data-test-id={dataTestId ? `${dataTestId}-clear-${a.id}` : undefined}
                >
                  Sin definir
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {a.options.map((opt) => {
                const selected = draft[a.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, [a.id]: opt }))}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                    data-test-id={dataTestId ? `${dataTestId}-opt-${a.id}-${opt}` : undefined}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
