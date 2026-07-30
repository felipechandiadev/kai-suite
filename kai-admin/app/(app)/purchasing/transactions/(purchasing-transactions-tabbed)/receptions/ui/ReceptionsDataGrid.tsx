"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { ReceptionGridRow } from "@/features/receptions/types/reception.types";
import ReceptionDetailDialog from "@/features/purchasing-document/ui/ReceptionDetailDialog";

type ReceptionsDataGridProps = {
  rows: ReceptionGridRow[];
  total: number;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

const DTE_TYPE_LABEL: Record<string, string> = {
  invoice: "Factura",
  receipt: "Boleta",
  guide: "Guía",
  other: "Otro",
};

const ORIGIN_LABEL: Record<string, string> = {
  direct: "Directa",
  "from-purchase-order": "Desde OC",
};

export default function ReceptionsDataGrid({ rows, total }: ReceptionsDataGridProps) {
  const router = useRouter();
  const [detailReceptionId, setDetailReceptionId] = useState<string | null>(null);

  const openDetail = useCallback((r: ReceptionGridRow) => {
    setDetailReceptionId(r.id);
  }, []);

  const columns: DataGridColumn[] = useMemo(
    () => {
      function ReceptionActionsCell({ row }: { row: unknown; column: DataGridColumn }) {
        const r = row as ReceptionGridRow;
        return (
          <div
            className="flex items-center justify-center"
            data-test-id={`receptions-row-actions-${r.id}`}
          >
            <IconButton
              icon="MoreHorizontal"
              variant="action"
              size="sm"
              ariaLabel="Ver detalle de la recepción"
              onClick={() => openDetail(r)}
              data-test-id={`receptions-row-detail-${r.id}`}
            />
          </div>
        );
      }

      return [
        {
          field: "folio",
          headerName: "Folio recepción",
          sortable: false,
          minWidth: 130,
          flex: 0.7,
          cellOverflow: "truncate",
          valueGetter: ({ row }) => {
            const r = row as ReceptionGridRow;
            const folio = (r.folio ?? r.documentNumber ?? "").trim();
            return folio || "—";
          },
        },
        {
          field: "dteType",
          headerName: "Tipo DTE",
          sortable: false,
          width: 100,
          valueGetter: ({ row }) => {
            const k = String((row as ReceptionGridRow).dteType || "").toLowerCase();
            return k ? (DTE_TYPE_LABEL[k] ?? k) : "—";
          },
        },
        {
          field: "reference",
          headerName: "Referencia",
          sortable: false,
          minWidth: 120,
          flex: 0.65,
          valueGetter: ({ row }) => {
            const r = row as ReceptionGridRow;
            const ref =
              r.reference?.trim() ||
              r.supplierDocumentRef?.trim() ||
              "";
            return ref || "—";
          },
        },
        {
          field: "supplierName",
          headerName: "Proveedor",
          sortable: false,
          minWidth: 160,
          flex: 1,
          valueGetter: ({ row }) => String((row as ReceptionGridRow).supplierName || "—"),
        },
        {
          field: "supplierDni",
          headerName: "RUT",
          sortable: false,
          width: 120,
          valueGetter: ({ row }) => String((row as ReceptionGridRow).supplierDni || "—"),
        },
        {
          field: "storageName",
          headerName: "Almacén",
          sortable: false,
          minWidth: 88,
          flex: 0.5,
          valueGetter: ({ row }) => String((row as ReceptionGridRow).storageName || "—"),
        },
        {
          field: "type",
          headerName: "Origen",
          sortable: false,
          minWidth: 75,
          width: 75,
          flex: 0.42,
          cellOverflow: "truncate",
          valueGetter: ({ row }) => {
            const r = row as ReceptionGridRow;
            const k = String(r.type || "").toLowerCase();
            if (k === "from-purchase-order") {
              const poFolio = (r.purchaseOrderNumber ?? "").trim();
              return poFolio || ORIGIN_LABEL[k] || k;
            }
            return k ? (ORIGIN_LABEL[k] ?? k) : "—";
          },
        },
        {
          field: "subtotal",
          headerName: "Neto",
          sortable: false,
          width: 110,
          align: "right",
          valueGetter: ({ row }) =>
            formatMoney(Number((row as ReceptionGridRow).subtotal ?? 0)),
        },
        {
          field: "taxAmount",
          headerName: "Impuestos",
          sortable: false,
          width: 110,
          align: "right",
          valueGetter: ({ row }) =>
            formatMoney(Number((row as ReceptionGridRow).taxAmount ?? 0)),
        },
        {
          field: "total",
          headerName: "Total",
          sortable: false,
          width: 110,
          align: "right",
          valueGetter: ({ row }) => formatMoney(Number((row as ReceptionGridRow).total ?? 0)),
        },
        {
          field: "actions",
          headerName: "",
          width: 72,
          minWidth: 72,
          align: "center",
          sortable: false,
          filterable: false,
          actionComponent: ReceptionActionsCell,
        },
      ];
    },
    [openDetail],
  );

  return (
    <>
      <DataGrid
        title=""
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        pinActionsColumn
        onAddClick={() => router.push("/purchasing/transactions/receptions/new")}
        addButtonVariant="pillOutlined"
        addButtonLabel="Recepción"
        data-test-id="receptions-data-grid"
      />
      <ReceptionDetailDialog
        receptionId={detailReceptionId}
        open={detailReceptionId != null}
        onClose={() => setDetailReceptionId(null)}
      />
    </>
  );
}
