"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { PurchaseReturnListItem } from "@/features/purchasing-purchase-returns/types/purchase-return.types";
import PurchaseReturnDetailDialog from "@/features/purchasing-purchase-returns/ui/PurchaseReturnDetailDialog";

export type PurchaseReturnGridRow = PurchaseReturnListItem & {
  supplierName: string;
  receptionFolio: string | null;
};

type PurchaseReturnsDataGridProps = {
  rows: PurchaseReturnGridRow[];
  total: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) {
    return "—";
  }
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function PurchaseReturnsDataGrid({ rows, total }: PurchaseReturnsDataGridProps) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);

  const openDetail = useCallback((r: PurchaseReturnGridRow) => {
    setDetailId(r.id);
  }, []);

  const columns: DataGridColumn[] = useMemo(
    () => {
      function PurchaseReturnActionsCell({ row }: { row: unknown; column: DataGridColumn }) {
        const r = row as PurchaseReturnGridRow;
        return (
          <div
            className="flex items-center justify-center"
            data-test-id={`purchase-returns-row-actions-${r.id}`}
          >
            <IconButton
              icon="MoreHorizontal"
              variant="action"
              size="sm"
              ariaLabel="Ver detalle de la devolución"
              onClick={() => openDetail(r)}
              data-test-id={`purchase-returns-row-detail-${r.id}`}
            />
          </div>
        );
      }

      return [
        {
          field: "documentNumber",
          headerName: "Folio devolución",
          sortable: false,
          minWidth: 130,
          flex: 0.75,
          cellOverflow: "truncate",
          valueGetter: ({ row }) => {
            const r = row as PurchaseReturnGridRow;
            const folio = (r.documentNumber ?? "").trim();
            return folio || "—";
          },
        },
        {
          field: "receptionFolio",
          headerName: "Folio recepción origen",
          sortable: false,
          minWidth: 140,
          flex: 0.8,
          cellOverflow: "truncate",
          valueGetter: ({ row }) => {
            const r = row as PurchaseReturnGridRow;
            return (r.receptionFolio ?? "").trim() || "—";
          },
        },
        {
          field: "createdAt",
          headerName: "Fecha",
          sortable: false,
          width: 150,
          valueGetter: ({ row }) => formatDateTimeSlash((row as PurchaseReturnGridRow).createdAt),
        },
        {
          field: "supplierName",
          headerName: "Proveedor",
          sortable: false,
          minWidth: 180,
          flex: 1.1,
          cellOverflow: "truncate",
        },
        {
          field: "total",
          headerName: "Total",
          sortable: false,
          width: 120,
          align: "right",
          valueGetter: ({ row }) => formatMoney(Number((row as PurchaseReturnGridRow).total ?? 0)),
        },
        {
          field: "actions",
          headerName: "",
          width: 72,
          minWidth: 72,
          align: "center",
          sortable: false,
          filterable: false,
          actionComponent: PurchaseReturnActionsCell,
        },
      ];
    },
    [openDetail],
  );

  return (
    <>
      <DataGrid
        title="Devoluciones de compra"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        onAddClick={() => router.push("/purchasing/transactions/purchase-returns/new")}
        data-test-id="purchase-returns-data-grid"
      />
      <PurchaseReturnDetailDialog
        purchaseReturnId={detailId}
        open={detailId != null}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
