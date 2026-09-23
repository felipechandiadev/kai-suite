import type { LitePointOfSale } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function PosTerminalsPage() {
  const { items, loading, error } = useLiteList<LitePointOfSale>("/lite/points-of-sale");

  return (
    <LitePage title="POS" subtitle="Terminales de punto de venta.">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["Nombre", "Código", "Activo"]}
          rows={items.map((r) => [
            r.name,
            r.code ?? "—",
            r.active === false || r.isActive === false ? "no" : "sí",
          ])}
          empty="Sin puntos de venta. Ejecuta seed."
        />
      ) : null}
    </LitePage>
  );
}
