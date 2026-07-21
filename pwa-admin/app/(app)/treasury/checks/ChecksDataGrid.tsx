"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Badge,
  DataGridTable as DataGrid,
  IconButton,
  Select,
  type DataGridColumn,
  type Option,
} from "@kai/ui";
import {
  CHECK_DIRECTION_LABELS,
  checkStatusLabel,
  type CheckDirection,
  type CheckRow,
  type CheckStatus,
  type CommittedOutgoingChecksSummary,
} from "@/features/treasury-checks/types/check.types";

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Fecha solo: DD/MM/YYYY (norma admin). */
function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = iso.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function StatusBadge({
  status,
  direction,
}: {
  status: CheckStatus;
  direction?: CheckDirection;
}) {
  const variant =
    status === "CLEARED"
      ? "success-outlined"
      : status === "DEPOSITED"
        ? "info-outlined"
        : status === "PENDING"
          ? "warning-outlined"
          : status === "BOUNCED"
            ? "error-outlined"
            : status === "ENDORSED"
              ? "primary-outlined"
              : "secondary-outlined";
  return (
    <Badge variant={variant as never}>{checkStatusLabel(status, direction)}</Badge>
  );
}

function DirectionBadge({ direction }: { direction: CheckDirection }) {
  return (
    <Badge variant={direction === "INCOMING" ? "success-outlined" : "info-outlined"}>
      {CHECK_DIRECTION_LABELS[direction]}
    </Badge>
  );
}

const DIRECTION_OPTIONS: Option[] = [
  { id: "INCOMING", label: "Recibidos" },
  { id: "OUTGOING", label: "Emitidos" },
];

const STATUS_OPTIONS: Option[] = [
  { id: "PENDING", label: "Pendiente" },
  { id: "DEPOSITED", label: "Depositado" },
  { id: "CLEARED", label: "Cobrado / pagado" },
  { id: "BOUNCED", label: "Protestado" },
  { id: "VOIDED", label: "Anulado" },
  { id: "ENDORSED", label: "Endosado" },
];

/** Select sincronizado con la URL (aplica al cambiar). */
export function ChecksUrlSelectFilter({
  param,
  label,
  options,
  testId,
}: {
  param: string;
  label: string;
  options: Option[];
  testId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) || "";

  const apply = (value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <div className="min-w-[11rem] max-w-xs" data-test-id={testId}>
      <Select
        label={label}
        name={`${param}-filter`}
        placeholder="Todos"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
        data-test-id={`${testId}-select`}
      />
    </div>
  );
}

export function ChecksDirectionFilter() {
  return (
    <ChecksUrlSelectFilter
      param="direction"
      label="Tipo"
      options={DIRECTION_OPTIONS}
      testId="checks-filter-direction"
    />
  );
}

export function ChecksStatusFilter() {
  return (
    <ChecksUrlSelectFilter
      param="status"
      label="Estado"
      options={STATUS_OPTIONS}
      testId="checks-filter-status"
    />
  );
}

type Props = {
  rows: CheckRow[];
  total: number;
  loadError: string | null;
  onDetails: (row: CheckRow) => void;
  committedSummary?: CommittedOutgoingChecksSummary | null;
};

export function ChecksDataGrid({
  rows,
  total,
  loadError,
  onDetails,
  committedSummary,
}: Props) {
  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "direction",
        headerName: "Tipo",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => (
          <DirectionBadge direction={(row as CheckRow).direction} />
        ),
      },
      {
        field: "checkNumber",
        headerName: "N°",
        sortable: true,
        width: 110,
        renderCell: ({ value }) => (
          <span className="font-mono text-xs">{String(value ?? "—")}</span>
        ),
      },
      {
        field: "bankName",
        headerName: "Banco",
        sortable: true,
        minWidth: 120,
        flex: 0.6,
      },
      {
        field: "counterparty",
        headerName: "Contraparte",
        sortable: true,
        minWidth: 180,
        flex: 1,
        valueGetter: ({ row }) => {
          const c = row as CheckRow;
          return c.direction === "INCOMING"
            ? c.drawerName ?? "—"
            : c.payeeName ?? "—";
        },
        renderCell: ({ value }) => {
          const text = String(value ?? "—");
          return (
            <span className="block truncate" title={text !== "—" ? text : undefined}>
              {text}
            </span>
          );
        },
      },
      {
        field: "amount",
        headerName: "Monto",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => Number((row as CheckRow).amount),
        renderCell: ({ row, value }) => (
          <span className="tabular-nums">
            {formatMoney(Number(value), (row as CheckRow).currency || "CLP")}
          </span>
        ),
      },
      {
        field: "issueDate",
        headerName: "Emisión",
        sortable: true,
        width: 118,
        valueGetter: ({ row }) => (row as CheckRow).issueDate,
        renderCell: ({ value }) => (
          <span className="tabular-nums">{formatDateOnly(String(value ?? ""))}</span>
        ),
      },
      {
        field: "dueDate",
        headerName: "A fecha",
        sortable: true,
        width: 118,
        valueGetter: ({ row }) => (row as CheckRow).dueDate ?? "",
        renderCell: ({ value }) => (
          <span className="tabular-nums">{formatDateOnly(String(value ?? ""))}</span>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: true,
        width: 180,
        minWidth: 160,
        renderCell: ({ row }) => {
          const c = row as CheckRow;
          return <StatusBadge status={c.status} direction={c.direction} />;
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        align: "right",
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const c = row as CheckRow;
          return (
            <IconButton
              icon="Eye"
              variant="action"
              size="sm"
              ariaLabel="Ver detalle"
              onClick={() => onDetails(c)}
              data-test-id={`checks-row-detail-${c.id}`}
            />
          );
        },
      },
    ],
    [onDetails],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {loadError ? (
        <p className="shrink-0 text-sm text-error" data-test-id="checks-page-error">
          {loadError}
        </p>
      ) : null}
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        fillViewport
        showExportButton={false}
        showFilterButton={false}
        showSortButton={false}
        showFooter
        showSearch
        pinActionsColumn
        actionsColumnField="actions"
        headerActions={
          <>
            {committedSummary && committedSummary.checkCount > 0 ? (
              <div
                className="w-full min-w-0"
                data-header-full-width
                data-test-id="checks-committed-summary"
              >
                <Alert variant="warning">
                  <p className="font-semibold text-foreground">
                    Cheques emitidos pendientes de compensar
                  </p>
                  <p className="mt-1 text-sm">
                    {committedSummary.checkCount} cheque
                    {committedSummary.checkCount === 1 ? "" : "s"} por{" "}
                    {formatMoney(committedSummary.totalAmount)} comprometidos en
                    caja / banco futuro.
                  </p>
                  {committedSummary.stalePendingCount > 0 ? (
                    <p className="mt-1 text-sm">
                      {committedSummary.stalePendingCount} con más de 90 días sin
                      compensar — revise conciliación bancaria.
                    </p>
                  ) : null}
                </Alert>
              </div>
            ) : null}
            <ChecksDirectionFilter />
            <ChecksStatusFilter />
          </>
        }
        data-test-id="checks-data-grid"
      />
    </div>
  );
}
