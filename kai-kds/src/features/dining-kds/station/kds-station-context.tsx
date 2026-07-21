"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductionUnitDto } from "@/features/dining-kds/infrastructure/dining-kds.request";
import { listProductionUnitsAction } from "@/features/dining-kds/actions/kds.action";
import {
  loadKdsProductionUnitId,
  saveKdsProductionUnitId,
  type KdsSession,
} from "@/lib/app-session";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/kds-api-failure";

function formatUnitLabel(unit: ProductionUnitDto): string {
  return unit.name;
}

type KdsStationContextValue = {
  session: KdsSession;
  units: ProductionUnitDto[];
  unitsLoading: boolean;
  unitsError: string | null;
  productionUnitId: string | null;
  productionUnit: ProductionUnitDto | null;
  productionUnitLabel: string | null;
  setProductionUnitId: (unitId: string) => void;
  refreshUnits: () => Promise<void>;
};

const KdsStationContext = createContext<KdsStationContextValue | null>(null);

export function KdsStationProvider({
  session,
  children,
}: {
  session: KdsSession;
  children: ReactNode;
}) {
  const [units, setUnits] = useState<ProductionUnitDto[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [productionUnitId, setProductionUnitIdState] = useState<string | null>(null);

  const refreshUnits = useCallback(async () => {
    setUnitsLoading(true);
    setUnitsError(null);
    try {
      const list = await listProductionUnitsAction({
        userId: session.userId,
        companyId: session.companyId,
      });
      const active = list.filter((u) => {
        if (!u.isActive) return false;
        const purpose = String(u.purpose ?? "KITCHEN").toUpperCase();
        return purpose === "KITCHEN" || purpose === "BATCH";
      });
      setUnits(active);

      const saved = loadKdsProductionUnitId();
      if (saved && active.some((u) => u.id === saved)) {
        setProductionUnitIdState(saved);
      } else if (saved) {
        setProductionUnitIdState(null);
      } else {
        setProductionUnitIdState(null);
      }
    } catch (e) {
      if (redirectToLoginIfUnauthorized(e)) return;
      setUnitsError(e instanceof Error ? e.message : "No se pudieron cargar unidades");
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }, [session.userId, session.companyId]);

  useEffect(() => {
    setProductionUnitIdState(loadKdsProductionUnitId());
    void refreshUnits();
  }, [refreshUnits]);

  const setProductionUnitId = useCallback((unitId: string) => {
    saveKdsProductionUnitId(unitId);
    setProductionUnitIdState(unitId);
  }, []);

  const productionUnit = useMemo(
    () => units.find((u) => u.id === productionUnitId) ?? null,
    [units, productionUnitId],
  );

  const productionUnitLabel = productionUnit
    ? formatUnitLabel(productionUnit)
    : null;

  const value = useMemo(
    () => ({
      session,
      units,
      unitsLoading,
      unitsError,
      productionUnitId,
      productionUnit,
      productionUnitLabel,
      setProductionUnitId,
      refreshUnits,
    }),
    [
      session,
      units,
      unitsLoading,
      unitsError,
      productionUnitId,
      productionUnit,
      productionUnitLabel,
      setProductionUnitId,
      refreshUnits,
    ],
  );

  return (
    <KdsStationContext.Provider value={value}>{children}</KdsStationContext.Provider>
  );
}

export function useKdsStation(): KdsStationContextValue {
  const ctx = useContext(KdsStationContext);
  if (!ctx) {
    throw new Error("useKdsStation must be used within KdsStationProvider");
  }
  return ctx;
}

export { formatUnitLabel };
