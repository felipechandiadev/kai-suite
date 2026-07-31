import type { ReportRegistryEntry } from "./types/purchasing-report.types";

export const PURCHASING_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "purchases-by-period",
    title: "Resumen de compras",
    description: "Totales neto/IVA/bruto desde facturas proveedor y evolución del período.",
    wave: "mvp",
    category: "resumen",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "purchase-detail",
    title: "Detalle de facturas proveedor",
    description: "Listado de facturas de compra con evolución del período.",
    wave: "mvp",
    category: "resumen",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "paymentMethod" },
      { kind: "granularity" },
    ],
  },
  {
    id: "purchases-period-compare",
    title: "Comparativo de período",
    description: "Compras del período vs período anterior o mismo lapso del año pasado.",
    wave: "p1",
    category: "comparativos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "granularity" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "purchases-by-supplier",
    title: "Compras a un proveedor",
    description: "Historial de recepciones de un proveedor.",
    wave: "mvp",
    category: "proveedores",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier", required: true },
    ],
  },
  {
    id: "supplier-returns",
    title: "Devoluciones a proveedor",
    description: "Devoluciones del período y ratio vs compras.",
    wave: "mvp",
    category: "proveedores",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "product" },
      { kind: "storageMulti" },
    ],
  },
  {
    id: "purchases-by-product",
    title: "Compras de un producto",
    description: "Unidades y costo de un producto.",
    wave: "mvp",
    category: "productos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "product", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "compareWith" },
    ],
  },
  {
    id: "purchases-by-payment-method",
    title: "Mix de medios de pago a proveedor",
    description: "Distribución de pagos a proveedor por medio de pago.",
    wave: "mvp",
    category: "pagos",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "compareWith" },
    ],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return PURCHASING_REPORT_REGISTRY.find((r) => r.id === id);
}
