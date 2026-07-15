"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso, Button, getTodayIso, parseIsoDateForDisplay } from "@kai/ui";

type DeliveryDateNavProps = {
  date: string;
  disabled?: boolean;
  onDateChange: (date: string) => void;
};

function formatDeliveryDate(dateStr: string): string {
  const date = parseIsoDateForDisplay(dateStr);
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DeliveryDateNav({
  date,
  disabled = false,
  onDateChange,
}: DeliveryDateNavProps) {
  const today = getTodayIso();
  const isToday = date === today;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" data-test-id="delivery-date-label">
        {formatDeliveryDate(date)}
      </p>

      <div className="flex items-center self-start rounded-lg border border-border bg-background p-0.5">
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
          disabled={disabled || isToday}
          className="!px-3"
          onClick={() => onDateChange(today)}
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
    </div>
  );
}
