import {
  DisplayConnection,
  buildDisplayWebSocketUrl,
  readCustomerDisplayFromStorage,
  type CustomerDisplayEvent,
  type DisplayStatusPayload,
} from "@flowstore/customer-display-client";
import { buildCustomerDisplaySnapshot } from "./build-customer-display-snapshot";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";

type CartSlice = {
  lines: PosCartLine[];
  orderDiscount: number;
};

let connection: DisplayConnection | null = null;
let lastStatus: DisplayStatusPayload | null = null;

export function getCustomerDisplayStatus(): DisplayStatusPayload | null {
  return lastStatus;
}

export function syncCustomerDisplayPublisher(
  cart: CartSlice,
  ctx: Pick<PosContextV1, "pointOfSaleId" | "pointOfSaleName" | "branchName"> | null,
): void {
  const cfg = readCustomerDisplayFromStorage();
  if (!cfg.enabled || !ctx?.pointOfSaleId) {
    disconnectCustomerDisplay();
    return;
  }

  const url = buildDisplayWebSocketUrl(cfg.host, cfg.port, cfg.useTls);
  if (!connection) {
    connection = new DisplayConnection({
      url,
      pointOfSaleId: ctx.pointOfSaleId,
      storeName: ctx.pointOfSaleName ?? ctx.branchName ?? undefined,
      appLabel: "Punto de venta",
      token: cfg.token,
      onDisplayStatus: (status) => {
        lastStatus = status;
      },
      onError: () => {
        // best-effort
      },
    });
    connection.connect();
  }

  const snapshot = buildCustomerDisplaySnapshot({
    lines: cart.lines,
    orderDiscount: cart.orderDiscount,
    ctx,
  });
  if (snapshot) {
    connection.publishSnapshot(snapshot);
  }
}

export function notifyCustomerDisplaySaleCompleted(
  total: number,
  pointOfSaleId: string,
): void {
  if (!connection) return;
  const event: CustomerDisplayEvent = {
    type: "sale_completed",
    pointOfSaleId,
    total,
    updatedAt: new Date().toISOString(),
  };
  connection.publishEvent(event);
}

export function notifyCustomerDisplayIdle(pointOfSaleId: string): void {
  if (!connection) return;
  const event: CustomerDisplayEvent = {
    type: "idle",
    pointOfSaleId,
    updatedAt: new Date().toISOString(),
  };
  connection.publishEvent(event);
}

export function disconnectCustomerDisplay(): void {
  connection?.disconnect();
  connection = null;
  lastStatus = null;
}

/** @internal test helper */
export function resetCustomerDisplayPublisherForTests(): void {
  disconnectCustomerDisplay();
}
