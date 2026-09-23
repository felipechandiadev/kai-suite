import { useLiteCompany } from "@/shared/hooks/useLiteCompany";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function WarehousesPage() {
  const { data, loading, error } = useLiteCompany();
  const wh =
    data?.warehouses?.length
      ? data.warehouses
      : data?.storage
        ? [{ id: data.storage.id, name: data.storage.name }]
        : [];

  return (
    <LitePage title="Almacenes" subtitle="Bodegas de la empresa Lite.">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["Nombre", "Código", "ID"]}
          rows={wh.map((w) => [
            w.name,
            ("code" in w && w.code) || "—",
            w.id,
          ])}
          empty="Sin almacenes."
        />
      ) : null}
    </LitePage>
  );
}
