"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { MetalPriceRow } from "@/features/metal-prices/types/metal-price.types";
import { CreateMetalPriceDialog } from "./CreateMetalPriceDialog";
import { UpdateMetalPriceDialog } from "./UpdateMetalPriceDialog";
import { DeleteMetalPriceDialog } from "./DeleteMetalPriceDialog";

type MetalPricesDataGridProps = {
  rows: MetalPriceRow[];
};

function formatDateOnlySlash(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function MetalPricesDataGrid({ rows }: MetalPricesDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MetalPriceRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<MetalPriceRow | null>(null);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  const columns: DataGridColumn[] = useMemo(() => {
    function MetalPriceActionsCell({ row }: { row: unknown }) {
      const r = row as MetalPriceRow;
      return (
        <div className="flex items-center justify-center gap-1">
          <IconButton
            icon="Pencil"
            variant="action"
            ariaLabel="Actualizar precio de metal"
            onClick={() => setEditRow(r)}
            data-test-id={`metal-price-edit-${r.id}`}
          />
          <IconButton
            icon="Trash2"
            variant="action"
            ariaLabel="Eliminar precio de metal"
            onClick={() => setDeleteRow(r)}
            data-test-id={`metal-price-delete-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "metal",
        headerName: "Metal",
        sortable: true,
        minWidth: 140,
      },
      {
        field: "date",
        headerName: "Fecha",
        sortable: true,
        width: 120,
        valueGetter: ({ row }) => formatDateOnlySlash((row as MetalPriceRow).date),
      },
      {
        field: "valueCLP",
        headerName: "Valor CLP",
        sortable: true,
        width: 140,
        align: "right",
        valueGetter: ({ row }) => fmtClp((row as MetalPriceRow).valueCLP),
      },
      {
        field: "notes",
        headerName: "Notas",
        sortable: false,
        minWidth: 200,
        flex: 1,
        valueGetter: ({ row }) => (row as MetalPriceRow).notes || "—",
      },
      {
        field: "actions",
        headerName: "",
        width: 96,
        minWidth: 96,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: MetalPriceActionsCell,
      },
    ];
  }, []);

  return (
    <>
      <DataGrid
        title="Precios de metales"
        columns={columns}
        rows={rows}
        totalRows={rows.length}
        totalGeneral={rows.length}
        height="85vh"
        showExportButton={false}
        showFilterButton={false}
        showSortButton={false}
        onAddClick={() => setCreateOpen(true)}
        pinActionsColumn
        data-test-id="metal-prices-data-grid"
      />
      <CreateMetalPriceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
      />
      <UpdateMetalPriceDialog
        open={editRow != null}
        onClose={() => setEditRow(null)}
        row={editRow}
        onSuccess={onSuccess}
      />
      <DeleteMetalPriceDialog
        open={deleteRow != null}
        onClose={() => setDeleteRow(null)}
        row={deleteRow}
        onSuccess={onSuccess}
      />
    </>
  );
}
