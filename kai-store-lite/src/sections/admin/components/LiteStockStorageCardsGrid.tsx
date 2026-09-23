import {
  LiteStockStorageCard,
  type LiteStockStorageBreakdown,
  type LiteStockStorageCardActions,
} from "./LiteStockStorageCard";

type LiteStockStorageCardsGridProps = {
  variantId: string;
  productLabel: string;
  cards: LiteStockStorageBreakdown[];
  actions: LiteStockStorageCardActions;
  emptyMessage?: string;
  "data-test-id"?: string;
};

export function LiteStockStorageCardsGrid({
  variantId,
  productLabel,
  cards,
  actions,
  emptyMessage = "No hay almacenes configurados.",
  "data-test-id": dataTestId = "lite-stock-storage-cards",
}: LiteStockStorageCardsGridProps) {
  return (
    <div className="w-full py-1" data-test-id={dataTestId}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stock por almacén
      </p>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid max-h-[min(24rem,55vh)] w-full grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((b) => (
            <LiteStockStorageCard
              key={b.storageId}
              variantId={variantId}
              productLabel={productLabel}
              breakdown={b}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
