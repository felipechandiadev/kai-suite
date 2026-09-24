import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CollectionPageLayout,
  Dialog,
  Select,
  TextField,
} from "@kai/ui";
import { CoreError } from "@/shared/components/AdminTable";
import { LiteDataGrid, slicePage, type DataGridColumn } from "@/shared/components/LiteDataGrid";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import {
  liteAdminApi,
  type LiteStockRow,
  type LiteStockVariantRow,
  type LiteStorageRow,
} from "../api/lite-admin.api";
import { LiteStockStorageCardsGrid } from "../components/LiteStockStorageCardsGrid";
import type {
  LiteStockStorageBreakdown,
  LiteStockStorageCardActions,
} from "../components/LiteStockStorageCard";

type AdjustState = {
  variantId: string;
  storageId: string;
  storageName: string;
  productLabel: string;
  currentQty: number;
  targetQty: string;
  note: string;
};

type DeltaState = {
  variantId: string;
  storageId: string;
  storageName: string;
  productLabel: string;
  currentQty: number;
  direction: 1 | -1;
  quantity: string;
  note: string;
};

type TransferState = {
  variantId: string;
  sourceStorageId: string;
  sourceLabel: string;
  productLabel: string;
  currentQty: number;
  targetStorageId: string | null;
  quantity: string;
  note: string;
};

function groupStockByVariant(
  items: LiteStockRow[],
  storages: LiteStorageRow[],
): LiteStockVariantRow[] {
  const activeStorages = storages.filter((s) => s.isActive !== false);
  const byVariant = new Map<
    string,
    { sku: string; name: string; levels: Map<string, { storageName: string; qty: number }> }
  >();

  for (const item of items) {
    let entry = byVariant.get(item.variantId);
    if (!entry) {
      entry = {
        sku: item.sku,
        name: item.name,
        levels: new Map(),
      };
      byVariant.set(item.variantId, entry);
    }
    entry.levels.set(item.storageId, {
      storageName: item.storageName,
      qty: Number(item.physicalStock) || 0,
    });
  }

  const rows: LiteStockVariantRow[] = [];
  for (const [variantId, entry] of byVariant) {
    const byStorage: LiteStockStorageBreakdown[] =
      activeStorages.length > 0
        ? activeStorages.map((s) => {
            const level = entry.levels.get(s.id);
            return {
              storageId: s.id,
              storageName: s.name,
              physicalStock: level?.qty ?? 0,
            };
          })
        : Array.from(entry.levels.entries()).map(([storageId, level]) => ({
            storageId,
            storageName: level.storageName,
            physicalStock: level.qty,
          }));

    const totalPhysical = byStorage.reduce((sum, b) => sum + b.physicalStock, 0);
    rows.push({
      id: variantId,
      variantId,
      sku: entry.sku,
      name: entry.name,
      totalPhysical,
      byStorage,
    });
  }

  rows.sort((a, b) => a.sku.localeCompare(b.sku, "es"));
  return rows;
}

