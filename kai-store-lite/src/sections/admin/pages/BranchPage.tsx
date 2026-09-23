import { useLiteCompany } from "@/shared/hooks/useLiteCompany";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { LitePage } from "@/shared/components/LitePage";

export function BranchPage() {
  const { data, loading, error } = useLiteCompany();
  const b = data?.branch;

  return (
    <LitePage title="Sucursal" subtitle="Sucursal única Lite.">
      <LoadingLine loading={loading} />
      <CoreError message={error} />
      {!loading && !error && b ? (
        <dl className="mt-4 space-y-3 text-sm leading-relaxed">
          <div>
            <dt className="text-muted-foreground">Nombre</dt>
            <dd className="text-foreground">{b.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Código</dt>
            <dd className="text-foreground">{b.code ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-mono text-xs text-foreground">{b.id ?? "—"}</dd>
          </div>
        </dl>
      ) : null}
      {!loading && !error && !b ? (
        <p className="mt-4 text-sm text-muted-foreground">Sin sucursal en respuesta Core.</p>
      ) : null}
    </LitePage>
  );
}
