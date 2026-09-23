import type { LiteCustomer } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { AdminTable, CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function ClientsPage() {
  const { items, loading, error } = useLiteList<LiteCustomer>("/lite/customers");

  return (
    <LitePage title="Clientes" subtitle="Maestro clientes Lite (crédito interno / CxC).">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error ? (
        <AdminTable
          columns={["Nombre", "Documento", "Email"]}
          rows={items.map((r) => [r.name, r.documentNumber ?? "—", r.email ?? "—"])}
          empty="Sin clientes."
        />
      ) : null}
    </LitePage>
  );
}
