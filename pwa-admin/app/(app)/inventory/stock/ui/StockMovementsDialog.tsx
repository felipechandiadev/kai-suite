"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import type { StockGridRow } from "@/features/inventory-stock/types/stock-grid.types";
import type { StockMovementRow } from "@/features/inventory-stock/types/stock-grid.types";
import { listStockMovementsAction } from "@/features/inventory-stock/actions/stock.action";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { StockMovementsDataGrid } from "./StockMovementsDataGrid";

const ALL_STORAGES = "__all__";

function buildDialogTitle(row: StockGridRow | null): string {
  const parts: string[] = ["Movimientos de stock"];
  if (!row) {
    return parts[0]!;
  }
  const productName = row.productName?.trim();
  if (productName) {
    parts.push(productName);
  }
  const attrs = Object.values(row.attributeValues ?? {})
    .map((v) => v.trim())
    .filter(Boolean);
  if (attrs.length > 0) {
    parts.push(attrs.join(" · "));
  }
  const sku = row.sku?.trim();
  if (sku) {
    parts.push(`SKU ${sku}`);
  }
  return parts.join(" · ");
}

function resolveDefaultStorageId(
  row: StockGridRow,
  storages: StorageListItem[],
  filterStorageId?: string,
): string | null {
  const breakdownIds = new Set((row.storageBreakdown ?? []).map((b) => b.storageId));
  if (filterStorageId && breakdownIds.has(filterStorageId)) {
    return filterStorageId;
  }
  const primaryName = row.primaryStorageName?.trim();
  if (primaryName) {
    const match = (row.storageBreakdown ?? []).find(
      (b) => b.storageName.trim() === primaryName,
    );
    if (match?.storageId) {
      return match.storageId;
    }
  }
  const firstBreakdown = row.storageBreakdown?.[0]?.storageId;
  if (firstBreakdown) {
    return firstBreakdown;
  }
  const active = storages.filter((s) => s.isActive !== false);
  return active[0]?.id ?? null;
}

function storageOptionsForRow(
  row: StockGridRow,
  storages: StorageListItem[],
  branchId?: string,
): Option[] {
  const breakdownIds = new Set((row.storageBreakdown ?? []).map((b) => b.storageId));
  const fromCatalog = storages
    .filter((s) => s.isActive !== false)
    .filter((s) => !branchId || (s.branchId ?? s.branch?.id ?? "") === branchId)
    .filter((s) => breakdownIds.has(s.id) || breakdownIds.size === 0)
    .map((s) => ({ id: s.id, label: s.name }));
  if (fromCatalog.length > 0) {
    return fromCatalog;
  }
  return (row.storageBreakdown ?? []).map((b) => ({
    id: b.storageId,
    label: b.branchName ? `${b.storageName} (${b.branchName})` : b.storageName,
  }));
}

export type StockMovementsDialogProps = {
  open: boolean;
  row: StockGridRow | null;
  storages: StorageListItem[];
  branchId?: string;
  filterStorageId?: string;
  onClose: () => void;
};

export function StockMovementsDialog({
  open,
  row,
  storages,
  branchId,
  filterStorageId,
  onClose,
}: StockMovementsDialogProps) {
  const [storageSelection, setStorageSelection] = useState<string>(ALL_STORAGES);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState<StockMovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultStorageSelection = useMemo(() => {
    if (!row) {
      return ALL_STORAGES;
    }
    return resolveDefaultStorageId(row, storages, filterStorageId) ?? ALL_STORAGES;
  }, [row, storages, filterStorageId]);

  const storageOptions = useMemo(() => {
    if (!row) {
      return [];
    }
    const perRow = storageOptionsForRow(row, storages, branchId);
    return [{ id: ALL_STORAGES, label: "Todos los almacenes" }, ...perRow];
  }, [row, storages, branchId]);

  const apiStorageId =
    storageSelection === ALL_STORAGES ? undefined : storageSelection;

  useEffect(() => {
    if (!open || !row) {
      return;
    }
    setPage(1);
    setError(null);
    setRows([]);
    setTotal(0);
    setStorageSelection(defaultStorageSelection);
  }, [open, row?.variantId, defaultStorageSelection]);

  useEffect(() => {
    if (!open || !row?.variantId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listStockMovementsAction({
      variantId: row.variantId,
      storageId: apiStorageId,
      page,
      limit,
    }).then((r) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if ("error" in r) {
        setError(r.error);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(r.rows);
      setTotal(r.total);
      if (r.page >= 1) {
        setPage(r.page);
      }
      if (r.limit >= 1) {
        setLimit(r.limit);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, row?.variantId, apiStorageId, page, limit]);

  const handlePaginationChange = useCallback((next: { page: number; limit: number }) => {
    setPage(next.page);
    setLimit(next.limit);
  }, []);

  const dialogTitle = useMemo(() => buildDialogTitle(row), [row]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      size="custom"
      fullWidth
      maxWidth="min(1680px, calc(100vw - 1.5rem))"
      scroll="paper"
      maxHeight="min(94vh, 960px)"
      minHeight="min(70vh, 720px)"
      showCloseButton
      hideActions
      data-test-id="stock-movements-dialog"
      contentStyle={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 0 }}
      className="!w-full"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="shrink-0 max-w-sm">
          <Select
            label="Almacén"
            options={storageOptions}
            value={storageSelection}
            onChange={(v) => {
              setStorageSelection(v != null ? String(v) : ALL_STORAGES);
              setPage(1);
            }}
            data-test-id="stock-movements-storage"
          />
        </div>

        {error ? (
          <Alert variant="error" className="shrink-0">
            {error}
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1">
          <StockMovementsDataGrid
            rows={rows}
            total={total}
            loading={loading}
            page={page}
            limit={limit}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </div>
    </Dialog>
  );
}
