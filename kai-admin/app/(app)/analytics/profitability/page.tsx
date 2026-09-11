import { BasicPageLayout } from "@kai/ui";
import Link from "next/link";

export default function AnalyticsProfitabilityPage() {
  return (
    <BasicPageLayout
      title="Rentabilidad"
      subtitle="Contribución ex post vs estructura asignada — fase posterior al módulo de precios."
      data-test-id="analytics-profitability-page"
    >
      <div className="max-w-xl space-y-4 text-sm text-muted-foreground">
        <p>
          Esta vista consolidará margen de contribución, prorrateo de gastos fijos y comparación con
          el punto de equilibrio usando ventas reales del periodo.
        </p>
        <p>
          Mientras tanto, usa{" "}
          <Link href="/analytics/reports/sales" className="text-primary underline-offset-2 hover:underline">
            Reportes de ventas
          </Link>{" "}
          (margen por producto) y{" "}
          <Link href="/analytics/pricing" className="text-primary underline-offset-2 hover:underline">
            Precios
          </Link>{" "}
          para decisiones forward-looking.
        </p>
      </div>
    </BasicPageLayout>
  );
}
