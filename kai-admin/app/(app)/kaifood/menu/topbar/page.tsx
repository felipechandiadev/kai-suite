import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { getMenuTopBarAction } from "@/features/kai-menu/actions/kai-menu.action";

export const dynamic = "force-dynamic";

export default async function KaiMenuTopbarPage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return <p className="text-sm text-muted-foreground">Empresa no disponible.</p>;
  }
  const topBar = await getMenuTopBarAction(company.id);
  return (
    <div className="space-y-3">
      <pre className="overflow-auto rounded-md bg-muted/30 p-4 text-xs">
        {JSON.stringify(topBar, null, 2)}
      </pre>
      <p className="text-sm text-muted-foreground">
        Editor visual de enlaces: reutilizar patrón eShop en PR siguiente.
      </p>
    </div>
  );
}
