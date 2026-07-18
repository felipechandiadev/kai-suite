"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, IconButton, Select, Switch, TextField } from "@kai/ui";
import {
  getDiningNumberingSettingsAction,
  updateDiningNumberingSettingsAction,
} from "@/features/kaifood-dining/actions/dining-numbering.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

type Props = {
  branches: BranchListItem[];
};

export function DiningNumberingSettingsPanel({ branches }: Props) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [timezone, setTimezone] = useState("America/Santiago");
  const [resetTimeLocal, setResetTimeLocal] = useState("00:00:01");
  const [allowWaiterOpenTable, setAllowWaiterOpenTable] = useState(true);
  const [allowPosOpenTable, setAllowPosOpenTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!branchId.trim()) return;
    setLoading(true);
    setError(null);
    void getDiningNumberingSettingsAction(branchId).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setTimezone(res.settings.timezone);
      setResetTimeLocal(res.settings.resetTimeLocal);
      setAllowWaiterOpenTable(res.settings.allowWaiterOpenTable !== false);
      setAllowPosOpenTable(res.settings.allowPosOpenTable === true);
    });
  }, [branchId]);

  const handleSave = () => {
    if (!branchId.trim()) return;
    if (!allowWaiterOpenTable && !allowPosOpenTable) {
      setError("Debe habilitar al menos mesero o POS para abrir mesas.");
      return;
    }
    setError(null);
    startTransition(() => {
      void updateDiningNumberingSettingsAction(branchId, {
        timezone: timezone.trim(),
        resetTimeLocal: resetTimeLocal.trim(),
        allowWaiterOpenTable,
        allowPosOpenTable,
      }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setTimezone(res.settings.timezone);
        setResetTimeLocal(res.settings.resetTimeLocal);
        setAllowWaiterOpenTable(res.settings.allowWaiterOpenTable !== false);
        setAllowPosOpenTable(res.settings.allowPosOpenTable === true);
      });
    });
  };

  if (branches.length === 0) {
    return (
      <Alert variant="warning">
        No hay sucursales disponibles para configurar KaiFood.
      </Alert>
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6"
      data-test-id="kaifood-numbering-settings"
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configuración KaiFood</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Correlativos de barra/para llevar y quién puede abrir cuentas de mesa, por sucursal.
        </p>
      </div>

      <Select
        label="Sucursal"
        density="compact"
        value={branchId || null}
        onChange={(id) => setBranchId(id ? String(id) : "")}
        options={branches.map((b) => ({ id: b.id, label: b.name }))}
        alwaysShowLabel
        data-test-id="kaifood-numbering-branch"
      />

      {error ? (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Timezone"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        placeholder="America/Santiago"
        helperText="Zona horaria IANA de la sucursal."
        disabled={loading || pending}
        data-test-id="kaifood-numbering-timezone"
      />

      <TextField
        label="Hora de reset (HH:mm:ss)"
        value={resetTimeLocal}
        onChange={(e) => setResetTimeLocal(e.target.value)}
        placeholder="00:00:01"
        helperText="Antes de esta hora local sigue el correlativo del día anterior."
        disabled={loading || pending}
        data-test-id="kaifood-numbering-reset-time"
      />

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
        <p className="mb-3 text-sm font-medium text-foreground">
          Quién puede abrir cuentas de mesa
        </p>
        <div className="flex flex-col gap-3">
          <Switch
            label="Mesero (kai-waiter)"
            labelPosition="left"
            checked={allowWaiterOpenTable}
            onChange={setAllowWaiterOpenTable}
            disabled={loading || pending}
            density="compact"
            data-test-id="kaifood-allow-waiter-open-table"
          />
          <Switch
            label="POS (pantalla Cuentas)"
            labelPosition="left"
            checked={allowPosOpenTable}
            onChange={setAllowPosOpenTable}
            disabled={loading || pending}
            density="compact"
            data-test-id="kaifood-allow-pos-open-table"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Debe quedar al menos un canal habilitado. Barra y para llevar siempre se abren desde el
          POS.
        </p>
      </div>

      <div className="flex justify-end">
        <IconButton
          icon="Save"
          variant="primary"
          size="md"
          ariaLabel={pending ? "Guardando configuración" : "Guardar configuración"}
          title={pending ? "Guardando…" : "Guardar"}
          disabled={loading || pending || !branchId.trim()}
          isLoading={pending}
          onClick={handleSave}
          data-test-id="kaifood-numbering-save"
        />
      </div>
    </div>
  );
}
