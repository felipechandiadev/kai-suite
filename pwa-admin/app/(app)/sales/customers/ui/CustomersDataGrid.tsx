"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import type { CustomerListRow } from "@/features/sales-customers/types/customer.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import IconButton from "@/shared/components/IconButton/IconButton";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CustomerDetailDialog } from "./CustomerDetailDialog";

type CustomersDataGridProps = {
  rows: CustomerListRow[];
  total: number;
  internalCreditEnabled?: boolean;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CustomersDataGrid({
  rows,
  total,
  internalCreditEnabled = true,
}: CustomersDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  const columns: DataGridColumn[] = useMemo(() => {
    function CustomerActionsCell({ row }: { row: any }) {
      const r = row as CustomerListRow;
      return (
        <div className="flex items-center justify-center" data-test-id={`customers-row-actions-${r.customerId}`}>
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle del cliente"
            onClick={() => setDetailCustomerId(r.customerId)}
            data-test-id={`customers-row-detail-${r.customerId}`}
          />
        </div>
      );
    }

    const base: DataGridColumn[] = [
      {
        field: "displayName",
        headerName: "Nombre",
        sortable: false,
        minWidth: 200,
        flex: 1,
        valueGetter: ({ row }) => (row as CustomerListRow).displayName || "—",
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        sortable: false,
        width: 150,
        minWidth: 130,
        maxWidth: 200,
        valueGetter: ({ row }) => (row as CustomerListRow).documentNumber?.trim() || "—",
      },
      {
        field: "documentType",
        headerName: "Tipo doc.",
        sortable: false,
        width: 100,
        minWidth: 88,
        valueGetter: ({ row }) => documentTypeLabel((row as CustomerListRow).documentType),
      },
      {
        field: "email",
        headerName: "Correo",
        sortable: false,
        minWidth: 160,
        flex: 0.8,
        valueGetter: ({ row }) => (row as CustomerListRow).email?.trim() || "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        sortable: false,
        width: 120,
        valueGetter: ({ row }) => (row as CustomerListRow).phone?.trim() || "—",
      },
      {
        field: "hasEshopAccount",
        headerName: "eShop",
        sortable: false,
        width: 100,
        minWidth: 88,
        valueGetter: ({ row }) => (row as CustomerListRow).hasEshopAccount === true,
        renderCell: ({ row }) => {
          const r = row as CustomerListRow;
          if (!r.hasEshopAccount) {
            return <span className="text-muted-foreground">—</span>;
          }
          const label = r.eshopUsername?.trim() || r.eshopLoginEmail?.trim() || "Sí";
          return (
            <span className="text-primary" title={r.eshopLoginEmail ?? undefined}>
              {label}
            </span>
          );
        },
      },
    ];
    if (internalCreditEnabled) {
      base.push(
        {
          field: "creditLimit",
          headerName: "Límite crédito",
          sortable: false,
          width: 130,
          align: "right",
          valueGetter: ({ row }) => fmtClp(Number((row as CustomerListRow).creditLimit ?? 0)),
        },
        {
          field: "availableCredit",
          headerName: "Crédito disponible",
          sortable: false,
          width: 140,
          align: "right",
          valueGetter: ({ row }) =>
            fmtClp(Number((row as CustomerListRow).availableCredit ?? 0)),
        },
        {
          field: "paymentDayOfMonth",
          headerName: "Día pago",
          width: 90,
          align: "right",
          valueGetter: ({ row }) => String((row as CustomerListRow).paymentDayOfMonth ?? "—"),
        },
      );
    }
    base.push(
      {
        field: "isActive",
        headerName: "Activo",
        width: 80,
        valueGetter: ({ row }) => (row as CustomerListRow).isActive,
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
        actionComponent: CustomerActionsCell,
      },
    );
    return base;
  }, [internalCreditEnabled]);

  const onSuccess = useCallback(async () => {
    await router.refresh();
  }, [router]);

  return (
    <>
      <DataGrid
        title="Clientes"
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
        data-test-id="customers-data-grid"
      />
      <CreateCustomerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={onSuccess}
        internalCreditEnabled={internalCreditEnabled}
      />
      <CustomerDetailDialog
        open={detailCustomerId != null}
        customerId={detailCustomerId}
        onClose={() => setDetailCustomerId(null)}
        internalCreditEnabled={internalCreditEnabled}
      />
    </>
  );
}
