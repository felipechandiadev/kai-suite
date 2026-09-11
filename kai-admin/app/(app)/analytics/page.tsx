import Link from "next/link";
import { BasicPageLayout } from "@kai/ui";
import { getSignalsBoardAction } from "@/features/business-signals/actions/signals.action";

const destinations = [
  {
    title: "Reportes",
    description: "Ventas, compras e inventario: totales, rankings, caja y comparativos.",
    href: "/analytics/reports",
    action: "Abrir reportes",
  },
  {
    title: "Señales",
    description: "Excepciones y acciones prioritarias detectadas por Kai.",
    href: "/analytics/signals",
    action: "Abrir señales",
  },
  {
    title: "Precios",
    description: "Análisis de costo, punto de equilibrio y precio sugerido.",
    href: "/analytics/pricing",
    action: "Abrir precios",
  },
];

export default async function AnalyticsPage() {
  let criticalCount = 0;
  let watchCount = 0;
  try {
    const board = await getSignalsBoardAction();
    criticalCount = board.signals.filter((s) => s.severity === "CRITICAL").length;
    watchCount = board.signals.filter((s) => s.severity === "WATCH").length;
  } catch {
    // Resumen no debe fallar si señales no están disponibles
  }

  const hasAlerts = criticalCount + watchCount > 0;

  return (
    <BasicPageLayout
      title="Analítica del negocio"
      subtitle="Centro de decisión: reportes, señales y precios sin reemplazar los módulos operativos."
      data-test-id="analytics-page"
    >
      <section className="space-y-6">
        {hasAlerts ? (
          <Link
            href="/analytics/signals"
            className="block rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10"
          >
            <p className="text-sm font-medium text-foreground">
              {criticalCount > 0
                ? `${criticalCount} señal${criticalCount === 1 ? "" : "es"} crítica${criticalCount === 1 ? "" : "s"}`
                : null}
              {criticalCount > 0 && watchCount > 0 ? " · " : null}
              {watchCount > 0
                ? `${watchCount} en observación`
                : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Revisar señales →</p>
          </Link>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{destination.title}</h2>
                <span
                  className="text-sm text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  →
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{destination.description}</p>
              <span className="mt-4 inline-block text-xs font-medium text-primary">
                {destination.action}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </BasicPageLayout>
  );
}
