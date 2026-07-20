"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  Select,
  Switch,
  TextField,
  type Option,
} from "@kai/ui";
import {
  createShiftSystemAction,
  listShiftSystemsAction,
  updateShiftSystemAction,
} from "@/features/hr-shift-systems/actions/shift-system.action";
import type {
  CreateShiftSystemInput,
  ShiftSystemType,
  ShiftSystemView,
} from "@/features/hr-shift-systems/types/shift-system.types";
import {
  SEED_SHIFT_SYSTEM_CODES,
  SHIFT_SYSTEM_TYPE_LABELS,
} from "@/features/hr-shift-systems/types/shift-system.types";

type Props = {
  initialSystems: ShiftSystemView[];
};

const TYPE_OPTIONS: Option[] = Object.entries(SHIFT_SYSTEM_TYPE_LABELS).map(
  ([id, label]) => ({ id, label }),
);

export function ShiftSystemsPanel({ initialSystems }: Props) {
  const router = useRouter();
  const [systems, setSystems] = useState(initialSystems);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftSystemView | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ShiftSystemType>("ROTATING");
  const [requiresPlanner, setRequiresPlanner] = useState(true);
  const [generatesLate, setGeneratesLate] = useState(true);
  const [overtimeEnabled, setOvertimeEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (includeInactive ? systems : systems.filter((s) => s.isActive)),
    [includeInactive, systems],
  );

  const isSeed = (code: string) =>
    (SEED_SHIFT_SYSTEM_CODES as readonly string[]).includes(code);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("ROTATING");
    setRequiresPlanner(true);
    setGeneratesLate(true);
    setOvertimeEnabled(true);
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(s: ShiftSystemView) {
    setEditing(s);
    setName(s.name);
    setType(s.type);
    setRequiresPlanner(s.requiresPlannerAssignment);
    setGeneratesLate(s.generatesLateEvents);
    setOvertimeEnabled(s.overtimeEnabled);
    setIsActive(s.isActive);
    setError(null);
    setDialogOpen(true);
  }

  function reload() {
    startTransition(async () => {
      const res = await listShiftSystemsAction(true);
      if (res.success) setSystems(res.data);
      router.refresh();
    });
  }

  function save() {
    if (!name.trim()) {
      setError("Nombre requerido");
      return;
    }
    startTransition(async () => {
      if (editing) {
        const body: Partial<CreateShiftSystemInput> = {
          name: name.trim(),
          isActive,
        };
        if (!isSeed(editing.code)) {
          body.type = type;
          body.requiresPlannerAssignment = requiresPlanner;
          body.generatesLateEvents = generatesLate;
          body.overtimeEnabled = overtimeEnabled;
        }
        const res = await updateShiftSystemAction(editing.id, body);
        if (!res.success) {
          setError(res.message);
          return;
        }
      } else {
        const res = await createShiftSystemAction({
          name: name.trim(),
          type,
          requiresPlannerAssignment: requiresPlanner,
          generatesLateEvents: generatesLate,
          overtimeEnabled,
          isActive,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
      }
      setDialogOpen(false);
      reload();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Catálogo de sistemas de jornada. Define cómo el motor evalúa atrasos y
          horas extras según el contrato.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            Incluir inactivos
          </label>
          <Button variant="primary" onClick={openCreate}>
            Nuevo sistema
          </Button>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {visible.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">
                {s.name}{" "}
                <span className="text-xs text-muted-foreground">({s.code})</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {SHIFT_SYSTEM_TYPE_LABELS[s.type] ?? s.type}
                {!s.isActive ? " · Inactivo" : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {s.requiresPlannerAssignment ? (
                  <span className="rounded bg-muted px-2 py-0.5">Planificador</span>
                ) : null}
                {s.generatesLateEvents ? (
                  <span className="rounded bg-muted px-2 py-0.5">Atrasos</span>
                ) : null}
                {s.overtimeEnabled ? (
                  <span className="rounded bg-muted px-2 py-0.5">HE</span>
                ) : null}
              </div>
            </div>
            <Button variant="outlined" size="sm" onClick={() => openEdit(s)}>
              Editar
            </Button>
          </div>
        ))}
        {visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin sistemas.</p>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Editar sistema de jornada" : "Nuevo sistema de jornada"}
        hideActions
        size="sm"
      >
        <div className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {editing && isSeed(editing.code) ? (
            <Alert variant="info">
              Sistema del catálogo base: solo puede editar nombre y estado activo.
            </Alert>
          ) : (
            <>
              <Select
                label="Tipo"
                options={TYPE_OPTIONS}
                value={type}
                onChange={(id) => setType(String(id ?? "ROTATING") as ShiftSystemType)}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={requiresPlanner}
                  onChange={setRequiresPlanner}
                />
                Requiere asignación en planificador
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={generatesLate}
                  onChange={setGeneratesLate}
                />
                Genera eventos de atraso
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={overtimeEnabled}
                  onChange={setOvertimeEnabled}
                />
                Habilita horas extras automáticas
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onChange={setIsActive} />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={pending} onClick={save}>
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
