import type { ReportRegistryEntry } from "./types/sales-report.types";

export const SALES_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "sales-by-period",
    title: "Resumen de ventas",
    description: "Totales, ticket promedio y evolución diaria.",
    wave: "mvp",
    params: [{ kind: "dateRange", required: true }, { kind: "posMulti" }],
  },
  {
    id: "sales-detail",
    title: "Detalle de ventas",
    description: "Listado de ventas con gráfico diario.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "posMulti" },
      { kind: "customer" },
      { kind: "paymentMethod" },
    ],
  },
  {
    id: "sales-by-product",
    title: "Ventas de un producto",
    description: "Unidades, monto y margen de un producto.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "product", required: true },
      { kind: "posMulti" },
    ],
  },
  {
    id: "customer-returns",
    title: "Devoluciones de cliente",
    description: "Devoluciones del período y ratio vs ventas.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "customer" },
      { kind: "product" },
      { kind: "posMulti" },
    ],
  },
  {
    id: "customer-purchases",
    title: "Compras de un cliente",
    description: "Historial y margen de un cliente.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "customer", required: true },
    ],
  },
  {
    id: "cash-session-close",
    title: "Cierre de sesión de caja",
    description: "Mix de pagos de una sesión o rango/POS.",
    wave: "mvp",
    params: [{ kind: "cashSession" }, { kind: "dateRange", required: false }, { kind: "posMulti" }],
  },
  {
    id: "top-products",
    title: "Productos más vendidos",
    description: "Ranking por monto y margen.",
    wave: "p1",
    params: [
      { kind: "dateRange", required: true },
      { kind: "topN", default: 20 },
      { kind: "posMulti" },
    ],
  },
  {
    id: "sales-by-payment-method",
    title: "Mix de medios de pago",
    description: "Distribución de ventas por medio de pago.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }, { kind: "posMulti" }],
  },
  {
    id: "sales-by-pos",
    title: "Comparativo por punto de venta",
    description: "Ventas agregadas por POS.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }],
  },
  {
    id: "credit-notes",
    title: "Notas de crédito",
    description: "NC emitidas a clientes.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }, { kind: "customer" }],
  },
  {
    id: "promotion-redemptions",
    title: "Uso de promociones",
    description: "Redenciones de promociones.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }],
  },
  {
    id: "quotations-funnel",
    title: "Embudo de cotizaciones",
    description: "Cotizaciones por estado.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }],
  },
  {
    id: "backorders-status",
    title: "Encargos por estado",
    description: "Backorders en el período.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }],
  },
  {
    id: "sales-by-category",
    title: "Ventas por categoría",
    description: "Agregado por categoría de producto.",
    wave: "p1",
    params: [{ kind: "dateRange", required: true }, { kind: "posMulti" }],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return SALES_REPORT_REGISTRY.find((r) => r.id === id);
}
