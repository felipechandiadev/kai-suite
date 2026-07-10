"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { updateCashHubAction } from "@/features/treasury-cash-hubs/actions/cash-hub.action";

export type UpdateCashHubDialogProps = {
  open: boolean;
  hub: CashHubRow | null;
  companyId: string;
  branches: BranchListItem[];
  pointsOfSale: PointOfSaleListItem[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function UpdateCashHubDialog({
  open,
  hub,
  companyId,
  branches,
  pointsOfSale,
  onClose,
  onSaved,
}: UpdateCashHubDialogProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [posIds, setPosIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions: Option[] = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );
  const posOptions: Option[] = useMemo(
    () =>
      pointsOfSale.map((p) => ({
        id: p.id,
        label: `${p.name}${p.branch?.name ? ` · ${p.branch.name}` : ""}`,
      })),
    [pointsOfSale],
  );

  useEffect(() => {
    if (!open || !hub) {
      return;
    }
    setName(hub.name);
    setIsActive(hub.isActive !== false);
    const linkedBranch = hub.branches?.[0]?.id;
    setBranchId(linkedBranch != null ? String(linkedBranch) : null);
    setPosIds((hub.pointsOfSale ?? []).map((p) => String(p.id)));
    setError(null);
  }, [open, hub]);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!hub) {
      return;
    }
    setError(null);
    if (!name.trim()) {
      setError("Indique un nombre.");
      return;
    }
    if (posIds.length === 0) {
      setError("Seleccione al menos un punto de venta.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await updateCashHubAction({
          id: hub.id,
          companyId,
          name: name.trim(),
          isActive,
          branchIds: branchId ? [branchId] : [],
          pointOfSaleIds: posIds,
        });
        if (r.success) {
          await onSaved();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar centro de efectivo"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="cash-hub-edit-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="cash-hub-edit-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isPending || !hub}
            data-test-id="cash-hub-edit-save"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      {hub ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Centro: <span className="font-medium text-foreground">{hub.name}</span>
          </p>
          <div className="flex flex-col gap-3">
            <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Activo"
              labelPosition="right"
              data-test-id="cash-hub-edit-active"
            />
            <Select
              label="Sucursales (opcional)"
              options={branchOptions}
              value={branchId}
              onChange={(v) => setBranchId(v != null ? String(v) : null)}
              allowClear
            />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Puntos de venta (requerido, mínimo 1)
              </p>
              <div className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
                {posOptions.map((o) => {
                  const id = String(o.id);
                  const checked = posIds.includes(id);
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setPosIds((prev) => {
                            if (next) {
                              return prev.includes(id) ? prev : [...prev, id];
                            }
                            return prev.filter((x) => x !== id);
                          });
                        }}
                      />
                      <span className="min-w-0">{String(o.label)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
