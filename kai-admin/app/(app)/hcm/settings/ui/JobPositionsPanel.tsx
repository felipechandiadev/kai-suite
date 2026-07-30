"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  Switch,
  TextField,
} from "@kai/ui";
import {
  createJobPositionAction,
  listJobPositionsAction,
  updateJobPositionAction,
} from "@/features/hr-job-positions/actions/job-position.action";
import type { JobPositionView } from "@/features/hr-job-positions/types/job-position.types";

type Props = {
  initialPositions: JobPositionView[];
};

export function JobPositionsPanel({ initialPositions }: Props) {
  const router = useRouter();
  const [positions, setPositions] = useState(initialPositions);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobPositionView | null>(null);
  const [name, setName] = useState("");
  const [defaultDuties, setDefaultDuties] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (includeInactive ? positions : positions.filter((p) => p.isActive)),
    [includeInactive, positions],
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setDefaultDuties("");
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: JobPositionView) {
    setEditing(p);
    setName(p.name);
    setDefaultDuties(p.defaultDuties ?? "");
    setIsActive(p.isActive);
    setError(null);
    setDialogOpen(true);
  }

  function reload() {
    startTransition(async () => {
      const res = await listJobPositionsAction(true);
      if (res.success) setPositions(res.data);
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
        const res = await updateJobPositionAction(editing.id, {
          name: name.trim(),
          defaultDuties: defaultDuties.trim() || null,
          isActive,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
      } else {
        const res = await createJobPositionAction({
          name: name.trim(),
          defaultDuties: defaultDuties.trim() || null,
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
    <div className="space-y-4" data-test-id="job-positions-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Catálogo de cargos. Las funciones plantilla se copian al contrato al
          seleccionar el cargo. El código (JP#####) lo asigna el sistema.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            Incluir inactivos
          </label>
          <Button variant="primary" size="sm" onClick={openCreate}>
            Nuevo cargo
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin cargos</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            >
              <div>
                <div className="font-medium text-foreground">
                  {p.name}
                  {p.code ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {p.code}
                    </span>
                  ) : null}
                  {!p.isActive ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (inactivo)
                    </span>
                  ) : null}
                </div>
                {p.defaultDuties ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {p.defaultDuties}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => openEdit(p)}
                >
                  Editar
                </Button>
                {p.isActive ? (
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await updateJobPositionAction(p.id, {
                          isActive: false,
                        });
                        if (!res.success) setError(res.message);
                        else reload();
                      });
                    }}
                  >
                    Inactivar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Editar cargo" : "Nuevo cargo"}
        hideActions
        size="sm"
      >
        <div className="space-y-3 p-1">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {editing?.code ? (
            <p className="text-xs text-muted-foreground">
              Código: <span className="font-medium">{editing.code}</span>
            </p>
          ) : null}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Funciones (plantilla)"
            type="textarea"
            rows={5}
            value={defaultDuties}
            onChange={(e) => setDefaultDuties(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onChange={setIsActive} />
            <span className="text-sm">Activo</span>
          </div>
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
