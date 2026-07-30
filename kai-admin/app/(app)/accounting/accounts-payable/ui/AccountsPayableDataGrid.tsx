"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, DataGridTable as DataGrid, IconButton, dataGridFillViewportTabPageProps } from "@kai/ui";
import {
  labelAccountsPayableOriginCategory,
  labelAccountsPayablePayeeType,
  labelAccountsPayableStatus,
  resolveAccountsPayableOriginCategoryFromRow,
} from "@/features/accounting-accounts-payable/lib/accounts-payable-labels";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";
import CompleteAccountsPayablePaymentDialog from "./CompleteAccountsPayablePaymentDialog";
import AccountsPayablePaymentDetailsDialog from "./AccountsPayablePaymentDetailsDialog";

type AccountsPayableDataGridProps = {
  rows: AccountsPayableRow[];
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
      {labelAccountsPayableStatus(status)}
    </Badge>
  );
}

function OriginCategoryBadge({ category }: { category: string }) {
  const variant =
    category === "PAYROLL"
      ? "secondary-outlined"
      : category === "OPERATING_EXPENSE"
        ? "info-outlined"
        : category === "PURCHASE"
          ? "warning-outlined"
          : "secondary-outlined";
  return (
    <Badge variant={variant as "info-outlined"}>
      {labelAccountsPayableOriginCategory(category)}
    </Badge>
  );
}

export default function AccountsPayableDataGrid({ rows }: AccountsPayableDataGridProps) {
  const router = useRouter();
  const [payRow, setPayRow] = useState<AccountsPayableRow | null>(null);
  const [detailsRow, setDetailsRow] = useState<AccountsPayableRow | null>(null);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: true,
        width: 148,
        valueGetter: ({ row }) => {
          const folio = (row as AccountsPayableRow).documentNumber?.trim();
          return folio || "—";
        },
        renderCell: ({ row, value }) => {
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
        field: "payeeName",
        headerName: "Beneficiario",
        sortable: true,
        minWidth: 180,
        flex: 1,
        valueGetter: ({ row }) => (row as AccountsPayableRow).payeeName?.trim() || "—",
      },
      {
        field: "parentDocumentNumber",
        headerName: "Documento origen",
        sortable: true,
        minWidth: 140,
        valueGetter: ({ row }) => {
          const r = row as AccountsPayableRow;
          return r.parentDocumentNumber || r.fromReceptionNumber || "—";
        },
      },
      {
        field: "originCategory",
        headerName: "Tipo de obligación",
        sortable: true,
        width: 148,
        valueGetter: ({ row }) =>
          labelAccountsPayableOriginCategory(
            resolveAccountsPayableOriginCategoryFromRow(row as AccountsPayableRow),
          ),
        renderCell: ({ row }) => {
          const category = resolveAccountsPayableOriginCategoryFromRow(
            row as AccountsPayableRow,
          );
          return <OriginCategoryBadge category={String(category)} />;
        },
      },
      {
        field: "parentType",
        headerName: "Doc. origen",
        sortable: true,
        minWidth: 130,
        flex: 0.55,
        valueGetter: ({ row }) => {
          const r = row as AccountsPayableRow;
          return getTransactionTypeLabel(r.parentType);
        },
      },
      {
        field: "payeeType",
        headerName: "Beneficiario tipo",
        sortable: true,
        width: 132,
        valueGetter: ({ row }) => labelAccountsPayablePayeeType((row as AccountsPayableRow).payeeType),
      },
      {
        field: "installmentNumber",
        headerName: "Cuota",
        sortable: true,
        width: 90,
        align: "center",
        valueGetter: ({ row }) => {
          const r = row as AccountsPayableRow;
          if (!r.totalInstallments || r.totalInstallments <= 1) return "Única";
          return `${r.installmentNumber}/${r.totalInstallments}`;
        },
      },
      {
        field: "pendingAmount",
        headerName: "Pendiente",
        sortable: true,
        width: 120,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as AccountsPayableRow).pendingAmount),
      },
      {
        field: "dueDate",
        headerName: "Vencimiento",
        sortable: true,
        width: 120,
        valueGetter: ({ row }) => fmtDate((row as AccountsPayableRow).dueDate),
      },
      {
        field: "status",
        headerName: "Estado",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as AccountsPayableRow;
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
          const r = row as AccountsPayableRow;
          return (
            <div className="flex items-center justify-center gap-1">
              <IconButton
                icon="HandCoins"
                variant="action"
                size="sm"
                title="Pagar"
                ariaLabel="Pagar"
                onClick={() => setPayRow(r)}
                data-test-id="accounts-payable-pay-btn"
              />
              <IconButton
                icon="MoreHorizontal"
                variant="action"
                size="sm"
                title="Ver detalle"
                ariaLabel="Ver detalle del pago"
                onClick={() => setDetailsRow(r)}
                data-test-id="accounts-payable-details-btn"
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <DataGrid
          columns={columns}
          rows={rows}
          totalRows={rows.length}
          totalGeneral={rows.length}
          showExportButton={false}
          showSortButton={false}
          showFilterButton={false}
          showFooter
          pinActionsColumn
          {...dataGridFillViewportTabPageProps}
          data-test-id="accounts-payable-data-grid"
        />
      </div>
      <CompleteAccountsPayablePaymentDialog
        open={Boolean(payRow)}
        row={payRow}
        onClose={() => setPayRow(null)}
        onSuccess={() => router.refresh()}
      />
      <AccountsPayablePaymentDetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </>
  );
}
