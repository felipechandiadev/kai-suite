import { LitePage } from "@/shared/components/LitePage";

export function ApPage() {
  return (
    <LitePage title="Cuentas por pagar" subtitle="Pagos proveedor solo caja.">
      <p className="mt-2 text-sm text-muted-foreground">
        Vacío en v1 UI: las recepciones suben stock; el pago a proveedor se hace desde caja POS (sin
        banco). No hay simulación offline de “pagado OK”.
      </p>
    </LitePage>
  );
}
