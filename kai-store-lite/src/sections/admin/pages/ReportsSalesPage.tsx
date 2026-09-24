import { useEffect, useState } from "react";
import { Alert } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import { SalesReportsWorkspace } from "@/features/sales-reports/ui/SalesReportsWorkspace";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";

type CashItem = {
  id: string;
  pointOfSaleName?: string | null;
  status: string;
  openedAt: string;
};

const CASH_STATUS: Record<string, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
};

export function ReportsSalesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cashSessions, setCashSessions] = useState<Array<{ id: string; label: string }>>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const cashRes = await liteFetch<{ items: CashItem[] }>("/lite/cash-sessions");
        if (cancelled) return;
        setCashSessions(
          (cashRes.items ?? []).map((s) => ({
            id: s.id,
            label: `${s.pointOfSaleName ?? "POS"} · ${CASH_STATUS[s.status] ?? s.status} · ${new Date(
              s.openedAt,
            ).toLocaleString("es-CL")}`,
          })),
        );
      } catch (e) {
        if (!cancelled) setError(toUserMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3" data-test-id="reports-sales-loading">
        <LoadingLine loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3" data-test-id="reports-sales-error">
        <Alert variant="error">No se pudieron cargar filtros del reporte.</Alert>
        <CoreError message={error} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col" data-test-id="reports-sales-page">
      <SalesReportsWorkspace cashSessions={cashSessions} />
    </div>
  );
}
