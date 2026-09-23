import { LitePage } from "@/shared/components/LitePage";

export function PromosPage() {
  return (
    <LitePage title="Promociones" subtitle="Promos Lite.">
      <p className="mt-2 text-sm text-muted-foreground">
        Sin promociones configuradas en v1. El cobro POS aplica precio de catálogo sin descuentos.
      </p>
    </LitePage>
  );
}
