"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Button } from "@kai/ui";
import { createAutomationRuleAction } from "@/features/automation/actions/automation.action";
import type { AutomationActionType, CreateAutomationRuleInput } from "@/features/automation/types/automation.types";
import { AUTOMATION_ACTION_OPTIONS, AUTOMATION_EVENT_OPTIONS } from "./automationOptions";
import { TRANSACTION_TYPE_OPTIONS } from "@/features/transactions/types/transaction-types";

type ActionDraft = {
  type: AutomationActionType;
  isActive: boolean;
  sortOrder: number;
  paramsJson: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CreateAutomationRuleDialog({ open, onOpenChange }: Props) {
  const [eventType, setEventType] = useState<CreateAutomationRuleInput["eventType"]>("TRANSACTION_CREATED");
  const [priority, setPriority] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [filtersJson, setFiltersJson] = useState<string>('{}');
  const [actions, setActions] = useState<ActionDraft[]>([
    { type: "GENERATE_LEDGER_ENTRIES", isActive: true, sortOrder: 0, paramsJson: "{}" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!eventType) return false;
    if (!Number.isFinite(Number(priority))) return false;
    if (actions.length === 0) return false;
    return true;
  }, [actions.length, eventType, priority]);

  const addAction = () => {
    setActions((prev) => [
      ...prev,
      { type: "CREATE_DERIVED_TRANSACTION", isActive: true, sortOrder: prev.length, paramsJson: "{}" },
    ]);
  };

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, sortOrder: i })));
  };

  const defaultDerivedParams = () => {
    const type = TRANSACTION_TYPE_OPTIONS.find((t) => t.id === "PAYMENT_IN")?.id ?? "PAYMENT_IN";
    return JSON.stringify(
      {
        transactionType: type,
        linkMode: "relatedTransactionId",
        copyFields: ["paymentMethod", "paymentStatus"],
        setFields: {},
        lineStrategy: "none",
      },
      null,
      2,
    );
  };

  const onSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const filters = JSON.parse(filtersJson || "{}");
      const mappedActions = actions.map((a) => {
        const params = a.paramsJson && a.paramsJson.trim() ? JSON.parse(a.paramsJson) : {};
        return {
          type: a.type,
          isActive: a.isActive,
          sortOrder: a.sortOrder,
          params: params ?? null,
        };
      });
      const input: CreateAutomationRuleInput = {
        eventType,
        priority: Number(priority) || 0,
        isActive,
        filters: filters ?? null,
        actions: mappedActions,
      };
      const r = await createAutomationRuleAction(input);
      if (!r.success) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear regla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Crear regla de automatización"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || saving} onClick={onSubmit}>
            {saving ? "Creando..." : "Crear"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <Select
          label="Evento"
          options={AUTOMATION_EVENT_OPTIONS}
          value={eventType}
          onChange={(v) => setEventType(String(v) as any)}
        />

        <TextField
          label="Prioridad"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          type="number"
        />

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Activa</div>
            <div className="text-xs text-muted-foreground">Si está inactiva, no se ejecuta</div>
          </div>
          <Switch checked={isActive} onChange={setIsActive} />
        </div>

        <TextField
          label="Filtros (JSON)"
          value={filtersJson}
          onChange={(e) => setFiltersJson(e.target.value)}
          rows={5}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Acciones</div>
            <Button variant="secondary" onClick={addAction}>
              Agregar acción
            </Button>
          </div>

          <div className="space-y-3">
            {actions.map((a, idx) => (
              <div key={idx} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      label="Tipo"
                      options={AUTOMATION_ACTION_OPTIONS}
                      value={a.type}
                      onChange={(v) => {
                        const nextType = String(v) as AutomationActionType;
                        setActions((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  type: nextType,
                                  paramsJson:
                                    nextType === "CREATE_DERIVED_TRANSACTION" ? defaultDerivedParams() : "{}",
                                }
                              : x,
                          ),
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">Activa</div>
                    <Switch
                      checked={a.isActive}
                      onChange={(v) =>
                        setActions((prev) => prev.map((x, i) => (i === idx ? { ...x, isActive: v } : x)))
                      }
                    />
                  </div>
                  <Button variant="danger" onClick={() => removeAction(idx)}>
                    Quitar
                  </Button>
                </div>

                <TextField
                  label="Params (JSON)"
                  value={a.paramsJson}
                  onChange={(e) =>
                    setActions((prev) => prev.map((x, i) => (i === idx ? { ...x, paramsJson: e.target.value } : x)))
                  }
                  rows={6}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

