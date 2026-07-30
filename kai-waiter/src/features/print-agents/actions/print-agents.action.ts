"use server";

import { diningGet, type DiningAuthContext } from "@/lib/backend-api";

export type WaiterPrintAgentDto = {
  id: string;
  displayName: string;
  lanHost: string | null;
  wsPort: number | null;
  wssPort: number | null;
  useTls: boolean;
  online: boolean;
  platform: string;
};

export async function listPrintAgentsForWaiterAction(body: {
  userId: string;
  companyId: string;
}): Promise<WaiterPrintAgentDto[]> {
  const ctx: DiningAuthContext = {
    userId: body.userId,
    companyId: body.companyId,
  };
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
  }));
}
