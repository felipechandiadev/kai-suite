"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  DataGridTable as DataGrid,
  Select,
  TextField,
  getTodayIso,
  type DataGridColumn,
} from "@kai/ui";
import {
  creditJornadaLedgerAction,
  expireJornadaLedgerAction,
  listJornadaLedgerAction,
  redeemJornadaLedgerAction,
} from "@/features/hr-jornada/actions/jornada.action";
import type { JornadaEmployeeRow, LedgerEntryView } from "@/features/hr-jornada/types/jornada.types";

export function JornadaCompensatoryPanel({
  employees,
}: {
  employees: JornadaEmployeeRow[];
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [entries, setEntries] = useState<LedgerEntryView[]>([]);
  const [minutes, setMinutes] = useState("480");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: "Fecha",
        width: 180,
        valueGetter: ({ row }) =>
          String((row as LedgerEntryView).createdAt ?? "").slice(0, 19),
      },
      {
        field: "entryType",
        headerName: "Tipo",
        width: 100,
        valueGetter: ({ row }) => (row as LedgerEntryView).entryType,
      },
      {
        field: "minutes",
        headerName: "Minutos",
        width: 100,
        valueGetter: ({ row }) => String((row as LedgerEntryView).minutes),
      },
      {
        field: "reason",
        headerName: "Motivo",
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) => (row as LedgerEntryView).reason ?? "—",
      },
      {
        field: "expiresOn",
        headerName: "Caduca",
        width: 120,
        valueGetter: ({ row }) => (row as LedgerEntryView).expiresOn ?? "—",
      },
    ],
    [],
  );

  function loadLedger(id: string) {
    startTransition(async () => {
      const res = await listJornadaLedgerAction(id);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setEntries(res.data);
    });
  }

  return (
    <div className="space-y-3" data-test-id="jornada-compensatory">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Empleado"
          value={employeeId || null}
          onChange={(id) => {
            const next = String(id ?? "");
            setEmployeeId(next);
            if (next) loadLedger(next);
          }}
          options={employees.map((e) => ({
            id: e.id,
            label: `${e.displayName} (${Math.round(e.compensatoryBalanceMinutes / 60)}h)`,
          }))}
        />
        <TextField
          label="Minutos"
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!employeeId || pending}
          onClick={() => {
            startTransition(async () => {
              const res = await creditJornadaLedgerAction({
                employeeId,
                minutes: Number(minutes) || 0,
                reason: "Crédito manual",
              });
              if (!res.success) setError(res.message);
              else {
                loadLedger(employeeId);
                router.refresh();
              }
            });
          }}
        >
          Acreditar
        </Button>
        <Button
          variant="outlined"
          size="sm"
          disabled={!employeeId || pending}
          onClick={() => {
            startTransition(async () => {
              const res = await redeemJornadaLedgerAction({
                employeeId,
                minutes: Number(minutes) || 0,
              });
              if (!res.success) setError(res.message);
              else {
                loadLedger(employeeId);
                router.refresh();
              }
            });
          }}
        >
          Redimir
        </Button>
        <Button
          variant="outlined"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await expireJornadaLedgerAction(getTodayIso());
              if (!res.success) setError(res.message);
              else {
                if (employeeId) loadLedger(employeeId);
                router.refresh();
              }
            });
          }}
        >
          Caducar vencidos
        </Button>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <DataGrid
        title="Libro de descanso complementario"
        rows={entries}
        columns={columns}
        height="50vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        showSearch={false}
      />
    </div>
  );
}
