"use client";

import { useMemo, useState } from "react";
import {
  addDaysIso,
  Button,
  Calendar,
  getTodayIso,
  getWeekStart,
  type CalendarEvent,
  type CalendarView,
} from "@kai/ui";

function DemoEvent({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-left shadow-sm">
      <p className="truncate text-xs font-semibold text-foreground">{title}</p>
      {subtitle ? (
        <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function CalendarUiPage() {
  const today = getTodayIso();
  const [view, setView] = useState<CalendarView>("week");
  const [referenceDate, setReferenceDate] = useState(() => getWeekStart(today));
  const [selected, setSelected] = useState<string | null>(null);

  const events: CalendarEvent[] = useMemo(() => {
    const mon = getWeekStart(today);
    return [
      {
        id: "e1",
        date: mon,
        startTime: "09:00",
        content: <DemoEvent title="09:00 Standup" subtitle="Equipo" />,
      },
      {
        id: "e2",
        date: addDaysIso(mon, 2),
        startTime: "14:30",
        content: <DemoEvent title="14:30 Entrega" subtitle="Cliente A" />,
      },
      {
        id: "e3",
        date: addDaysIso(mon, 4),
        startTime: "11:00",
        content: <DemoEvent title="11:00 Visita" subtitle="Sucursal" />,
      },
      {
        id: "e4",
        date: today,
        startTime: "16:00",
        content: <DemoEvent title="16:00 Hoy" subtitle="Ejemplo" />,
      },
    ];
  }, [today]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Primario compartido de fechas. El dominio (repartos, agenda, etc.) se inyecta
          vía <code className="rounded bg-muted px-1">events[].content</code>. Incluye
          vista semanal con grilla horaria y vista mensual con celdas de día.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "week" ? "primary" : "outlinedSecondary"}
          onClick={() => setView("week")}
        >
          Semana
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "month" ? "primary" : "outlinedSecondary"}
          onClick={() => setView("month")}
        >
          Mes
        </Button>
        {selected ? (
          <span className="text-xs text-muted-foreground">
            Selección: <strong className="text-foreground">{selected}</strong>
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Calendar
          view={view}
          referenceDate={referenceDate}
          events={events}
          emptySlotLabel="Programar evento"
          headerRight={
            <span className="text-xs text-muted-foreground">Demo design-system</span>
          }
          onNavigate={setReferenceDate}
          onSelectDate={(iso) => setSelected(`fecha ${iso}`)}
          onSelectSlot={(iso, hour) =>
            setSelected(
              hour != null ? `slot ${iso} ${String(hour).padStart(2, "0")}:00` : `día ${iso}`,
            )
          }
        />
      </div>
    </div>
  );
}
