import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export const POS_DINING_MENU_COLUMN_COLLAPSED_LS_KEY =
  "kai.pos.dining.menuColumnCollapsed";

const POS_DINING_MENU_ACTIVE_CATEGORIES_LS_PREFIX =
  "kai.pos.dining.menuActiveCategoryIds";

function activeCategoriesKey(branchId: string): string {
  return `${POS_DINING_MENU_ACTIVE_CATEGORIES_LS_PREFIX}.${branchId.trim()}`;
}

/** Solo en cliente; en SSR default expandido. */
export function readPosDiningMenuColumnCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = getMigratedLocalStorageItem(
      POS_DINING_MENU_COLUMN_COLLAPSED_LS_KEY,
      POS_DINING_MENU_COLUMN_COLLAPSED_LS_KEY,
    );
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writePosDiningMenuColumnCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedLocalStorageItem(
      POS_DINING_MENU_COLUMN_COLLAPSED_LS_KEY,
      POS_DINING_MENU_COLUMN_COLLAPSED_LS_KEY,
      collapsed ? "1" : "0",
    );
  } catch {
    // ignore quota / private mode
  }
}

/** Filtros de categoría activos del menú accounts (por sucursal). */
export function readPosDiningMenuActiveCategoryIds(branchId: string): string[] {
  if (typeof window === "undefined") return [];
  const bid = branchId.trim();
  if (!bid) return [];
  try {
    const key = activeCategoriesKey(bid);
    const raw = getMigratedLocalStorageItem(key, key);
    if (!raw?.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => String(id ?? "").trim())
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  } catch {
    return [];
  }
}

export function writePosDiningMenuActiveCategoryIds(
  branchId: string,
  categoryIds: string[],
): void {
  if (typeof window === "undefined") return;
  const bid = branchId.trim();
  if (!bid) return;
  try {
    const key = activeCategoriesKey(bid);
    const cleaned = [
      ...new Set(
        categoryIds
          .map((id) => String(id ?? "").trim())
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      ),
    ];
    setMigratedLocalStorageItem(key, key, JSON.stringify(cleaned));
  } catch {
    // ignore quota / private mode
  }
}

export type PosDiningTablesView = "list" | "grid";

export const POS_DINING_TABLES_VIEW_LS_KEY = "kai.pos.dining.tablesView";

export function readPosDiningTablesView(): PosDiningTablesView {
  if (typeof window === "undefined") return "list";
  try {
    const raw = getMigratedLocalStorageItem(
      POS_DINING_TABLES_VIEW_LS_KEY,
      POS_DINING_TABLES_VIEW_LS_KEY,
    );
    return raw === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function writePosDiningTablesView(view: PosDiningTablesView): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedLocalStorageItem(
      POS_DINING_TABLES_VIEW_LS_KEY,
      POS_DINING_TABLES_VIEW_LS_KEY,
      view === "grid" ? "grid" : "list",
    );
  } catch {
    // ignore
  }
}
