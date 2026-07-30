"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import { createFiscalSubPackAction } from "../actions/fiscal.actions";
import type { FiscalCafPackage, FiscalSubPack } from "../types/fiscal.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";

type Props = {
  open: boolean;
  onClose: () => void;
  pkg: FiscalCafPackage;
  pointsOfSale: PointOfSaleListItem[];
  existingSubPacks?: FiscalSubPack[];
};

export function AssignSubPackDialog({
  open,
  onClose,
  pkg,
  pointsOfSale,
  existingSubPacks = [],
}: Props) {
  const router = useRouter();
  const [posId, setPosId] = useState("");
  const [rangeFrom, setRangeFrom] = useState(String(pkg.rangeFrom));
  const [rangeTo, setRangeTo] = useState(String(pkg.rangeTo));
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const posOptions = pointsOfSale
    .filter((p) => p.isActive && (p.kind ?? "SALE") === "SALE")
    .map((p) => ({
      id: p.id,
      label: p.branch?.name ? `${p.name} (${p.branch.name})` : p.name,
    }));

  const posExistingSubPacks = useMemo(
    () => existingSubPacks.filter((sp) => sp.pointOfSaleId === posId && sp.isActive),
    [existingSubPacks, posId],
  );

  const suggestedRangeFrom = useMemo(() => {
    if (posExistingSubPacks.length === 0) return pkg.rangeFrom;
    return Math.max(...posExistingSubPacks.map((sp) => sp.rangeTo)) + 1;
  }, [posExistingSubPacks, pkg.rangeFrom]);

  useEffect(() => {
    if (!open) return;
    setPosId("");
    setRangeFrom(String(pkg.rangeFrom));
    setRangeTo(String(pkg.rangeTo));
    setLabel("");
    setError("");
  }, [open, pkg.id, pkg.rangeFrom, pkg.rangeTo]);

  useEffect(() => {
    if (!posId) return;
    setRangeFrom(String(suggestedRangeFrom));
  }, [posId, suggestedRangeFrom]);

  async function handleSubmit() {
    if (!posId) {
      setError("Seleccione un punto de venta");
      return;
    }
    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      setError("Rango inválido");
      return;
    }
    setBusy(true);
    setError("");
    const res = await createFiscalSubPackAction(pkg.id, {
      pointOfSaleId: posId,
      rangeFrom: from,
      rangeTo: to,
      label: label.trim() || undefined,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Asignar sub-paquete · ${pkg.packageCode}`}
      size="sm"
      data-test-id="assign-sub-pack-dialog"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? "Guardando…" : "Asignar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Paquete SII: {pkg.rangeFrom} – {pkg.rangeTo}. El rango debe estar contenido en el paquete
          y no solaparse con otros sub-paquetes del mismo CAF. Un POS puede tener varios
          sub-paquetes; se usarán en orden por rango.
        </p>
        <Select
          label="Punto de venta"
          name="sub-pack-pos"
          value={posId || null}
          onChange={(id) => setPosId(id != null ? String(id) : "")}
          options={posOptions}
          placeholder="Seleccionar POS"
          required
        />
        {posExistingSubPacks.length > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            <p className="font-medium">Este POS ya tiene sub-paquetes en este CAF:</p>
            <ul className="mt-1 list-inside list-disc">
              {posExistingSubPacks.map((sp) => (
                <li key={sp.id}>
                  {sp.rangeFrom}–{sp.rangeTo}
                  {sp.isCurrent ? " (corriente)" : sp.isExhausted ? " (agotado)" : " (standby)"}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-muted-foreground">
              Sugerido desde folio {suggestedRangeFrom}. Puede haber huecos; evite solapamientos.
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Desde"
            name="sub-pack-from"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            inputMode="numeric"
          />
          <TextField
            label="Hasta"
            name="sub-pack-to"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <TextField
          label="Etiqueta (opcional)"
          name="sub-pack-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej. Caja 1"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </Dialog>
  );
}
