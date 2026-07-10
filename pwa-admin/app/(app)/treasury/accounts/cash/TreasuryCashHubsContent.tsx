"use client";

import { useMemo, useState, useTransition } from "react";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { createCashHubAction } from "@/features/treasury-cash-hubs/actions/cash-hub.action";
import { Card } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";

type Props = {
  companyId: string;
  initialHubs: CashHubRow[];
  branches: BranchListItem[];
  pointsOfSale: PointOfSaleListItem[];
};

export default function TreasuryCashHubsContent({
  companyId,
  initialHubs,
  branches,
  pointsOfSale,
}: Props) {
  const [name, setName] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<Record<string, boolean>>({});
  const [selectedPos, setSelectedPos] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) {
      m.set(b.id, b.name);
    }
    return m;
  }, [branches]);

  const toggle = (map: Record<string, boolean>, id: string, next: boolean) => ({
    ...map,
    [id]: next,
  });

  const branchIdsSelected = () =>
    Object.entries(selectedBranches)
      .filter(([, v]) => v)
      .map(([id]) => id);

  const posIdsSelected = () =>
    Object.entries(selectedPos)
      .filter(([, v]) => v)
      .map(([id]) => id);

  const onCreate = () => {
    setError(null);
    setInfo(null);
    const bIds = branchIdsSelected();
    const pIds = posIdsSelected();
    if (!name.trim()) {
      setError("Indique un nombre para el centro de acopio.");
      return;
    }
    if (pIds.length === 0) {
      setError("Seleccione al menos un punto de venta.");
      return;
    }
    startTransition(async () => {
      const r = await createCashHubAction({
        companyId,
        name: name.trim(),
        branchIds: bIds,
        pointOfSaleIds: pIds,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setInfo("Centro de acopio creado.");
      setName("");
      setSelectedBranches({});
      setSelectedPos({});
      window.location.reload();
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Centros de acopio (efectivo)</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Agrupe efectivo físico por sucursal y punto de venta. Al cerrar una sesión de caja, el saldo puede
          consolidarse automáticamente en el hub vinculado al POS (o el hub indicado al cerrar). Los depósitos a
          banco pueden registrarse desde el hub.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {info ? <Alert variant="success">{info}</Alert> : null}

      <Card
        title="Nuevo centro de acopio"
        content={
          <div className="flex flex-col gap-3">
            <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Sucursales vinculadas (opcional)</p>
              <div className="flex max-h-36 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedBranches[b.id])}
                      onChange={(e) =>
                        setSelectedBranches((m) => toggle(m, b.id, e.target.checked))
                      }
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Puntos de venta (requerido, mínimo 1)</p>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
                {pointsOfSale.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedPos[p.id])}
                      onChange={(e) => setSelectedPos((m) => toggle(m, p.id, e.target.checked))}
                    />
                    <span className="min-w-0">
                      {p.name}
                      <span className="text-muted-foreground">
                        {" "}
                        — {p.branch?.name ?? branchNameById.get(p.branchId ?? "") ?? "sucursal"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Button type="button" onClick={onCreate} disabled={pending}>
                {pending ? "Guardando…" : "Crear centro"}
              </Button>
            </div>
          </div>
        }
      />

      <Card
        title="Centros configurados"
        content={
          initialHubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay centros de acopio aún.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {initialHubs.map((h) => (
                <li
                  key={h.id}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                >
                  <div className="font-medium">{h.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Sucursales: {(h.branches ?? []).map((b) => b.name ?? b.id).join(", ") || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    POS: {(h.pointsOfSale ?? []).map((p) => p.name ?? p.id).join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      />
    </div>
  );
}
