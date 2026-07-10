"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { dataGridFillViewportTabPageProps } from "@kai/ui";
import Badge, { type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  QUOTATION_EFFECTIVE_STATUS_LABEL,
  type QuotationEffectiveStatus,
  type QuotationRow,
} from "@/features/quotations/types/quotation.types";
import { QuotationDetailDialog } from "../QuotationDetailDialog";

type QuotationsDataGridProps = {
  rows: QuotationRow[];
  total: number;
};

function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function statusBadgeVariant(status: QuotationEffectiveStatus): BadgeVariant {
  if (status === "ACTIVE") return "success-outlined";
  if (status === "EXPIRED") return "warning-outlined";
  if (status === "CONVERTED") return "primary-outlined";
  return "secondary-outlined";
}

export default function QuotationsDataGrid({
  rows,
  total,
}: QuotationsDataGridProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<QuotationRow | null>(null);

  const onView = useCallback((r: QuotationRow) => {
    setSelected(r);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function QuotationActionsCell({ row }: { row: any; column: DataGridColumn }) {
      const r = row as QuotationRow;
      return (
        <div
          className="flex items-center justify-center"
          data-test-id={`quotations-row-actions-${r.id}`}
        >
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle"
            onClick={() => onView(r)}
            data-test-id={`quotations-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "documentNumber",
        headerName: "Folio",
        sortable: false,
        minWidth: 140,
        flex: 0.7,
        valueGetter: ({ row }) => (row as QuotationRow).documentNumber || "—",
      },
      {
        field: "customerName",
        headerName: "Cliente",
        sortable: false,
        minWidth: 200,
        flex: 1,
        valueGetter: ({ row }) => {
          const r = row as QuotationRow;
          if (!r.customerName) return "—";
          return r.customerDocument
            ? `${r.customerName} (${r.customerDocument})`
            : r.customerName;
        },
      },
      {
        field: "total",
        headerName: "Total",
        sortable: false,
        width: 130,
        align: "right",
        valueGetter: ({ row }) => {
          const r = row as QuotationRow;
          return formatMoney(Number(r.total ?? 0), r.currency || "CLP");
        },
      },
      {
        field: "issuedAt",
        headerName: "Emitida",
        sortable: false,
        width: 150,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as QuotationRow).issuedAt),
      },
      {
        field: "validUntil",
        headerName: "Vence",
        sortable: false,
        width: 150,
        valueGetter: ({ row }) =>
          formatDateTimeSlash((row as QuotationRow).validUntil),
      },
      {
        field: "effectiveStatus",
        headerName: "Estado",
        sortable: false,
        width: 130,
        valueGetter: ({ row }) => (row as QuotationRow).effectiveStatus,
        renderCell: ({ value }) => {
          const status = value as QuotationEffectiveStatus;
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {QUOTATION_EFFECTIVE_STATUS_LABEL[status]}
            </Badge>
          );
        },
      },
      {
        field: "convertedToDocumentNumber",
        headerName: "Convertida a",
        sortable: false,
        width: 140,
        valueGetter: ({ row }) =>
          (row as QuotationRow).convertedToDocumentNumber ?? "—",
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: QuotationActionsCell,
      },
    ];
  }, [onView]);

  const onChanged = useCallback(() => {
    setSelected(null);
    router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        {...dataGridFillViewportTabPageProps}
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        data-test-id="quotations-data-grid"
      />
      <QuotationDetailDialog
        quotation={selected}
        onClose={() => setSelected(null)}
        onChanged={onChanged}
      />
    </>
  );
}
