import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export type PosDiningTabKey = "mesas" | "barra" | "takeaway";

export const POS_DINING_ENABLED_TABS_LS_KEY = "kai.pos.dining.enabledTabs";

export const ALL_POS_DINING_TABS: PosDiningTabKey[] = [
  "mesas",
  "barra",
  "takeaway",
];

const TAB_SET = new Set<string>(ALL_POS_DINING_TABS);

function isTabKey(v: unknown): v is PosDiningTabKey {
  return typeof v === "string" && TAB_SET.has(v);
}

/** Orden canónico; al menos un tab (fallback mesas). */
export function sanitizePosDiningEnabledTabs(
  raw: unknown,
): PosDiningTabKey[] {
  const fromArray = Array.isArray(raw)
    ? raw.filter(isTabKey)
    : [];
  const unique = ALL_POS_DINING_TABS.filter((t) => fromArray.includes(t));
  return unique.length > 0 ? unique : ["mesas"];
}

/** Default: las tres. SSR / sin window → las tres. */
export function readPosDiningEnabledTabs(): PosDiningTabKey[] {
  if (typeof window === "undefined") return [...ALL_POS_DINING_TABS];
  try {
    const raw = getMigratedLocalStorageItem(
      POS_DINING_ENABLED_TABS_LS_KEY,
      POS_DINING_ENABLED_TABS_LS_KEY,
    );
    if (!raw?.trim()) return [...ALL_POS_DINING_TABS];
    return sanitizePosDiningEnabledTabs(JSON.parse(raw) as unknown);
  } catch {
    return [...ALL_POS_DINING_TABS];
  }
}

export function writePosDiningEnabledTabs(tabs: PosDiningTabKey[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sanitizePosDiningEnabledTabs(tabs);
    setMigratedLocalStorageItem(
      POS_DINING_ENABLED_TABS_LS_KEY,
      POS_DINING_ENABLED_TABS_LS_KEY,
      JSON.stringify(cleaned),
    );
  } catch {
    // ignore
  }
}

/** Primer tab habilitado en orden mesas → barra → takeaway. */
export function defaultPosDiningTab(
  enabled: PosDiningTabKey[] = readPosDiningEnabledTabs(),
): PosDiningTabKey {
  const list = sanitizePosDiningEnabledTabs(enabled);
  return list[0] ?? "mesas";
}

export function isPosDiningTabEnabled(
  tab: PosDiningTabKey,
  enabled: PosDiningTabKey[] = readPosDiningEnabledTabs(),
): boolean {
  return sanitizePosDiningEnabledTabs(enabled).includes(tab);
}
