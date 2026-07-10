"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataGridTable as DataGrid, IconButton, Select, Switch, Badge, type Option } from "@kai/ui";

type StockDataGridProps = {
  rows: StockGridRow[];
  total: number;
  storages: StorageListItem[];
  /** When set, expand cards only list storages belonging to this branch. */
  branchId?: string;
  /** Almacén del filtro de la página; preselección en el diálogo de movimientos. */
  filterStorageId?: string;
};

function formatMoney(n: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(n),
    );
  } catch {
    return String(Math.round(n));
  }
}

function formatAttrs(av: Record<string, string>): string {
  const v = Object.values(av).filter((x) => x.trim());
  return v.length > 0 ? v.join(" · ") : "—";
}

function parseStockAlertsParam(value: string | null): boolean {
  const s = (value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function StockAlertsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseStockAlertsParam(searchParams.get("stock-alerts"));

  const setActive = (on: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (on) {
      next.set("stock-alerts", "true");
    } else {
      next.delete("stock-alerts");
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div
      className="flex shrink-0 items-center"
      data-test-id="stock-grid-stock-alerts-filter"
    >
      <Switch
        checked={active}
        onChange={setActive}
        label="Alertas de stock"
        labelPosition="left"
        density="compact"
        data-test-id="stock-alerts-filter-switch"
      />
    </div>
  );
}

function StockStorageFilter({ storages }: { storages: StorageListItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("storageId") || "";
  const options: Option[] = useMemo(
    () => storages.filter((s) => s.isActive !== false).map((s) => ({ id: s.id, label: s.name })),
    [storages],
  );

  const apply = (storageId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (storageId) {
      next.set("storageId", storageId);
    } else {
      next.delete("storageId");
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div className="min-w-[12rem] max-w-xs" data-test-id="stock-grid-storage-filter">
      <Select
        label="Almacén"
        name="stock-storage-filter"
        placeholder="Todos"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
        data-test-id="stock-storage-filter-select"
      />
    </div>
  );
}


export default function StockDataGrid({
  rows,
  total,
  storages,
  branchId,
  filterStorageId,
}: StockDataGridProps) {
  const router = useRouter();
  const { stockRefreshToken } = useNotificationsRealtime();
  const lastRealtimeRefreshAt = useRef(0);

  useEffect(() => {
    if (!stockRefreshToken || stockRefreshToken === lastRealtimeRefreshAt.current) {
      return;
    }
    lastRealtimeRefreshAt.current = stockRefreshToken;
    const t = window.setTimeout(() => {
      router.refresh();
    }, 400);
    return () => window.clearTimeout(t);
  }, [stockRefreshToken, router]);

  const stockOps = useStockStorageOperations({ rows, storages });

  const [configRow, setConfigRow] = useState<StockGridRow | null>(null);
  const [movementsRow, setMovementsRow] = useState<StockGridRow | null>(null);
  const [reservationsRow, setReservationsRow] = useState<StockGridRow | null>(null);
  const [reservationsStorage, setReservationsStorage] = useState<StockStorageBreakdownRow | null>(null);

  const columns: DataGridColumn[] = useMemo(
    () => {
      function StockRowActionsCell({ row: gridRow }: { row: Record<string, unknown> }) {
        const r = gridRow as StockGridRow;
        return (
          <div
            className="flex items-center justify-center gap-0.5"
            data-test-id={`stock-row-actions-${r.variantId}`}
          >
            <IconButton
              icon="MoreHorizontal"
              variant="action"
              size="sm"
              ariaLabel="Ver movimientos de stock"
              onClick={() => setMovementsRow(r)}
              data-test-id={`stock-row-movements-${r.variantId}`}
            />
            <IconButton
              icon="Pencil"
              variant="action"
              size="sm"
              ariaLabel="Editar configuración de stock"
              onClick={() => setConfigRow(r)}
              data-test-id={`stock-row-config-${r.variantId}`}
            />
          </div>
        );
      }

      return [
      {
        field: "productName",
        headerName: "Producto",
        sortable: true,
        minWidth: 140,
        flex: 1.5,
        cellOverflow: "wrap",
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const attrs = formatAttrs(r.attributeValues);
          return (
            <div className="min-w-0 w-full space-y-0.5">
              <p className="font-medium text-foreground">{r.productName}</p>
              {attrs ? <p className="text-xs text-muted-foreground">{attrs}</p> : null}
            </div>
          );
        },
      },
      { field: "sku", headerName: "SKU", sortable: true, width: 160 },
      {
        field: "barcode",
        headerName: "Cód. barras",
        sortable: true,
        width: 150,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const code = r.barcode?.trim();
          return code ? (
            <span className="font-mono text-sm text-foreground" title={code}>
              {code}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "unitOfMeasure",
        headerName: "Unidad stock",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const t = r.unitOfMeasure?.trim();
          return t ? (
            <span className="text-foreground" title={t}>
              {t}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "saleUnitOfMeasure",
        headerName: "Unidad venta",
        sortable: true,
        width: 120,
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          const t = r.saleUnitOfMeasure?.trim();
          return t ? (
            <span className="text-foreground" title={t}>
              {t}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        field: "totalStock",
        headerName: "Stock total",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row, value }) => (
          <span className="font-mono tabular-nums" title={(row as StockGridRow).unitOfMeasure || undefined}>
            {formatStockSlashPair(Number(value) || 0, row as StockGridRow)}
          </span>
        ),
      },
      {
        field: "availableStock",
        headerName: "Disponible",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row, value }) => (
          <span className="font-mono tabular-nums" title={(row as StockGridRow).unitOfMeasure || undefined}>
            {formatStockSlashPair(Number(value) || 0, row as StockGridRow)}
          </span>
        ),
      },
      {
        field: "pmpValue",
        headerName: "Valor stock (PMP)",
        sortable: true,
        width: 130,
        align: "right",
        renderCell: ({ row }) => {
          const r = row as StockGridRow;
          if (r.pmpValue == null || !Number.isFinite(r.pmpValue)) {
            return <span className="text-muted-foreground">Sin PMP</span>;
          }
          return <span className="tabular-nums text-foreground">{formatMoney(r.pmpValue)}</span>;
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 88,
        minWidth: 88,
        maxWidth: 88,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: StockRowActionsCell,
      },
    ];
    },
    [],
  );

  const expandableRowContent = useCallback(
    (row: StockGridRow) => (
      <div className="w-full min-w-0 max-w-none py-1" data-test-id={`stock-expand-${row.variantId}`}>
        <StockStorageCardsGrid
          row={row}
          storages={storages}
          branchId={branchId}
          filterStorageId={filterStorageId}
          interactive
          actions={stockOps.bindCardActions((r, b) => {
            setReservationsRow(r);
            setReservationsStorage(b);
          })}
          data-test-id={`stock-expand-${row.variantId}`}
        />
      </div>
    ),
    [storages, branchId, filterStorageId, stockOps],
  );

  return (
    <>
      {stockOps.inlineError}
      <DataGrid
        title="Existencias (stock)"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        fillViewport
        showExportButton={false}
        expandable
        expandableRowContent={(row) => expandableRowContent(row as StockGridRow)}
        headerActions={
          <div className="flex flex-wrap items-center justify-center gap-4">
            <StockStorageFilter storages={storages} />
            <StockAlertsFilter />
          </div>
        }
        pinActionsColumn
        actionsColumnField="actions"
        getRowAppearance={({ row }) => {
          const r = row as StockGridRow;
          if (!stockRowHasThresholdAlert(r)) {
            return null;
          }
          return {
            className: STOCK_THRESHOLD_ALERT_ROW_CLASS,
            variant: "stock-alert",
          };
        }}
        data-test-id="stock-data-grid"
      />

      <EditVariantStockConfigDialog
        open={configRow != null}
        row={configRow}
        storages={storages}
        branchId={branchId}
        onClose={() => setConfigRow(null)}
        onSaved={() => router.refresh()}
      />

      <StockMovementsDialog
        open={movementsRow != null}
        row={movementsRow}
        storages={storages}
        branchId={branchId}
        filterStorageId={filterStorageId}
        onClose={() => setMovementsRow(null)}
      />

      <StockReservationsDialog
        open={reservationsRow != null && reservationsStorage != null}
        row={reservationsRow}
        storage={reservationsStorage}
        onClose={() => {
          setReservationsRow(null);
          setReservationsStorage(null);
        }}
      />

      {stockOps.operationDialogs}
    </>
  );
}
