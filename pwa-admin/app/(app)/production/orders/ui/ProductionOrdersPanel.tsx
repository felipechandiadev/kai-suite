"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, DataGridTable as DataGrid, type DataGridColumn } from "@kai/ui";
import type { ProductionBatchListItem } from "@/features/inventory-production/types/production-batch.types";

type Props = {
  rows: ProductionBatchListItem[];
};

type GridRow = ProductionBatchListItem & {
  fecha: string;
  codigo: string;
  producto: string;
  cantidad: string;
  almacen: string;
};

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return <Badge variant="success">Completada</Badge>;
  if (s === "CANCELLED") return <Badge variant="secondary">Cancelada</Badge>;
  if (s === "DRAFT") return <Badge variant="warning">Borrador</Badge>;
  return <Badge variant="info">{status || "—"}</Badge>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const columns: DataGridColumn[] = [
  { field: "codigo", headerName: "Código", minWidth: 120, flex: 1, sortable: false, filterable: false },
  { field: "fecha", headerName: "Fecha", minWidth: 140, flex: 1, sortable: false, filterable: false },
  { field: "producto", headerName: "Producto", minWidth: 160, flex: 1.4, sortable: false, filterable: false },
  { field: "cantidad", headerName: "Cantidad", width: 100, sortable: false, filterable: false },
  { field: "almacen", headerName: "Insumos / Salida", minWidth: 160, flex: 1.2, sortable: false, filterable: false },
  {
    field: "status",
    headerName: "Estado",
    width: 130,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => statusBadge(String((row as GridRow).status)),
  },
];

export function ProductionOrdersPanel({ rows }: Props) {
  const router = useRouter();
  const gridRows: GridRow[] = rows.map((r) => ({
    ...r,
    codigo: r.documentNumber ?? "—",
    fecha: formatDate(r.createdAt),
    producto: r.outputProductName ?? "—",
    cantidad:
      r.outputQuantity != null && Number.isFinite(r.outputQuantity) ? String(r.outputQuantity) : "—",
    almacen: (() => {
      const input = r.storageName ?? r.storageId ?? "—";
      const out = r.outputStorageId;
      if (!out || out === r.storageId) return input;
      return `${input} → ${out.slice(0, 8)}…`;
    })(),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4" data-test-id="production-orders-panel">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Órdenes de producción</h1>
        <Link href="/production/orders/new">
          <Button variant="primary" data-test-id="production-orders-create">
            Crear producción
          </Button>
        </Link>
      </div>
      <DataGrid
        columns={columns}
        rows={gridRows}
        onRowClick={(row) => {
          const id = (row as GridRow).id;
          if (id) router.push(`/production/orders/${id}`);
        }}
        data-test-id="production-orders-grid"
      />
    </div>
  );
}
