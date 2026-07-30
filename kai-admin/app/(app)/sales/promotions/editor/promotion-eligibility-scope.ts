import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type {
  PromotionScopeMode,
  PromotionScopes,
} from "@/features/promotions/types/promotion.types";

export type LocationRow = {
  branch: BranchListItem;
  branchOn: boolean;
  posInBranch: PointOfSaleListItem[];
  posOn: Record<string, boolean>;
};

const INCLUDE: PromotionScopeMode = "INCLUDE";

export function isLocationUnrestricted(scopes: PromotionScopes | undefined): boolean {
  const b = scopes?.branches ?? [];
  const p = scopes?.pointsOfSale ?? [];
  return b.length === 0 && p.length === 0;
}

function includeBranchIds(scopes: PromotionScopes): Set<string> {
  return new Set(
    scopes.branches.filter((s) => s.mode === INCLUDE).map((s) => s.branchId),
  );
}

function includePosIds(scopes: PromotionScopes): Set<string> {
  return new Set(
    scopes.pointsOfSale.filter((s) => s.mode === INCLUDE).map((s) => s.pointOfSaleId),
  );
}

function posByBranchId(posList: PointOfSaleListItem[]): Map<string, PointOfSaleListItem[]> {
  const m = new Map<string, PointOfSaleListItem[]>();
  for (const p of posList) {
    const bid = p.branchId ?? p.branch?.id;
    if (!bid) continue;
    if (!m.has(bid)) m.set(bid, []);
    m.get(bid)!.push(p);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return m;
}

/** Fila por sucursal para la UI (solo lectura a partir de `scopes`). */
export function scopesToLocationRows(
  scopes: PromotionScopes,
  branches: BranchListItem[],
  posList: PointOfSaleListItem[],
): LocationRow[] {
  const bInc = includeBranchIds(scopes);
  const pInc = includePosIds(scopes);
  const byBranch = posByBranchId(posList);
  const sortedBranches = [...branches].sort((a, b) => a.name.localeCompare(b.name));

  return sortedBranches.map((branch) => {
    const posInBranch = byBranch.get(branch.id) ?? [];
    const branchOn =
      bInc.has(branch.id) || posInBranch.some((p) => pInc.has(p.id));
    const posOn: Record<string, boolean> = {};
    for (const p of posInBranch) {
      if (!branchOn) {
        posOn[p.id] = false;
      } else if (pInc.size === 0) {
        posOn[p.id] = true;
      } else {
        posOn[p.id] = pInc.has(p.id);
      }
    }
    return { branch, branchOn, posInBranch, posOn };
  });
}

/** Alcance explícito: todas las sucursales activas y todos los PV activos (lista explícita de sucursales). */
export function buildAllBranchesExplicitScopes(
  branches: BranchListItem[],
): Pick<PromotionScopes, "branches" | "pointsOfSale"> {
  return {
    branches: branches.map((b) => ({ branchId: b.id, mode: INCLUDE })),
    pointsOfSale: [],
  };
}

/** Convierte el estado de la UI en `branches` / `pointsOfSale` para el payload. */
export function locationRowsToScopes(
  rows: LocationRow[],
): Pick<PromotionScopes, "branches" | "pointsOfSale"> {
  const onRows = rows.filter((r) => r.branchOn);
  const branches = onRows.map((r) => ({ branchId: r.branch.id, mode: INCLUDE }));

  let needExplicitPos = false;
  for (const r of onRows) {
    const total = r.posInBranch.length;
    if (total === 0) continue;
    const onCount = r.posInBranch.filter((p) => r.posOn[p.id]).length;
    if (onCount > 0 && onCount < total) {
      needExplicitPos = true;
      break;
    }
  }

  if (!needExplicitPos) {
    return { branches, pointsOfSale: [] };
  }

  const pointOfSaleIds: string[] = [];
  for (const r of onRows) {
    const total = r.posInBranch.length;
    if (total === 0) continue;
    const onCount = r.posInBranch.filter((p) => r.posOn[p.id]).length;
    if (onCount === total) {
      for (const p of r.posInBranch) pointOfSaleIds.push(p.id);
    } else {
      for (const p of r.posInBranch) {
        if (r.posOn[p.id]) pointOfSaleIds.push(p.id);
      }
    }
  }

  return {
    branches,
    pointsOfSale: pointOfSaleIds.map((pointOfSaleId) => ({
      pointOfSaleId,
      mode: INCLUDE,
    })),
  };
}