export function InventoryStockPage() {
  const q = useCollectionSearchQuery();
  const [rows, setRows] = useState<LiteStockVariantRow[]>([]);
  const [storages, setStorages] = useState<LiteStorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [delta, setDelta] = useState<DeltaState | null>(null);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void Promise.all([liteAdminApi.stock(), liteAdminApi.storages()])
      .then(([stockRes, storagesRes]) => {
        const storageItems = storagesRes.items ?? [];
        setStorages(storageItems);
        setRows(groupStockByVariant(stockRes.items ?? [], storageItems));
      })
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const canTransfer = useMemo(
    () => storages.filter((s) => s.isActive !== false).length > 1,
    [storages],
  );

  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.sku} ${r.name}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, q]);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        width: 140,
        minWidth: 120,
        sortable: false,
      },
      {
        field: "name",
        headerName: "Producto",
        flex: 1.2,
        minWidth: 180,
        sortable: false,
      },
      {
        field: "totalPhysical",
        headerName: "Total físico",
        width: 130,
        minWidth: 110,
        align: "right",
        sortable: false,
      },
    ],
    [],
  );

  const findProductLabel = useCallback(
    (variantId: string) => {
      const row = rows.find((r) => r.variantId === variantId);
      return row ? `${row.name} · ${row.sku}` : variantId;
    },
    [rows],
  );

  const cardActions: LiteStockStorageCardActions = useMemo(
    () => ({
      busy,
      canTransfer,
      onAdjust: (p) => {
        setFormError(null);
        setAdjust({
          ...p,
          productLabel: findProductLabel(p.variantId),
          targetQty: String(p.currentQty),
          note: "",
        });
      },
      onDelta: (p) => {
        setFormError(null);
        setDelta({
          ...p,
          productLabel: findProductLabel(p.variantId),
          quantity: "1",
          note: "",
        });
      },
      onTransfer: (p) => {
        setFormError(null);
        const others = storages.filter(
          (s) => s.id !== p.sourceStorageId && s.isActive !== false,
        );
        setTransfer({
          ...p,
          productLabel: findProductLabel(p.variantId),
          targetStorageId: others[0]?.id ?? null,
          quantity: "1",
          note: "",
        });
      },
    }),
    [busy, canTransfer, findProductLabel, storages],
  );

  const expandableRowContent = useCallback(
    (row: LiteStockVariantRow) => (
      <LiteStockStorageCardsGrid
        variantId={row.variantId}
        productLabel={`${row.name} · ${row.sku}`}
        cards={row.byStorage}
        actions={cardActions}
        data-test-id={`lite-stock-expand-${row.variantId}`}
      />
    ),
    [cardActions],
  );

  async function submitAdjust() {
    if (!adjust) return;
    const target = Number(String(adjust.targetQty).replace(",", "."));
    if (!Number.isFinite(target) || target < 0) {
      setFormError("Cantidad inválida");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.adjustStock({
        variantId: adjust.variantId,
        storageId: adjust.storageId,
        targetQty: target,
        note: adjust.note.trim() || undefined,
      });
      setAdjust(null);
      reload();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitDelta() {
    if (!delta) return;
    const qty = Number(String(delta.quantity).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Cantidad inválida");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.deltaStock({
        variantId: delta.variantId,
        storageId: delta.storageId,
        delta: delta.direction * qty,
        note: delta.note.trim() || undefined,
      });
      setDelta(null);
      reload();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitTransfer() {
    if (!transfer) return;
    if (!transfer.targetStorageId) {
      setFormError("Seleccioná un almacén destino");
      return;
    }
    const qty = Number(String(transfer.quantity).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Cantidad inválida");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.transferStock({
        variantId: transfer.variantId,
        sourceStorageId: transfer.sourceStorageId,
        targetStorageId: transfer.targetStorageId,
        quantity: qty,
        note: transfer.note.trim() || undefined,
      });
      setTransfer(null);
      reload();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const transferTargetOptions = useMemo(() => {
    if (!transfer) return [];
    return storages
      .filter((s) => s.id !== transfer.sourceStorageId && s.isActive !== false)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, transfer]);

  return (
    <CollectionPageLayout
      title="Existencias"
      showSearch
      data-test-id="inventory-stock-page"
    >
      <CoreError message={error} />
      <LiteDataGrid
        columns={columns}
        rows={slicePage(filtered, page, limit)}
        loading={loading}
        totalRows={filtered.length}
        totalGeneral={filtered.length}
        page={page}
        limit={limit}
        onPaginationChange={(next) => {
          setPage(next.page);
          setLimit(next.limit);
        }}
        expandable
        expandableRowContent={(row) =>
          expandableRowContent(row as LiteStockVariantRow)
        }
        data-test-id="inventory-stock-data-grid"
      />

      <Dialog
        open={!!adjust}
        onClose={() => setAdjust(null)}
        title="Ajustar stock"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setAdjust(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => void submitAdjust()}
            >
              Guardar
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        {adjust ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {adjust.productLabel} · {adjust.storageName}
            </p>
            <p className="text-sm">
              Actual: <strong>{adjust.currentQty}</strong>
            </p>
            <TextField
              label="Cantidad objetivo"
              value={adjust.targetQty}
              onChange={(e) =>
                setAdjust((prev) =>
                  prev ? { ...prev, targetQty: e.target.value } : null,
                )
              }
              type="number"
              data-test-id="lite-stock-adjust-target"
            />
            <TextField
              label="Nota"
              value={adjust.note}
              onChange={(e) =>
                setAdjust((prev) => (prev ? { ...prev, note: e.target.value } : null))
              }
            />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!delta}
        onClose={() => setDelta(null)}
        title={delta?.direction === 1 ? "Aumentar stock" : "Reducir stock"}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setDelta(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => void submitDelta()}
            >
              Confirmar
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        {delta ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {delta.productLabel} · {delta.storageName}
            </p>
            <p className="text-sm">
              Actual: <strong>{delta.currentQty}</strong>
            </p>
            <TextField
              label="Cantidad"
              value={delta.quantity}
              onChange={(e) =>
                setDelta((prev) =>
                  prev ? { ...prev, quantity: e.target.value } : null,
                )
              }
              type="number"
              data-test-id="lite-stock-delta-qty"
            />
            <TextField
              label="Nota"
              value={delta.note}
              onChange={(e) =>
                setDelta((prev) => (prev ? { ...prev, note: e.target.value } : null))
              }
            />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!transfer}
        onClose={() => setTransfer(null)}
        title="Trasladar stock"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setTransfer(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => void submitTransfer()}
            >
              Trasladar
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        {transfer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{transfer.sourceLabel}</p>
            <p className="text-sm">
              Disponible en origen: <strong>{transfer.currentQty}</strong>
            </p>
            <Select
              label="Almacén destino"
              options={transferTargetOptions}
              value={transfer.targetStorageId}
              onChange={(id) =>
                setTransfer((prev) =>
                  prev ? { ...prev, targetStorageId: id ? String(id) : null } : null,
                )
              }
              data-test-id="lite-stock-transfer-target"
            />
            <TextField
              label="Cantidad"
              value={transfer.quantity}
              onChange={(e) =>
                setTransfer((prev) =>
                  prev ? { ...prev, quantity: e.target.value } : null,
                )
              }
              type="number"
              data-test-id="lite-stock-transfer-qty"
            />
            <TextField
              label="Nota"
              value={transfer.note}
              onChange={(e) =>
                setTransfer((prev) =>
                  prev ? { ...prev, note: e.target.value } : null,
                )
              }
            />
          </div>
        ) : null}
      </Dialog>
    </CollectionPageLayout>
  );
}
