import { LitePage } from "@/shared/components/LitePage";

export function TaxPage() {
  return (
    <LitePage title="IVA" subtitle="Configuración tributaria Lite (sin SII).">
      <p className="mt-2 text-sm text-foreground">
        Tasa por defecto del seed: <strong>IVA 19%</strong> (Chile). No hay emisión ni boleta
        electrónica en esta edición.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        La edición de tasas requiere Core conectado; no hay simulación offline.
      </p>
    </LitePage>
  );
}
