import { LitePage } from "@/shared/components/LitePage";

export function ArPage() {
  return (
    <LitePage title="Cuentas por cobrar" subtitle="Crédito interno clientes.">
      <p className="mt-2 text-sm text-muted-foreground">
        Vacío en v1 UI: las ventas a crédito se registran en POS con método CREDIT + cliente. El
        detalle de saldos llegará cuando Core exponga agregados AR en{" "}
        <code className="text-primary">/lite/*</code>.
      </p>
    </LitePage>
  );
}
