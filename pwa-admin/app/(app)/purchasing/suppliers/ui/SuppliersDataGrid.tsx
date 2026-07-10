"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGridTable as DataGrid, IconButton, type DataGridColumn } from "@kai/ui";
import { CreateSupplierDialog } from "./CreateSupplierDialog";
import { SupplierDetailDialog } from "./SupplierDetailDialog";

type SuppliersDataGridProps = {
  rows: SupplierGridRow[];
  total: number;
};

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  MANUFACTURER: "Fabricante",
  DISTRIBUTOR: "Distribuidor",
  WHOLESALER: "Mayorista",
  SERVICE_PROVIDER: "Proveedor de servicios",
  CONTRACTOR: "Contratista",
  LOGISTICS: "Logística",
  IMPORTER: "Importador",
};

function displayName(row: SupplierGridRow): string {
  const p = row.person;
  if (!p) {
    return row.alias?.trim() || "—";
  }
  const alias = row.alias?.trim();
  if (alias) {
    return alias;
  }
  const business = p.businessName?.trim();
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

function titularLabel(row: SupplierGridRow): string {
  const t = row.person?.type;
  if (t === "COMPANY") {
    return "Empresa";
  }
  return "Persona";
}

function documentLine(row: SupplierGridRow): string {
  const p = row.person;
  if (!p?.documentNumber?.trim()) {
    return "—";
  }
  const dt = p.documentType?.trim() || "—";
  return `${dt}: ${p.documentNumber}`;
}

export default function SuppliersDataGrid({ rows, total }: SuppliersDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);

  const columns: DataGridColumn[] = useMemo(() => {
    function SupplierActionsCell({ row }: { row: unknown }) {
      const r = row as SupplierGridRow;
      return (
        <div className="flex items-center justify-center" data-test-id={`suppliers-row-actions-${r.id}`}>
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle del proveedor"
            onClick={() => setDetailSupplierId(r.id)}
            data-test-id={`suppliers-row-detail-${r.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "displayName",
        headerName: "Nombre / Razón social",
        sortable: false,
        minWidth: 220,
        flex: 1,
        valueGetter: ({ row }) => displayName(row as SupplierGridRow),
      },
      {
        field: "titular",
        headerName: "Titular",
        sortable: false,
        width: 110,
        valueGetter: ({ row }) => titularLabel(row as SupplierGridRow),
      },
      {
        field: "document",
        headerName: "Documento",
        sortable: false,
        minWidth: 140,
        valueGetter: ({ row }) => documentLine(row as SupplierGridRow),
      },
      {
        field: "supplierType",
        headerName: "Categoría",
        sortable: true,
        width: 180,
        valueGetter: ({ row }) => {
          const st = (row as SupplierGridRow).supplierType;
          return SUPPLIER_TYPE_LABEL[st] ?? st;
        },
      },
      {
        field: "defaultPaymentTermDays",
        headerName: "Plazo (días)",
        width: 110,
        align: "right",
        valueGetter: ({ row }) => String((row as SupplierGridRow).defaultPaymentTermDays ?? 0),
      },
      {
        field: "isActive",
        headerName: "Activo",
        width: 90,
        valueGetter: ({ row }) => (row as SupplierGridRow).isActive,
        renderCell: ({ value }) => (
          <span className={value ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
            {value ? "Sí" : "No"}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SupplierActionsCell,
      },
    ];
  }, []);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        title="Proveedores"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        showSortButton={false}
        showFilterButton={false}
        onAddClick={() => setCreateOpen(true)}
        pinActionsColumn
        data-test-id="suppliers-data-grid"
      />
      <CreateSupplierDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={onSuccess} />
      <SupplierDetailDialog
        open={detailSupplierId != null}
        supplierId={detailSupplierId}
        onClose={() => setDetailSupplierId(null)}
      />
    </>
  );
}
