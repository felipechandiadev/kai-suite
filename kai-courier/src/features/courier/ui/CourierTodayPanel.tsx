"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import {
  listCourierDispatchesAction,
  type CourierDispatchRow,
} from "@/features/courier/actions/courier.action";
import { clearCourierSession, loadCourierSession } from "@/lib/courier-session";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planificado",
  route_ready: "Ruta lista",
  out: "En ruta",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function CourierTodayPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<CourierDispatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadCourierSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    void listCourierDispatchesAction({
      userId: session.userId,
      companyId: session.companyId,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [router]);

  const session = loadCourierSession();

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Hoy</h1>
          <p className="text-sm text-muted-foreground">{session?.displayName}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            clearCourierSession();
            router.replace("/login");
          }}
        >
          Salir
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tienes repartos asignados hoy.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => (
            <li key={d.id}>
              <Link
                href={`/repartos/${d.id}`}
                className="block rounded-xl border border-border p-4 hover:bg-muted/40"
              >
                <p className="font-medium">{d.label ?? "Reparto"}</p>
                <p className="text-sm text-muted-foreground">{STATUS_LABELS[d.status] ?? d.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
