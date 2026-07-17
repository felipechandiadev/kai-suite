"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DiningOrderDto,
  DiningRoomDto,
  DiningTableDto,
} from "../infrastructure/dining.request";

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  FREE: { bg: "#e5e7eb", border: "#9ca3af", text: "#374151" },
  OPEN: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  SENT: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  PARTIAL_READY: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  READY: { bg: "#ccfbf1", border: "#14b8a6", text: "#115e59" },
  BILLING: { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
};

function tableStatus(
  tableId: string,
  orders: DiningOrderDto[],
): { status: string; orderId?: string } {
  const order = orders.find(
    (o) => o.diningTableId === tableId && o.kind === "TABLE" && o.status !== "CLOSED",
  );
  if (!order) return { status: "FREE" };
  return { status: order.status, orderId: order.id };
}

type WaiterFloorPlanProps = {
  room: DiningRoomDto;
  orders: DiningOrderDto[];
  selectedTableId: string | null;
  onSelectTable: (table: DiningTableDto, orderId?: string) => void;
};

export function WaiterFloorPlan({
  room,
  orders,
  selectedTableId,
  onSelectTable,
}: WaiterFloorPlanProps) {
  const floorPlan = room.floorPlan ?? {};
  const canvasWidth =
    typeof floorPlan.width === "number" ? floorPlan.width : 800;
  const canvasHeight =
    typeof floorPlan.height === "number" ? floorPlan.height : 600;
  const tables = room.tables ?? [];
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setScale(Math.min(1, w / canvasWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasWidth]);

  return (
    <div className="rounded-lg border border-border bg-surface p-2" data-test-id="waiter-floor-plan">
      <div className="mb-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {Object.entries(STATUS_COLORS).map(([key, colors]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />
            {key.replace("_", " ")}
          </span>
        ))}
      </div>
      <div
        ref={viewportRef}
        className="overflow-hidden rounded-md border border-border/60 bg-neutral/20"
      >
        <div
          style={{
            width: canvasWidth * scale,
            height: canvasHeight * scale,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${scale})`,
            }}
          >
            {tables.map((table) => {
              const { status, orderId } = tableStatus(table.id, orders);
              const colors = STATUS_COLORS[status] ?? STATUS_COLORS.FREE;
              const selected = selectedTableId === table.id;
              const isCircle = table.shape === "CIRCLE";
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => onSelectTable(table, orderId)}
                  className="absolute flex flex-col items-center justify-center border-2 text-xs font-semibold shadow-sm active:scale-[0.98]"
                  style={{
                    left: Number(table.x),
                    top: Number(table.y),
                    width: Number(table.width),
                    height: Number(table.height),
                    transform: `rotate(${Number(table.rotation)}deg)`,
                    borderRadius: isCircle ? "9999px" : "8px",
                    backgroundColor: colors.bg,
                    borderColor: selected ? "var(--color-primary)" : colors.border,
                    color: colors.text,
                    outline: selected ? "2px solid var(--color-primary)" : undefined,
                  }}
                  title={`${table.label} (${table.code}) — ${status}`}
                  data-test-id={`waiter-table-${table.code}`}
                >
                  <span>{table.code}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {table.capacity}p
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
