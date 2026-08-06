import type { ReportRegistryEntry } from "./types/kaifood-report.types";

export const KAIFOOD_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "dining-salon-summary",
    title: "Resumen del salón",
    description:
      "Cuentas cerradas, ventas, ticket medio, permanencia y propina del período.",
    wave: "mvp",
    category: "resumen",
    params: [
      { kind: "dateRange", required: true },
      { kind: "branch" },
      { kind: "diningRoom" },
      { kind: "orderKind" },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "dining-by-hour",
    title: "Actividad por hora",
    description:
      "Curva de cuentas y ventas por hora de cierre (America/Santiago).",
    wave: "mvp",
    category: "operacion",
    params: [
      { kind: "dateRange", required: true },
      { kind: "branch" },
      { kind: "diningRoom" },
      { kind: "orderKind" },
    ],
  },
  {
    id: "dining-by-table",
    title: "Mesas y salones",
    description: "Turnos, ticket y permanencia media por mesa / salón.",
    wave: "mvp",
    category: "operacion",
    params: [
      { kind: "dateRange", required: true },
      { kind: "branch" },
      { kind: "diningRoom" },
      { kind: "orderKind" },
    ],
  },
  {
    id: "dining-period-compare",
    title: "Comparativo de período",
    description:
      "Salón del período vs período anterior o mismo lapso del año pasado.",
    wave: "mvp",
    category: "comparativos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "branch" },
      { kind: "diningRoom" },
      { kind: "orderKind" },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return KAIFOOD_REPORT_REGISTRY.find((r) => r.id === id);
}
