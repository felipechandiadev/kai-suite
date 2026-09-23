import { IconButton } from "@kai/ui";

export type LiteStockStorageBreakdown = {
  storageId: string;
  storageName: string;
  physicalStock: number;
};

export type LiteStockStorageCardActions = {
  busy: boolean;
  canTransfer: boolean;
  onAdjust: (p: {
    variantId: string;
    storageId: string;
    storageName: string;
    currentQty: number;
  }) => void;
  onDelta: (p: {
    variantId: string;
    storageId: string;
    storageName: string;
    currentQty: number;
    direction: 1 | -1;
  }) => void;
  onTransfer: (p: {
    variantId: string;
    sourceStorageId: string;
    sourceLabel: string;
    currentQty: number;
  }) => void;
};

type LiteStockStorageCardProps = {
  variantId: string;
  productLabel: string;
  breakdown: LiteStockStorageBreakdown;
  actions: LiteStockStorageCardActions;
};

export function LiteStockStorageCard({
  variantId,
  productLabel,
  breakdown: b,
  actions,
}: LiteStockStorageCardProps) {
  const title = `${productLabel} · ${b.storageName}`;
  return (
    <article
      className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-sm"
      data-test-id={`lite-stock-storage-card-${b.storageId}`}
    >
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-foreground" title={b.storageName}>
          {b.storageName}
        </h4>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Físico</dt>
        <dd className="text-right font-mono tabular-nums text-foreground">
          {b.physicalStock}
        </dd>
      </dl>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-0.5 border-t border-border pt-2">
        <IconButton
          icon="RefreshCcw"
          variant="action"
          size="sm"
          ariaLabel="Ajustar stock"
          title="Ajustar"
          disabled={actions.busy}
          onClick={() =>
            actions.onAdjust({
              variantId,
              storageId: b.storageId,
              storageName: b.storageName,
              currentQty: b.physicalStock,
            })
          }
          data-test-id={`lite-stock-adjust-${b.storageId}`}
        />
        <IconButton
          icon="Minus"
          variant="action"
          size="sm"
          ariaLabel="Reducir stock"
          title="Reducir"
          disabled={actions.busy || b.physicalStock <= 0}
          onClick={() =>
            actions.onDelta({
              variantId,
              storageId: b.storageId,
              storageName: b.storageName,
              currentQty: b.physicalStock,
              direction: -1,
            })
          }
          data-test-id={`lite-stock-decrease-${b.storageId}`}
        />
        <IconButton
          icon="Plus"
          variant="action"
          size="sm"
          ariaLabel="Aumentar stock"
          title="Aumentar"
          disabled={actions.busy}
          onClick={() =>
            actions.onDelta({
              variantId,
              storageId: b.storageId,
              storageName: b.storageName,
              currentQty: b.physicalStock,
              direction: 1,
            })
          }
          data-test-id={`lite-stock-increase-${b.storageId}`}
        />
        {actions.canTransfer ? (
          <IconButton
            icon="ArrowLeftRight"
            variant="action"
            size="sm"
            ariaLabel="Trasladar stock"
            title="Trasladar"
            disabled={actions.busy || b.physicalStock <= 0}
            onClick={() =>
              actions.onTransfer({
                variantId,
                sourceStorageId: b.storageId,
                sourceLabel: title,
                currentQty: b.physicalStock,
              })
            }
            data-test-id={`lite-stock-transfer-open-${b.storageId}`}
          />
        ) : null}
      </div>
    </article>
  );
}
