import type { ReportRegistryEntry } from "./types/purchasing-report.types";

export const PURCHASING_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "purchases-by-period",
    title: "Resumen de compras",
    description: "Totales neto/IVA/bruto desde facturas proveedor y evolución diaria.",
    wave: "mvp",
    params: [{ kind: "dateRange", required: true }, { kind: "supplier" }, { kind: "storageMulti" }],
  },
  {
    id: "purchase-detail",
    title: "Detalle de facturas proveedor",
    description: "Listado de facturas de compra con gráfico diario.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
      { kind: "paymentMethod" },
    ],
  },
  {
    id: "purchases-by-product",
    title: "Compras de un producto",
    description: "Unidades y costo de un producto.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "product", required: true },
      { kind: "supplier" },
      { kind: "storageMulti" },
    ],
  },
  {
    id: "supplier-returns",
    title: "Devoluciones a proveedor",
    description: "Devoluciones del período y ratio vs compras.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier" },
      { kind: "product" },
      { kind: "storageMulti" },
    ],
  },
  {
    id: "purchases-by-supplier",
    title: "Compras a un proveedor",
    description: "Historial de recepciones de un proveedor.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "supplier", required: true },
    ],
  },
  {
    id: "purchases-by-payment-method",
    title: "Mix de medios de pago a proveedor",
    description: "Distribución de pagos a proveedor por medio de pago.",
    wave: "mvp",
    params: [{ kind: "dateRange", required: true }, { kind: "supplier" }, { kind: "storageMulti" }],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return PURCHASING_REPORT_REGISTRY.find((r) => r.id === id);
}
