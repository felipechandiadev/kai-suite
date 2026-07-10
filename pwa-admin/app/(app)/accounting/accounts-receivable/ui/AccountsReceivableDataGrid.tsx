"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Badge, { DataGridTable as DataGrid, IconButton, dataGridFillViewportTabPageProps } from "@kai/ui";
import { labelAccountsReceivableStatus } from "@/features/accounting-accounts-receivable/lib/accounts-receivable-labels";
import CompleteAccountsReceivablePaymentDialog from "./CompleteAccountsReceivablePaymentDialog";
import AccountsReceivablePaymentDetailsDialog from "./AccountsReceivablePaymentDetailsDialog";
import AccountsReceivableGridFilters from "./AccountsReceivableGridFilters";

type AccountsReceivableDataGridProps = {
  rows: AccountsReceivableRow[];
  total: number;
};

function fmtClp(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const variant =
    status === "PAID"
      ? "success-outlined"
      : status === "PARTIAL"
        ? "info-outlined"
        : status === "OVERDUE" || isOverdue
          ? "error-outlined"
          : "warning-outlined";
  return (
    <Badge variant={variant as "success-outlined"}>
      {labelAccountsReceivableStatus(status)}
      {isOverdue && status !== "PAID" && status !== "OVERDUE" ? " (vencida)" : ""}
    </Badge>
  );
}

function isCollectable(row: AccountsReceivableRow): boolean {
  return row.status !== "PAID" && Number(row.pendingAmount) > 0;
}

export default function AccountsReceivableDataGrid({
  rows,
  total,
}: AccountsReceivableDataGridProps) {
  const router = useRouter();
  const [payRow, setPayRow] = useState<AccountsReceivableRow | null>(null);
  const [detailsRow, setDetailsRow] = useState<AccountsReceivableRow | null>(null);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio venta",
        sortable: true,
        width: 148,
        valueGetter: ({ row }) => {
          const folio = (row as AccountsReceivableRow).documentNumber?.trim();
          return folio || "—";
        },
        renderCell: ({ value }) => {
          const folio = String(value ?? "—");
          return (
            <span
              className="block truncate font-mono text-xs text-foreground"
              title={folio !== "—" ? folio : undefined}
            >
              {folio}
            </span>
          );
        },
      },
      {
        field: "customerName",
        headerName: "Cliente",
        sortable: true,
        minWidth: 180,
        flex: 1,
        valueGetter: ({ row }) => (row as AccountsReceivableRow).customerName?.trim() || "—",
      },
      {
        field: "installmentNumber",
        headerName: "Cuota",
        sortable: true,
        width: 90,
        align: "center",
        valueGetter: ({ row }) => {
          const r = row as AccountsReceivableRow;
          if (!r.totalInstallments || r.totalInstallments <= 1) return "Única";
          return `${r.installmentNumber}/${r.totalInstallments}`;
        },
      },
      {
        field: "dueDate",
        headerName: "Vencimiento",
        sortable: true,
        width: 120,
        valueGetter: ({ row }) => fmtDate((row as AccountsReceivableRow).dueDate),
      },
      {
        field: "amount",
        headerName: "Monto cuota",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as AccountsReceivableRow).amount),
      },
      {
        field: "amountPaid",
        headerName: "Pagado",
        sortable: true,
        width: 110,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as AccountsReceivableRow).amountPaid),
      },
      {
        field: "pendingAmount",
        headerName: "Pendiente",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as AccountsReceivableRow).pendingAmount),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: true,
        width: 130,
        renderCell: ({ row }) => {
          const r = row as AccountsReceivableRow;
          return <StatusBadge status={r.status} isOverdue={r.isOverdue} />;
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 92,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const r = row as AccountsReceivableRow;
          const canCollect = isCollectable(r);
          return (
            <div className="flex items-center justify-center gap-1">
              {canCollect ? (
                <IconButton
                  icon="HandCoins"
                  variant="action"
                  size="sm"
                  title="Cobrar"
                  ariaLabel="Cobrar"
                  onClick={() => setPayRow(r)}
                  data-test-id="accounts-receivable-collect-btn"
                />
              ) : null}
              <IconButton
                icon="MoreHorizontal"
                variant="action"
                size="sm"
                title="Ver detalle"
                ariaLabel="Ver detalle"
                onClick={() => setDetailsRow(r)}
                data-test-id="accounts-receivable-details-btn"
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  const headerActions = useMemo(
    () => (
      <Suspense fallback={null}>
        <AccountsReceivableGridFilters />
      </Suspense>
    ),
    [],
  );

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        headerActions={headerActions}
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        showFooter
        pinActionsColumn
        {...dataGridFillViewportTabPageProps}
        data-test-id="accounts-receivable-data-grid"
      />
      <CompleteAccountsReceivablePaymentDialog
        open={Boolean(payRow)}
        row={payRow}
        onClose={() => setPayRow(null)}
        onSuccess={() => router.refresh()}
      />
      <AccountsReceivablePaymentDetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </>
  );
}
