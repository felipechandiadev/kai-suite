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
  getWeekStart,
  addDaysIso,
  type DataGridColumn,
} from "@kai/ui";
import {
  attachSignedStatementAction,
  generateAttendanceStatementAction,
  listAttendanceStatementsAction,
} from "@/features/hr-jornada/actions/jornada.action";
import type {
  AttendanceDocumentView,
  JornadaEmployeeRow,
} from "@/features/hr-jornada/types/jornada.types";
import { buildAttendanceStatementHtml } from "@/features/hr-jornada/print/attendance-statement-print-html";
import { printAdminHtmlViaAgentOrBrowser } from "@/features/print/lib/admin-agent-document-print";

export function JornadaStatementsPanel({
  employees,
  initialDocs,
}: {
  employees: JornadaEmployeeRow[];
  initialDocs: AttendanceDocumentView[];
}) {
  const router = useRouter();
  const weekStart = getWeekStart(getTodayIso());
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(weekStart);
  const [periodEnd, setPeriodEnd] = useState(addDaysIso(weekStart, 6));
  const [docs, setDocs] = useState(initialDocs);
  const [signedUrl, setSignedUrl] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "period",
        headerName: "Período",
        flex: 1,
        minWidth: 180,
        valueGetter: ({ row }) => {
          const r = row as AttendanceDocumentView;
          return `${r.periodStart} → ${r.periodEnd}`;
        },
      },
      {
        field: "version",
        headerName: "Ver.",
        width: 70,
        valueGetter: ({ row }) => String((row as AttendanceDocumentView).version),
      },
      {
        field: "status",
        headerName: "Estado",
        width: 120,
        valueGetter: ({ row }) => (row as AttendanceDocumentView).status,
      },
      {
        field: "signed",
        headerName: "Firmado",
        width: 100,
        valueGetter: ({ row }) =>
          (row as AttendanceDocumentView).signedAt ? "Sí" : "No",
      },
      {
        field: "actions",
        headerName: "",
        width: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const r = row as AttendanceDocumentView;
          return (
            <div className="flex gap-1">
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  const html = buildAttendanceStatementHtml(
                    (r.snapshotJson ?? {
                      periodStart: r.periodStart,
                      periodEnd: r.periodEnd,
                    }) as any,
                  );
                  void printAdminHtmlViaAgentOrBrowser(html, {
                    filename: `asistencia-${r.periodStart}.pdf`,
                    documentType: "attendance-statement",
                  });
                }}
              >
                Imprimir
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => setSelectedDocId(r.id)}
              >
                Escaneo
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-3" data-test-id="jornada-statements">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Empleado"
          value={employeeId || null}
          onChange={(id) => setEmployeeId(String(id ?? ""))}
          options={employees.map((e) => ({ id: e.id, label: e.displayName }))}
        />
        <TextField
          label="Desde"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
        />
        <TextField
          label="Hasta"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!employeeId || pending}
          onClick={() => {
            startTransition(async () => {
              const res = await generateAttendanceStatementAction({
                employeeId,
                periodStart,
                periodEnd,
              });
              if (!res.success) {
                setError(res.message);
                return;
              }
              const list = await listAttendanceStatementsAction(employeeId);
              if (list.success) setDocs(list.data);
              const html = buildAttendanceStatementHtml(res.data.snapshot as any);
              void printAdminHtmlViaAgentOrBrowser(html, {
                filename: `asistencia-${periodStart}.pdf`,
                documentType: "attendance-statement",
              });
              router.refresh();
            });
          }}
        >
          Generar / regenerar e imprimir
        </Button>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {selectedDocId ? (
        <div className="flex flex-wrap items-end gap-2 rounded border border-border p-3">
          <TextField
            label="URL escaneo firmado"
            value={signedUrl}
            onChange={(e) => setSignedUrl(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!signedUrl.trim() || pending}
            onClick={() => {
              startTransition(async () => {
                const res = await attachSignedStatementAction(
                  selectedDocId,
                  signedUrl.trim(),
                );
                if (!res.success) setError(res.message);
                else {
                  setSelectedDocId(null);
                  setSignedUrl("");
                  router.refresh();
                }
              });
            }}
          >
            Adjuntar escaneo
          </Button>
          <Button variant="outlined" size="sm" onClick={() => setSelectedDocId(null)}>
            Cancelar
          </Button>
        </div>
      ) : null}
      <DataGrid
        title="Comprobantes de asistencia"
        rows={docs}
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
