import type { LiteCatalogItem } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function CatalogPage() {
  const { items, loading, error } = useLiteList<LiteCatalogItem>("/lite/catalog");

  return (
    <LitePage title="Catálogo" subtitle="PHYSICAL / SERVICE / PACK (sin Food / eShop).">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["Nombre", "Tipo", "SKU"]}
          rows={items.map((r) => [r.name, r.type, r.sku ?? "—"])}
          empty="Sin productos. Ejecuta seed desde Acerca de / Usuarios."
        />
      ) : null}
    </LitePage>
  );
}
