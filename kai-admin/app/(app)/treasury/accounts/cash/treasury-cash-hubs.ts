import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";

export function resolveTreasuryCashHubSelection(
  hubs: CashHubRow[],
  cashHubParam: string | null | undefined,
): { selectedId: string | null; mustRedirect: boolean } {
  const id = cashHubParam?.trim() || null;
  if (!hubs || hubs.length === 0) {
    return { selectedId: null, mustRedirect: false };
  }
  if (id && hubs.some((h) => String(h.id) === String(id))) {
    return { selectedId: id, mustRedirect: false };
  }
  const first = hubs[0]?.id ? String(hubs[0].id) : null;
  return { selectedId: first, mustRedirect: Boolean(first) };
}

