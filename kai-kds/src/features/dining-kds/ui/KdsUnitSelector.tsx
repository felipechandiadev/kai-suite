"use client";

import { useEffect, useState } from "react";
import { Button } from "@kai/ui";
import type { ProductionUnitDto } from "../infrastructure/dining-kds.request";
import { listProductionUnitsAction } from "../actions/kds.action";
import {
  loadKdsProductionUnitId,
  saveKdsProductionUnitId,
  type KdsSession,
} from "@/lib/app-session";

type KdsUnitSelectorProps = {
  session: KdsSession;
  value: string | null;
  onChange: (unitId: string) => void;
};

export function KdsUnitSelector({ session, value, onChange }: KdsUnitSelectorProps) {
  const [units, setUnits] = useState<ProductionUnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listProductionUnitsAction({
          userId: session.userId,
          companyId: session.companyId,
        });
        if (cancelled) return;
        setUnits(list.filter((u) => u.isActive));
        const saved = loadKdsProductionUnitId();
        if (saved && list.some((u) => u.id === saved)) {
          onChange(saved);
        } else if (list.length === 1) {
          onChange(list[0].id);
          saveKdsProductionUnitId(list[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar unidades");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.userId, session.companyId, onChange]);

  const handleSelect = (unitId: string) => {
    saveKdsProductionUnitId(unitId);
    onChange(unitId);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando unidades…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay unidades de producción activas. Configúralas en admin.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" data-test-id="kds-unit-selector">
      {units.map((unit) => {
        const active = value === unit.id;
        return (
          <Button
            key={unit.id}
            type="button"
            variant={active ? "primary" : "outlined"}
            size="sm"
            onClick={() => handleSelect(unit.id)}
            data-test-id={`kds-unit-${unit.code}`}
          >
            {unit.name}
          </Button>
        );
      })}
    </div>
  );
}
