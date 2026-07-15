"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getTodayIso } from "@kai/ui";
import {
  listCourierDispatchesAction,
  type CourierDispatchRow,
} from "@/features/courier/actions/courier.action";
import { DeliveryDateNav } from "@/shared/components/DeliveryDateNav";
import { loadCourierSession, type CourierSession } from "@/lib/courier-session";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planificado",
  route_ready: "Ruta lista",
  out: "En ruta",
  completed: "Completado",
  cancelled: "Cancelado",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateParam(raw: string | null): string {
  if (raw && DATE_RE.test(raw)) return raw;
  return getTodayIso();
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
        <ul className="space-y-2">
          {rows.map((d) => (
            <li key={d.id}>
              <Link
                href={`/repartos/${d.id}`}
                className="block rounded-xl border border-border p-4 hover:bg-muted/40"
              >
                <p className="font-medium">{d.label ?? "Reparto"}</p>
                <p className="text-sm text-muted-foreground">
                  {STATUS_LABELS[d.status] ?? d.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
