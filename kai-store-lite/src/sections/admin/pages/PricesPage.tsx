import { LitePage } from "@/shared/components/LitePage";

export function PricesPage() {
  return (
    <LitePage title="Precios" subtitle="Listas de precio.">
      <p className="mt-2 text-sm text-muted-foreground">
        Vacío en v1: el POS usa el precio base de cada variante (
        <code className="text-primary">unitPrice</code> de{" "}
        <code className="text-primary">/lite/pos/catalog</code>).
      </p>
    </LitePage>
  );
}
