"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import {
  completeCourierStopAction,
  listCourierStopsAction,
  startCourierDispatchAction,
  type CourierStopRow,
} from "@/features/courier/actions/courier.action";
import { loadCourierSession } from "@/lib/courier-session";

export function CourierDispatchPanel({ dispatchId }: { dispatchId: string }) {
  const router = useRouter();
  const [stops, setStops] = useState<CourierStopRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const session = loadCourierSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const rows = await listCourierStopsAction({
      dispatchId,
      userId: session.userId,
      companyId: session.companyId,
    });
    setStops(rows);
  }

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchId]);

  const session = loadCourierSession();

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => router.push("/hoy")}>
          Volver
        </Button>
        <h1 className="text-lg font-semibold">Paradas</h1>
      </div>
      {session ? (
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
              .then(() => reload())
              .catch((e) => setError(e instanceof Error ? e.message : "Error"))
              .finally(() => setBusyId(null));
          }}
          disabled={busyId === "start"}
        >
          Iniciar reparto
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ol className="space-y-3">
        {stops.map((stop) => (
          <li key={stop.id} className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Parada {stop.sequence}</p>
            <p className="font-medium">{stop.customerName ?? "Cliente"}</p>
            <p className="text-sm">{stop.addressLine1 ?? "Sin dirección"}</p>
            <p className="text-sm text-muted-foreground">{stop.commune}</p>
            {stop.customerPhone ? <p className="text-sm">{stop.customerPhone}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="inline-flex min-h-[40px] items-center rounded-md border border-border px-3 text-sm"
                href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Navegar
              </a>
              {stop.stopStatus === "pending" && session ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyId === stop.id}
                    onClick={() => {
                      setBusyId(stop.id);
                      void completeCourierStopAction({
                        stopId: stop.id,
                        userId: session.userId,
                        companyId: session.companyId,
                      })
                        .then(() => reload())
                        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
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
                        .then(() => reload())
                        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Problema
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{stop.stopStatus}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
