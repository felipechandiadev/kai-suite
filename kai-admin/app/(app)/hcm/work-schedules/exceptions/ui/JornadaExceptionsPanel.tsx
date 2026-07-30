"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  DataGridTable as DataGrid,
  TextField,
  type DataGridColumn,
} from "@kai/ui";
import { settleJornadaExceptionsAction } from "@/features/hr-jornada/actions/jornada.action";
import type { ShiftExceptionView } from "@/features/hr-jornada/types/jornada.types";
import { EXCEPTION_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";
import { HCM_WORK_SCHEDULES_EXCEPTIONS } from "@/navigation/hcm-routes";

export function JornadaExceptionsPanel({
  exceptions,
  periodStart,
  periodEnd,
}: {
  exceptions: ShiftExceptionView[];
  periodStart: string;
  periodEnd: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(periodStart);
  const [to, setTo] = useState(periodEnd);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "workDate",
        headerName: "Fecha",
        width: 120,
        valueGetter: ({ row }) => (row as ShiftExceptionView).workDate,
      },
      {
        field: "type",
        headerName: "Tipo",
        flex: 1,
        minWidth: 140,
        valueGetter: ({ row }) => {
          const r = row as ShiftExceptionView;
          return EXCEPTION_TYPE_LABELS[r.type] ?? r.type;
        },
      },
      {
        field: "minutes",
        headerName: "Minutos",
        width: 100,
        valueGetter: ({ row }) => String((row as ShiftExceptionView).minutes),
      },
      {
        field: "settled",
        headerName: "Liquidada",
        width: 110,
        valueGetter: ({ row }) => ((row as ShiftExceptionView).settled ? "Sí" : "No"),
      },
      {
        field: "affectsPayroll",
        headerName: "Nómina",
        width: 100,
        valueGetter: ({ row }) =>
          (row as ShiftExceptionView).affectsPayroll ? "Sí" : "No",
      },
    ],
    [],
  );

  return (
    <div className="space-y-3" data-test-id="jornada-exceptions">
      <div className="flex flex-wrap items-end gap-2">
        <TextField label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button
          variant="outlined"
          size="sm"
          onClick={() =>
            router.push(
              `${HCM_WORK_SCHEDULES_EXCEPTIONS}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            )
          }
        >
          Filtrar
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await settleJornadaExceptionsAction(from, to);
              if (!res.success) {
                setError(res.message);
                return;
              }
              setMessage(
                `Liquidadas ${res.data.settledCount}; HE emitidas: ${res.data.overtimeEmitted}`,
              );
              router.refresh();
            });
          }}
        >
          Liquidar período → nómina
        </Button>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <DataGrid
        title="Excepciones de turno"
        rows={exceptions}
        columns={columns}
      />
    </div>
  );
}
