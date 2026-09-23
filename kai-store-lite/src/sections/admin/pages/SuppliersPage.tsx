import type { LiteSupplier } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function SuppliersPage() {
  const { items, loading, error } = useLiteList<LiteSupplier>("/lite/suppliers");

  return (
    <LitePage title="Proveedores" subtitle="Maestro proveedores.">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["Nombre", "Documento"]}
          rows={items.map((r) => [r.name, r.documentNumber ?? "—"])}
          empty="Sin proveedores."
        />
      ) : null}
    </LitePage>
  );
}
