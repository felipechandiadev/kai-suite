import type { LiteStockItem } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function StockPage() {
  const { items, loading, error } = useLiteList<LiteStockItem>("/lite/stock");

  return (
    <LitePage title="Stock" subtitle="Niveles físicos por almacén.">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["SKU", "Nombre", "Stock", "Almacén"]}
          rows={items.map((r) => [
            r.sku ?? "—",
            r.name,
            String(r.physicalStock),
            r.storageName ?? "—",
          ])}
          empty="Sin niveles de stock."
        />
      ) : null}
    </LitePage>
  );
}
