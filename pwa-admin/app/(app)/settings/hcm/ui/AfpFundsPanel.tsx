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
  createAfpFundAction,
  listAfpFundsAction,
  updateAfpFundAction,
} from "@/features/hr-afp-funds/actions/afp-fund.action";
import type { AfpFundView } from "@/features/hr-afp-funds/types/afp-fund.types";

type Props = {
  initialFunds: AfpFundView[];
};

export function AfpFundsPanel({ initialFunds }: Props) {
  const router = useRouter();
  const [funds, setFunds] = useState(initialFunds);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AfpFundView | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("10.00");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (includeInactive ? funds : funds.filter((f) => f.isActive)),
    [includeInactive, funds],
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setPercent("10.00");
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(f: AfpFundView) {
    setEditing(f);
    setName(f.name);
    setPercent(f.contributionPercent);
    setIsActive(f.isActive);
    setError(null);
    setDialogOpen(true);
  }

  function reload() {
    startTransition(async () => {
      const res = await listAfpFundsAction(true);
      if (res.success) setFunds(res.data);
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
        const res = await updateAfpFundAction(editing.id, {
          name: name.trim(),
          contributionPercent: percent.trim(),
          isActive,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
      } else {
        const res = await createAfpFundAction({
          name: name.trim(),
          contributionPercent: percent.trim(),
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
    <div className="space-y-4" data-test-id="afp-funds-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Catálogo de AFP. El código (AFP#####) lo asigna el sistema.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            Incluir inactivas
          </label>
          <Button variant="primary" size="sm" onClick={openCreate}>
            Nueva AFP
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin AFP</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            >
              <div>
                <div className="font-medium text-foreground">
                  {f.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {f.code}
                  </span>
                  {!f.isActive ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (inactiva)
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cotización: {f.contributionPercent}%
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => openEdit(f)}
                >
                  Editar
                </Button>
                {f.isActive ? (
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await updateAfpFundAction(f.id, {
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
        title={editing ? "Editar AFP" : "Nueva AFP"}
        hideActions
        size="sm"
      >
        <div className="space-y-3 p-1">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {editing?.code ? (
            <p className="text-xs text-muted-foreground">
              Código: <span className="font-medium">{editing.code}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              El código se asigna automáticamente al guardar.
            </p>
          )}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Porcentaje de cotización"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onChange={setIsActive} />
            <span className="text-sm">Activa</span>
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
