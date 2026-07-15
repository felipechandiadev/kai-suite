"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, getTodayIso } from "@kai/ui";
import { Clock, Package, Route, Timer } from "lucide-react";
import {
  listCourierDispatchesAction,
  type CourierDispatchRow,
} from "@/features/courier/actions/courier.action";
import {
  dispatchStatusBadgeVariant,
  dispatchStatusLabel,
  formatDispatchTime,
  formatRouteDistance,
  formatRouteDuration,
} from "@/features/courier/lib/courier-dispatch-labels";
import { DeliveryDateNav } from "@/shared/components/DeliveryDateNav";
import { loadCourierSession, type CourierSession } from "@/lib/courier-session";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateParam(raw: string | null): string {
  if (raw && DATE_RE.test(raw)) return raw;
  return getTodayIso();
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function CourierDispatchCard({ dispatch }: { dispatch: CourierDispatchRow }) {
  const title = dispatch.occurrenceName || dispatch.label || "Reparto";
  const routeDistance = formatRouteDistance(dispatch.totalDistanceM);
  const routeDuration = formatRouteDuration(dispatch.totalDurationS);
  const routeSummary =
    routeDistance && routeDuration
      ? `${routeDistance} · ${routeDuration}`
      : routeDistance ?? routeDuration;
  const progressPct =
    dispatch.stopCount > 0
      ? Math.round((dispatch.completedStopCount / dispatch.stopCount) * 100)
      : 0;
  const showProgress =
    dispatch.status === "out" ||
    dispatch.status === "completed" ||
    dispatch.completedStopCount > 0;

  return (
    <Link
      href={`/repartos/${dispatch.id}`}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              Salida {formatDispatchTime(dispatch.departureTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3.5 shrink-0" aria-hidden />
              Corte {formatDispatchTime(dispatch.orderCutoffTime)}
            </span>
          </p>
        </div>
        <Badge variant={dispatchStatusBadgeVariant(dispatch.status)} className="shrink-0">
          {dispatchStatusLabel(dispatch.status)}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatChip
          icon={Route}
          label="Paradas"
          value={
            dispatch.pendingStopCount > 0 && dispatch.completedStopCount > 0
              ? `${dispatch.completedStopCount}/${dispatch.stopCount}`
              : String(dispatch.stopCount)
          }
        />
        <StatChip icon={Package} label="Ítems" value={String(dispatch.itemCount)} />
        <StatChip
          icon={Route}
          label="Ruta"
          value={routeSummary ?? "Sin opt."}
        />
      </div>

      {showProgress && dispatch.stopCount > 0 ? (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {dispatch.completedStopCount} de {dispatch.stopCount} paradas listas
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del reparto"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {dispatch.startedAt ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Iniciado{" "}
          {new Date(dispatch.startedAt).toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </Link>
  );
}

export function CourierRepartosPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = resolveDateParam(searchParams.get("date"));

  const [session, setSession] = useState<CourierSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<CourierDispatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setDate = (next: string) => {
    const today = getTodayIso();
    const qs = next === today ? "" : `?date=${next}`;
    router.replace(`/repartos${qs}`);
  };

  useEffect(() => {
    const current = loadCourierSession();
    setHydrated(true);
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    void listCourierDispatchesAction({
      userId: session.userId,
      companyId: session.companyId,
      date,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [session, date]);

  if (!hydrated || !session) {
    return (
      <div
        className="flex min-h-[40vh] w-full items-center justify-center"
        data-test-id="repartos-loading"
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Repartos</h1>
        <p className="text-sm text-muted-foreground">Despachos asignados a ti</p>
      </div>

      <DeliveryDateNav date={date} disabled={loading} onDateChange={setDate} />

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando repartos…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No tienes repartos asignados para este día.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => (
            <li key={d.id}>
              <CourierDispatchCard dispatch={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
