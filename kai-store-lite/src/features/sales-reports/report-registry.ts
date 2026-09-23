import type { ReportRegistryEntry } from "./types/sales-report.types";

/** Registry Lite: sin filtros de sucursal ni multi-POS (una sucursal / un POS). */
export const SALES_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "sales-by-period",
    title: "Resumen de ventas",
    description: "Totales, ticket promedio y evolución diaria.",
    wave: "mvp",
    category: "resumen",
    params: [
      { kind: "dateRange", required: true },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "sales-detail",
    title: "Detalle de ventas",
    description: "Listado de ventas con gráfico diario.",
    wave: "mvp",
    category: "resumen",
    params: [
      { kind: "dateRange", required: true },
      { kind: "customer" },
      { kind: "paymentMethod" },
      { kind: "granularity" },
    ],
  },
  {
    id: "sales-period-compare",
    title: "Comparativo de período",
    description: "Ventas del período vs período anterior o mismo lapso del año pasado.",
    wave: "p1",
    category: "comparativos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "sales-by-product",
    title: "Ventas de un producto",
    description: "Unidades y monto de un producto.",
    wave: "mvp",
    category: "productos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "product", required: true },
    ],
  },
  {
    id: "top-products",
    title: "Productos más vendidos",
    description: "Ranking por monto.",
    wave: "p1",
    category: "productos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "topN", default: 20 },
      { kind: "compareWith" },
    ],
  },
  {
    id: "sales-by-category",
    title: "Ventas por categoría",
    description: "Agregado por categoría de producto.",
    wave: "p1",
    category: "productos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "compareWith" },
    ],
  },
  {
    id: "cash-session-close",
    title: "Cierre de sesión de caja",
    description: "Mix de pagos de una sesión o rango de fechas.",
    wave: "mvp",
    category: "caja_pagos",
    params: [
      { kind: "cashSession" },
      { kind: "dateRange", required: false },
    ],
  },
  {
    id: "sales-by-payment-method",
    title: "Mix de medios de pago",
    description: "Distribución de ventas por medio de pago.",
    wave: "p1",
    category: "caja_pagos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "compareWith" },
    ],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return SALES_REPORT_REGISTRY.find((r) => r.id === id);
}
