"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataGridTable as DataGrid,
  Dialog,
  IconButton,
  LoadingState,
  type DataGridColumn,
} from "@kai/ui";
import {
  getEmployeeSalesCommissionsSummaryAction,
  listEmployeeSalesCommissionSalesAction,
} from "@/features/hr-employees/actions/sales-commissions.action";
import type {
  SalesCommissionMonthSummary,
  SalesCommissionSaleRow,
} from "@/features/hr-employees/types/sales-commissions.types";
import { formatDateOnlySlash, formatMoneyClp } from "./employee-detail-labels";

function formatYearMonthLabel(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const idx = Number(m[2]) - 1;
  return `${months[idx] ?? m[2]} ${m[1]}`;
}

type Props = {
  employeeId: string;
  percent: number;
};

export function EmployeeDetailCommissionsSection({
  employeeId,
  percent,
}: Props) {
  const [months, setMonths] = useState<SalesCommissionMonthSummary[]>([]);
  const [linked, setLinked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogMonth, setDialogMonth] = useState<string | null>(null);
  const [salesRows, setSalesRows] = useState<SalesCommissionSaleRow[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(25);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  useEffect(() => {
    const id = employeeId.trim();
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getEmployeeSalesCommissionsSummaryAction(id, 12).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setLinked(res.data.linked);
      setMonths(res.data.months ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const loadSalesPage = useCallback(
    async (yearMonth: string, page: number, limit: number) => {
      setSalesLoading(true);
      setSalesError(null);
      const res = await listEmployeeSalesCommissionSalesAction({
        employeeId,
        yearMonth,
        page,
        limit,
      });
      setSalesLoading(false);
      if (!res.success) {
        setSalesError(res.message);
        setSalesRows([]);
        setSalesTotal(0);
        return;
      }
      setSalesRows(res.data.items ?? []);
      setSalesTotal(res.data.total ?? 0);
      setSalesPage(res.data.page ?? page);
      setSalesLimit(res.data.limit ?? limit);
    },
    [employeeId],
  );

  const openMonthDialog = (yearMonth: string) => {
    setDialogMonth(yearMonth);
    setSalesPage(1);
    void loadSalesPage(yearMonth, 1, salesLimit);
  };

  const saleColumns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "occurredAt",
        headerName: "Fecha",
        width: 120,
        sortable: false,
        valueGetter: ({ row }) =>
          formatDateOnlySlash(String((row as SalesCommissionSaleRow).occurredAt)),
      },
      {
        field: "documentNumber",
        headerName: "Folio",
        minWidth: 110,
        flex: 0.8,
        sortable: false,
      },
      {
        field: "pointOfSaleName",
        headerName: "POS",
        minWidth: 120,
        flex: 1,
        sortable: false,
        valueGetter: ({ row }) =>
          (row as SalesCommissionSaleRow).pointOfSaleName ?? "—",
      },
      {
        field: "total",
        headerName: "Bruto",
        width: 120,
        align: "right",
        sortable: false,
        renderCell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoneyClp((row as SalesCommissionSaleRow).total)}
          </span>
        ),
      },
      {
        field: "commission",
        headerName: "Comisión",
        width: 120,
        align: "right",
        sortable: false,
        renderCell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoneyClp((row as SalesCommissionSaleRow).commission)}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <LoadingState
        className="flex items-center justify-center py-8"
        label="Cargando comisiones"
      />
    );
  }

  if (error) {
    return (
      <p
        className="text-sm text-error"
        role="alert"
        data-test-id="employee-detail-commissions-error"
      >
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-test-id="employee-detail-commissions">
      <p className="text-xs text-muted-foreground">
        Comisión {percent}% sobre ventas brutas POS (últimos 12 meses).
      </p>
      {!linked ? (
        <p
          className="text-sm text-muted-foreground"
          data-test-id="employee-detail-commissions-unlinked"
        >
          Este empleado no tiene un usuario POS vinculado a la misma persona. Las
          ventas no se pueden atribuir.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-2 py-2 font-medium">Mes</th>
              <th className="px-2 py-2 font-medium text-right">Ventas</th>
              <th className="px-2 py-2 font-medium text-right">Bruto</th>
              <th className="px-2 py-2 font-medium text-right">Comisión</th>
              <th className="w-12 px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {months.map((row) => (
              <tr
                key={row.yearMonth}
                className="border-b border-border/60"
                data-test-id={`employee-commission-month-${row.yearMonth}`}
              >
                <td className="px-2 py-2">
                  {formatYearMonthLabel(row.yearMonth)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {row.salesCount}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoneyClp(row.salesGrossTotal)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoneyClp(row.commissionTotal)}
                </td>
                <td className="px-2 py-2 text-right">
                  <IconButton
                    icon="MoreHorizontal"
                    variant="action"
                    size="sm"
                    ariaLabel={`Ver ventas de ${formatYearMonthLabel(row.yearMonth)}`}
                    onClick={() => openMonthDialog(row.yearMonth)}
                    data-test-id={`employee-commission-month-more-${row.yearMonth}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={dialogMonth != null}
        onClose={() => setDialogMonth(null)}
        title={
          dialogMonth
            ? `Ventas — ${formatYearMonthLabel(dialogMonth)}`
            : "Ventas"
        }
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        data-test-id="employee-commission-sales-dialog"
      >
        {salesError ? (
          <p className="mb-2 text-sm text-error" role="alert">
            {salesError}
          </p>
        ) : null}
        <div className="h-[min(55vh,480px)] min-h-70">
          <DataGrid
            columns={saleColumns}
            rows={salesRows}
            totalRows={salesTotal}
            totalGeneral={salesTotal}
            loading={salesLoading}
            fillViewport
            showSearch
            showFooter
            showExportButton={false}
            showFilterButton={false}
            showSortButton={false}
            paginationMode="controlled"
            page={salesPage}
            limit={salesLimit}
            onPaginationChange={({ page: nextPage, limit: nextLimit }) => {
              if (!dialogMonth) return;
              void loadSalesPage(dialogMonth, nextPage, nextLimit);
            }}
            data-test-id="employee-commission-sales-grid"
          />
        </div>
      </Dialog>
    </div>
  );
}
