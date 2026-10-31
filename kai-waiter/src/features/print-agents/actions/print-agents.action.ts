"use server";

import { diningGet } from "@/lib/backend-api";
import { requireWaiterAuth } from "@/lib/waiter-auth.server";

export type WaiterPrintAgentDto = {
  id: string;
  displayName: string;
  lanHost: string | null;
  wsPort: number | null;
  wssPort: number | null;
  useTls: boolean;
  online: boolean;
  platform: string;
  companyName?: string | null;
};

/** `userId`/`companyId` se ignoran: la identidad sale de la cookie firmada. */
export async function listPrintAgentsForWaiterAction(_body?: {
  userId?: string;
  companyId?: string;
}): Promise<WaiterPrintAgentDto[]> {
  const ctx = await requireWaiterAuth();
  const rows = await diningGet<Array<Record<string, unknown>>>(
    "/print-agents",
    ctx,
  );
  return rows.map((a) => ({
    id: String(a.id),
    displayName: String(a.displayName ?? ""),
    lanHost: a.lanHost != null ? String(a.lanHost) : null,
    wsPort: typeof a.wsPort === "number" ? a.wsPort : null,
    wssPort: typeof a.wssPort === "number" ? a.wssPort : null,
    useTls: Boolean(a.useTls),
    online: Boolean(a.online),
    platform: String(a.platform ?? "unknown"),
    companyName: a.companyName != null ? String(a.companyName) : null,
  }));
}
