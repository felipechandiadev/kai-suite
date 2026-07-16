"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso, Button, getTodayIso } from "@kai/ui";
import type {
  DeliveryDriverRow,
  DeliveryOccurrenceRow,
  DeliveryOperationsBoard,
} from "@/features/e-shop-delivery/types/delivery.types";
import { CALENDAR_ROUTE } from "./operations-board-params";
import { OperationsRepartoCarousel } from "./OperationsRepartoCarousel";
import { formatOperationsDate, totalActiveOrders } from "./operations.utils";

type OperationsToolbarProps = {
  board: DeliveryOperationsBoard;
  repartos: DeliveryOccurrenceRow[];
  drivers: DeliveryDriverRow[];
  date: string;
  activeOccurrenceId?: string | null;
  pending?: boolean;
  disabled?: boolean;
  onDateChange: (date: string) => void;
  onRepartoChange: (occurrenceId: string) => void;
  onDriverChange: (driverUserId: string | null) => void;
  onOptimizeRoute: () => void;
};

export function OperationsToolbar({
  board,
  repartos,
  drivers,
  date,
  activeOccurrenceId,
  pending = false,
  disabled = false,
  onDateChange,
  onRepartoChange,
  onDriverChange,
  onOptimizeRoute,
}: OperationsToolbarProps) {
  const totalOrders = totalActiveOrders(board);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Repartos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatOperationsDate(date)} · {totalOrders}{" "}
            {totalOrders === 1 ? "pedido activo" : "pedidos activos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => onDateChange(addDaysIso(date, -1))}
              disabled={disabled}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Día anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <Button
              type="button"
              variant="text"
              size="sm"
              disabled={disabled}
              className="px-3!"
              onClick={() => onDateChange(getTodayIso())}
            >
              Hoy
            </Button>
            <button
              type="button"
              onClick={() => onDateChange(addDaysIso(date, 1))}
              disabled={disabled}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Día siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link
            href={CALENDAR_ROUTE}
            className="text-sm text-primary hover:underline"
          >
            Calendario
          </Link>
        </div>
      </div>

      <OperationsRepartoCarousel
        repartos={repartos.filter((reparto) => reparto.occurrenceDate === date)}
        activeOccurrenceId={activeOccurrenceId ?? board.occurrence?.id ?? null}
        activeOccurrence={board.occurrence}
        drivers={drivers}
        pending={pending}
        disabled={disabled}
        onSelect={onRepartoChange}
        onDriverChange={onDriverChange}
        onOptimizeRoute={onOptimizeRoute}
      />
    </div>
  );
}
