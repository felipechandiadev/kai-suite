import type { ReportRegistryEntry } from "./types/inventory-report.types";

export const INVENTORY_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "stock-valuation",
    title: "Valoración de stock (PMP)",
    description: "Existencias físicas valorizadas a PMP vigente.",
    wave: "mvp",
    params: [{ kind: "storageMulti" }, { kind: "product" }],
  },
  {
    id: "stock-alerts",
    title: "Alertas de stock",
    description: "Umbrales activos: mínimo, máximo o reorden.",
    wave: "mvp",
    params: [{ kind: "storageMulti" }, { kind: "product" }],
  },
  {
    id: "stock-by-storage",
    title: "Stock por almacén",
    description:
      "Cantidades y valoración PMP por bodega × unidad de stock (no se mezclan Un/Kg).",
    wave: "mvp",
    params: [
      { kind: "stockUnitMulti" },
      { kind: "storageMulti" },
      { kind: "product" },
    ],
  },
  {
    id: "stock-by-category",
    title: "Stock por categoría",
    description:
      "Existencias por categoría × unidad de stock. Unidad de stock obligatoria.",
    wave: "mvp",
    params: [
      { kind: "stockUnitMulti", required: true },
      { kind: "storageMulti" },
      { kind: "categoryMulti" },
    ],
  },
  {
    id: "stock-movement-trend",
    title: "Variabilidad de stock (movimientos)",
    description:
      "Neto diario de movimientos de inventario (Δ qty) por unidad de stock.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "stockUnitMulti", required: true },
      { kind: "storageMulti" },
      { kind: "product" },
    ],
  },
  {
    id: "inventory-transfers",
    title: "Transferencias entre almacenes",
    description: "TRANSFER_OUT del período (sin doble conteo del ingreso).",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "storageMulti" },
      { kind: "product" },
    ],
  },
  {
    id: "inventory-adjustments",
    title: "Ajustes de inventario",
    description: "ADJUSTMENT_IN / ADJUSTMENT_OUT del período.",
    wave: "mvp",
    params: [
      { kind: "dateRange", required: true },
      { kind: "storageMulti" },
      { kind: "product" },
    ],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return INVENTORY_REPORT_REGISTRY.find((r) => r.id === id);
}
