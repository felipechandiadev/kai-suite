"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@kai/ui";
import {
  completeCourierStopAction,
  listCourierStopsAction,
  startCourierDispatchAction,
  type CourierStopRow,
  type CourierStopsDispatch,
} from "@/features/courier/actions/courier.action";
import { DeliveryRouteMap } from "@/features/courier/ui/DeliveryRouteMap";
import { loadCourierSession, type CourierSession } from "@/lib/courier-session";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  visited: "Entregado",
  skipped: "Problema",
};

export function CourierDispatchPanel({ dispatchId }: { dispatchId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<CourierSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dispatch, setDispatch] = useState<CourierStopsDispatch | null>(null);
  const [stops, setStops] = useState<CourierStopRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload(current: CourierSession) {
    const result = await listCourierStopsAction({
      dispatchId,
      userId: current.userId,
      companyId: current.companyId,
    });
    setDispatch(result.dispatch);
    setStops(result.stops);
  }

  useEffect(() => {
    const current = loadCourierSession();
    setHydrated(true);
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    void reload(current).catch((e) => setError(e instanceof Error ? e.message : "Error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchId, router]);

  if (!hydrated || !session) {
    return (
      <div
        className="flex min-h-[40vh] w-full items-center justify-center"
        data-test-id="dispatch-loading"
      />
    );
  }

  const nextStopId = stops.find((stop) => stop.stopStatus === "pending")?.id;
  const canStart =
    dispatch?.status === "planned" || dispatch?.status === "route_ready";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <IconButton
          icon="ArrowLeft"
          variant="outlined"
          size="md"
          ariaLabel="Volver"
          onClick={() => router.push("/repartos")}
          data-test-id="dispatch-back-button"
        />
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {dispatch?.label ?? "Paradas"}
        </h1>
      </div>

      {canStart ? (
        <Button
          variant="primary"
          className="w-full min-h-[44px]"
          onClick={() => {
            setBusyId("start");
            void startCourierDispatchAction({
              dispatchId,
              userId: session.userId,
              companyId: session.companyId,
            })
              .then(() => reload(session))
              .catch((e) => setError(e instanceof Error ? e.message : "Error"))
              .finally(() => setBusyId(null));
          }}
          disabled={busyId === "start"}
          loading={busyId === "start"}
        >
          Iniciar reparto
        </Button>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      {stops.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Mapa</h2>
          <DeliveryRouteMap
            stops={stops}
            routeGeometry={dispatch?.routeGeometry ?? null}
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Paradas ({stops.length})
        </h2>
        {stops.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No hay paradas en este reparto.
          </p>
        ) : (
          <ol className="space-y-3">
            {stops.map((stop) => {
              const isNext = stop.id === nextStopId;
              return (
                <li
                  key={stop.id}
                  className={`rounded-xl border p-4 ${
                    isNext
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Parada {stop.sequence}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABELS[stop.stopStatus] ?? stop.stopStatus}
                    </span>
                  </div>
                  <p className="font-medium">{stop.customerName ?? "Cliente"}</p>
                  <p className="text-sm">{stop.addressLine1 ?? "Sin dirección"}</p>
                  <p className="text-sm text-muted-foreground">{stop.commune}</p>
                  {stop.customerPhone ? (
                    <p className="text-sm">{stop.customerPhone}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      className="inline-flex min-h-[40px] items-center rounded-md border border-border px-3 text-sm"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navegar
                    </a>
                    {stop.stopStatus === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busyId === stop.id}
                          loading={busyId === stop.id}
                          onClick={() => {
                            setBusyId(stop.id);
                            void completeCourierStopAction({
                              stopId: stop.id,
                              userId: session.userId,
                              companyId: session.companyId,
                            })
                              .then(() => reload(session))
                              .catch((e) =>
                                setError(e instanceof Error ? e.message : "Error"),
                              )
                              .finally(() => setBusyId(null));
                          }}
                        >
                          Entregado
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === stop.id}
                          onClick={() => {
                            const note = window.prompt("Describe el problema");
                            if (!note) return;
                            setBusyId(stop.id);
                            void completeCourierStopAction({
                              stopId: stop.id,
                              userId: session.userId,
                              companyId: session.companyId,
                              issueNote: note,
                            })
                              .then(() => reload(session))
                              .catch((e) =>
                                setError(e instanceof Error ? e.message : "Error"),
                              )
                              .finally(() => setBusyId(null));
                          }}
                        >
                          Problema
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
