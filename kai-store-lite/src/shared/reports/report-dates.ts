export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DatePreset =
  | "today"
  | "week"
  | "days30"
  | "month"
  | "prev-month"
  | "months3"
  | "months6"
  | "year"
  | "historical"
  | "custom";

/** Tope de histórico: 5 años hacia atrás desde hoy. */
export const HISTORICAL_MAX_YEARS = 5;

export const DATE_PRESET_OPTIONS: Array<{ id: DatePreset; label: string }> = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Últimos 7 días" },
  { id: "days30", label: "Últimos 30 días" },
  { id: "month", label: "Mes actual" },
  { id: "prev-month", label: "Mes anterior" },
  { id: "months3", label: "Últimos 3 meses" },
  { id: "months6", label: "Últimos 6 meses" },
  { id: "year", label: "Último año" },
  { id: "historical", label: "Histórico" },
  { id: "custom", label: "Personalizado" },
];

export function dateRangeForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = toIsoDate(now);
  if (preset === "today") {
    return { dateFrom: to, dateTo: to };
  }
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "days30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "prev-month") {
    const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: toIsoDate(firstPrev), dateTo: toIsoDate(lastPrev) };
  }
  if (preset === "months3") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    from.setDate(from.getDate() + 1);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "months6") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    from.setDate(from.getDate() + 1);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "year") {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    from.setDate(from.getDate() + 1);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  if (preset === "historical") {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - HISTORICAL_MAX_YEARS);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  // custom: keep caller dates; fallback to month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toIsoDate(from), dateTo: to };
}

/** Días inclusivos entre YYYY-MM-DD. */
export function daysInRange(dateFrom: string, dateTo: string): number {
  const a = new Date(`${dateFrom}T00:00:00`);
  const b = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

export type ReportGranularity = "day" | "week" | "month" | "auto";

export function resolveGranularity(
  granularity: ReportGranularity | string | null | undefined,
  dateFrom: string,
  dateTo: string,
): "day" | "week" | "month" {
  if (granularity === "day" || granularity === "week" || granularity === "month") {
    return granularity;
  }
  const days = daysInRange(dateFrom, dateTo);
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

export type CompareWith = "none" | "previousPeriod" | "samePeriodLastYear";

/** Rango de comparación equivalente (misma duración). */
export function compareDateRange(
  dateFrom: string,
  dateTo: string,
  mode: CompareWith,
): { dateFrom: string; dateTo: string } | null {
  if (mode === "none") return null;
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const days = daysInRange(dateFrom, dateTo);
  if (mode === "samePeriodLastYear") {
    const prevFrom = new Date(from);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(to);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { dateFrom: toIsoDate(prevFrom), dateTo: toIsoDate(prevTo) };
  }
  // previousPeriod: bloque inmediatamente anterior de la misma duración
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { dateFrom: toIsoDate(prevFrom), dateTo: toIsoDate(prevTo) };
}

/** Formatea YYYY-MM-DD a español (ej. "9 de julio de 2026"). */
export function formatReportDateEs(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Fecha corta para ejes de gráficos (ej. "9 jul"). */
export function formatReportDateShortEs(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

/** Mes YYYY-MM → "jul 2026". */
export function formatReportMonthEs(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("es-CL", { month: "short", year: "numeric" });
}

const PARAM_LABELS_ES: Record<string, string> = {
  dateFrom: "Desde",
  dateTo: "Hasta",
  productId: "Producto",
  productLabel: "Producto",
  customerId: "Cliente",
  customerName: "Cliente",
  customerLabel: "Cliente",
  pointOfSaleIds: "Punto de venta",
  pointOfSaleId: "Punto de venta",
  paymentMethod: "Medio de pago",
  cashSessionId: "Sesión de caja",
  branchId: "Sucursal",
  diningRoomId: "Salón",
  orderKind: "Tipo de cuenta",
  topN: "Top N",
  promotionId: "Promoción",
  sessionStatus: "Estado sesión",
  openedAt: "Apertura",
  closedAt: "Cierre",
  granularity: "Granularidad",
  compareWith: "Comparar con",
  compareFrom: "Comparación desde",
  compareTo: "Comparación hasta",
  posAId: "POS A",
  posBId: "POS B",
  supplierId: "Proveedor",
  supplierName: "Proveedor",
  supplierLabel: "Proveedor",
  storageIds: "Bodega",
  storageId: "Bodega",
  stockUnitIds: "Unidad de stock",
  categoryIds: "Categoría",
};

const SUMMARY_LABELS_ES: Record<string, string> = {
  totalSales: "Ventas totales",
  ticketCount: "Cantidad de tickets",
  avgTicket: "Ticket promedio",
  grossMargin: "Margen bruto",
  marginCoveragePct: "Cobertura de margen",
  quantity: "Cantidad",
  amount: "Monto",
  returnsTotal: "Total devoluciones",
  returnsCount: "Cantidad devoluciones",
  salesTotal: "Total ventas",
  returnsVsSalesPct: "Devoluciones vs ventas",
  customerName: "Cliente",
  sessionStatus: "Estado sesión",
  products: "Productos",
  totalAmount: "Monto total",
  methods: "Medios de pago",
  posCount: "Puntos de venta",
  creditNotes: "Notas de crédito",
  redemptions: "Redenciones",
  promotions: "Promociones",
  quotations: "Cotizaciones",
  statuses: "Estados",
  backorders: "Encargos",
  categories: "Categorías",
  totalSalesB: "Ventas POS B",
  ticketCountB: "Tickets POS B",
  avgTicketB: "Ticket prom. POS B",
  totalPurchases: "Compras totales",
  totalPayments: "Pagos totales",
  purchaseCount: "Cantidad de recepciones",
  paymentCount: "Cantidad de pagos",
  subtotalNet: "Neto",
  taxAmount: "IVA",
  purchasesTotal: "Total compras",
  returnsVsPurchasesPct: "Devoluciones vs compras",
  supplierName: "Proveedor",
  skuCount: "SKUs",
  qtyTotal: "Cantidad total",
  valorConPmp: "Valor con PMP",
  lineasSinPmp: "Sin PMP",
  alertRows: "Filas con alerta",
  belowMinimum: "Bajo mínimo",
  aboveMaximum: "Sobre máximo",
  reorder: "Reorden",
  storageCount: "Almacenes",
  rowCount: "Filas",
  categoryCount: "Categorías",
  unitCount: "Unidades",
  dayRows: "Filas día×unidad",
  lineEvents: "Eventos",
  transferCount: "Transferencias",
  qtyMoved: "Cant. transferida",
  qtyIn: "Entradas",
  qtyOut: "Salidas",
  qtyNet: "Neto",
  valorMovido: "Valor movido",
  lineasSinCosto: "Líneas sin costo",
  accountCount: "Cuentas cerradas",
  avgDwellMinutes: "Permanencia media (min)",
  tipTotal: "Propinas",
  tipPct: "% propina",
  peakHour: "Hora pico",
  peakHourAccounts: "Cuentas en hora pico",
  tableCount: "Mesas con movimiento",
};

const COLUMN_LABELS_ES: Record<string, string> = {
  day: "Día",
  count: "Cantidad",
  total: "Total",
  avgTicket: "Ticket prom.",
  avgDwellMinutes: "Permanencia (min)",
  roomName: "Salón",
  tableLabel: "Mesa",
  turns: "Turnos",
  hour: "Hora",
  tipTotal: "Propinas",
  tipPct: "% propina",
  createdAt: "Fecha",
  id: "ID",
  paymentMethod: "Pago",
  status: "Estado",
  productSku: "SKU",
  productName: "Producto",
  quantity: "Cant.",
  unitPrice: "P. unit.",
  unitCost: "Costo",
  subtotal: "Subtotal",
  margin: "Margen",
  qty: "Cant.",
  amount: "Monto",
  pointOfSaleId: "POS",
  customerId: "Cliente",
  promotionId: "Promoción",
  categoryId: "Categoría",
  sharePct: "%",
  metric: "Métrica",
  current: "Actual",
  previous: "Comparación",
  deltaPct: "Δ %",
  pos: "Punto de venta",
  totalSales: "Ventas totales",
  ticketCount: "Tickets",
  documentNumber: "Documento",
  supplierName: "Proveedor",
  taxAmount: "IVA",
  sku: "SKU",
  storageLabel: "Almacén",
  storageName: "Almacén",
  targetStorageName: "Destino",
  categoryName: "Categoría",
  stockUnit: "Unidad",
  qtyIn: "Entradas",
  qtyOut: "Salidas",
  qtyNet: "Neto",
  lineCount: "Líneas",
  pmp: "PMP",
  valor: "Valor",
  valorConPmp: "Valor PMP",
  lineasSinPmp: "Sin PMP",
  skuCount: "SKUs",
  physicalStock: "Físico",
  minimumStock: "Mín.",
  maximumStock: "Máx.",
  reorderPoint: "Reorden",
  alertKinds: "Alertas",
  transactionType: "Tipo",
};

export type ReportValueKind = "money" | "count" | "percent" | "text" | "date" | "datetime";

/** Claves tipadas (exactas) — evita match por substring tipo ticketCount → money. */
const VALUE_KIND_BY_KEY: Record<string, ReportValueKind> = {
  totalSales: "money",
  totalSalesB: "money",
  avgTicket: "money",
  avgTicketB: "money",
  tipTotal: "money",
  tipPct: "percent",
  avgDwellMinutes: "count",
  accountCount: "count",
  peakHour: "count",
  peakHourAccounts: "count",
  tableCount: "count",
  turns: "count",
  grossMargin: "money",
  amount: "money",
  totalAmount: "money",
  returnsTotal: "money",
  salesTotal: "money",
  total: "money",
  subtotal: "money",
  unitPrice: "money",
  unitCost: "money",
  margin: "money",
  current: "money", // override via metricKey en filas comparativas
  previous: "money",
  ticketCount: "count",
  ticketCountB: "count",
  count: "count",
  quantity: "count",
  qty: "count",
  products: "count",
  methods: "count",
  posCount: "count",
  creditNotes: "count",
  redemptions: "count",
  promotions: "count",
  quotations: "count",
  statuses: "count",
  backorders: "count",
  categories: "count",
  returnsCount: "count",
  marginCoveragePct: "percent",
  returnsVsSalesPct: "percent",
  sharePct: "percent",
  deltaPct: "percent",
  day: "date",
  createdAt: "datetime",
  openedAt: "datetime",
  closedAt: "datetime",
  customerName: "text",
  sessionStatus: "text",
  paymentMethod: "text",
  status: "text",
  productName: "text",
  productSku: "text",
  id: "text",
  customerId: "text",
  pointOfSaleId: "text",
  promotionId: "text",
  categoryId: "text",
  metric: "text",
  pos: "text",
  totalPurchases: "money",
  totalPayments: "money",
  purchasesTotal: "money",
  subtotalNet: "money",
  taxAmount: "money",
  valorConPmp: "money",
  valor: "money",
  valorMovido: "money",
  pmp: "money",
  lineasSinCosto: "count",
  purchaseCount: "count",
  paymentCount: "count",
  returnsVsPurchasesPct: "percent",
  qtyTotal: "count",
  qtyMoved: "count",
  qtyIn: "count",
  qtyOut: "count",
  qtyNet: "count",
  physicalStock: "count",
  skuCount: "count",
  lineasSinPmp: "count",
  alertRows: "count",
  belowMinimum: "count",
  aboveMaximum: "count",
  reorder: "count",
  transferCount: "count",
  storageCount: "count",
  minimumStock: "count",
  maximumStock: "count",
  reorderPoint: "count",
  lineCount: "count",
  documentNumber: "text",
  supplierId: "text",
  supplierName: "text",
  sku: "text",
  storageLabel: "text",
  storageName: "text",
  targetStorageName: "text",
  categoryName: "text",
  stockUnit: "text",
  alertKinds: "text",
  transactionType: "text",
};

const PAYMENT_METHOD_LABELS_ES: Record<string, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT: "Crédito",
  INTERNAL_CREDIT: "Crédito interno",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito",
  ORDER_ADVANCE: "Anticipo",
  VOUCHER: "Voucher",
  MIXED: "Mixto",
};

const STATUS_LABELS_ES: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmada",
  PARTIALLY_RECEIVED: "Parcialmente recibida",
  RECEIVED: "Recibida",
  CANCELLED: "Anulada",
  COMPLETED: "Completada",
  VOIDED: "Anulada",
  PENDING: "Pendiente",
  EXPIRED: "Vencida",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  RECONCILED: "Conciliada",
};

export function formatReportParamLabel(key: string): string {
  return PARAM_LABELS_ES[key] ?? humanizeReportKey(key);
}

export function formatReportSummaryLabel(key: string): string {
  return SUMMARY_LABELS_ES[key] ?? PARAM_LABELS_ES[key] ?? humanizeReportKey(key);
}

export function formatReportColumnLabel(key: string, fallback?: string): string {
  const base =
    COLUMN_LABELS_ES[key] ??
    SUMMARY_LABELS_ES[key] ??
    (fallback && !/^[a-z][a-zA-Z0-9]*$/.test(fallback) ? fallback : undefined) ??
    humanizeReportKey(key);

  // Columnas genéricas de la tabla comparativa: el símbolo va en cada celda
  if (key === "metric" || key === "current" || key === "previous" || key === "pos") {
    return base;
  }
  if (key === "deltaPct" || key === "sharePct") return base.includes("%") ? base : `${base} (%)`;

  const kind = VALUE_KIND_BY_KEY[key] ?? getReportValueKind(key);
  if (kind === "money") return base.includes("$") ? base : `${base} ($)`;
  if (kind === "percent") return base.includes("%") ? base : `${base} (%)`;
  if (kind === "count") {
    if (/\(u\.\)|tickets|usos/i.test(base)) return base;
    const unit = countUnitForKey(key);
    return `${base} (${unit})`;
  }
  return base;
}

/** Convierte camelCase/snake_case a etiqueta legible en español cuando no hay diccionario. */
export function humanizeReportKey(key: string): string {
  const known = SUMMARY_LABELS_ES[key] ?? COLUMN_LABELS_ES[key] ?? PARAM_LABELS_ES[key];
  if (known) return known;
  // Preferir no mostrar camelCase crudo a usuarios chilenos
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type FormatReportCellOptions = {
  /** Clave de métrica de la fila (p.ej. totalSales) para tipar current/previous. */
  metricKey?: string;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const plain = Number(value.trim());
    if (Number.isFinite(plain)) return plain;
  }
  return null;
}

/** Sufijo de unidad para conteos (tickets vs unidades de producto). */
function countUnitForKey(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("ticket") || k === "count") return "tickets";
  if (k.includes("redemption") || k === "redemptions") return "usos";
  if (
    k.includes("product") ||
    k.includes("method") ||
    k.includes("poscount") ||
    k.includes("categor") ||
    k.includes("status") ||
    k.includes("quotation") ||
    k.includes("backorder") ||
    k.includes("promotion") ||
    k.includes("creditnote")
  ) {
    return "u.";
  }
  if (k === "qty" || k.includes("quantity") || k.includes("qty")) return "u.";
  return "u.";
}

export function formatReportMoney(n: unknown): string {
  const v = toFiniteNumber(n);
  if (v == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatReportPercent(n: unknown): string {
  const v = toFiniteNumber(n);
  if (v == null) return "—";
  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(v)}\u00a0%`;
}

export function formatReportCount(n: unknown, unitKey?: string): string {
  const v = toFiniteNumber(n);
  if (v == null) return "—";
  const formatted = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 2,
  }).format(v);
  const unit = countUnitForKey(unitKey ?? "qty");
  return `${formatted}\u00a0${unit}`;
}

/** Formatea un valor según el kind de la clave (dinero / % / unidades). */
export function formatReportValueByKey(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "paymentMethod" || key === "status" || key === "sessionStatus") {
    return translateEnumValue(value);
  }
  const kind = getReportValueKind(key);
  const num = toFiniteNumber(value);
  if (kind === "money" && num != null) return formatReportMoney(num);
  if (kind === "percent" && num != null) return formatReportPercent(num);
  if (kind === "count" && num != null) return formatReportCount(num, key);
  if (kind === "date" && typeof value === "string") return formatReportDateEs(value);
  if (kind === "datetime") {
    if (value instanceof Date) return value.toLocaleString("es-CL");
    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString("es-CL");
    }
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatReportDateEs(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return formatReportMonthEs(value);
  }
  if (typeof value === "string" && /^[a-z][a-zA-Z0-9]*$/.test(value)) {
    return formatReportSummaryLabel(value);
  }
  if (num != null && kind === "text") return formatReportCount(num, key);
  return String(value);
}

export function formatReportCell(
  key: string,
  value: unknown,
  opts?: FormatReportCellOptions,
): string {
  if (value == null) return "—";

  if (key === "metric") {
    return formatReportSummaryLabel(String(value));
  }

  // Tabla comparativa: tipar Actual/Comparación según la métrica de la fila
  if ((key === "current" || key === "previous") && opts?.metricKey) {
    return formatReportValueByKey(opts.metricKey, value);
  }

  if (key === "deltaPct") {
    const n = toFiniteNumber(value);
    return n == null ? "—" : formatReportPercent(n);
  }

  return formatReportValueByKey(key, value);
}

export function formatReportSummaryValue(key: string, value: unknown): string {
  return formatReportValueByKey(key, value);
}

export function getReportValueKind(key: string): ReportValueKind {
  if (VALUE_KIND_BY_KEY[key]) return VALUE_KIND_BY_KEY[key];
  const k = key.toLowerCase();
  if (k.endsWith("pct") || k.includes("percent") || k.includes("coverage")) return "percent";
  if (
    k.includes("count") ||
    k === "qty" ||
    k.includes("quantity") ||
    k.endsWith("s") && (k.includes("product") || k.includes("method") || k.includes("status"))
  ) {
    return "count";
  }
  if (
    (k.includes("total") ||
      k.includes("amount") ||
      k.includes("price") ||
      k.includes("subtotal") ||
      k.includes("cogs") ||
      k === "margin" ||
      k.includes("avgticket") ||
      k.includes("grossmargin") ||
      k.includes("totalsales") ||
      k.includes("salestotal") ||
      k.includes("returnstotal")) &&
    !k.includes("count") &&
    !k.includes("pct")
  ) {
    return "money";
  }
  return "text";
}

export function translateEnumValue(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  return PAYMENT_METHOD_LABELS_ES[raw] ?? STATUS_LABELS_ES[raw] ?? raw;
}

export function formatReportAxisLabel(x: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return formatReportDateShortEs(x);
  if (/^\d{4}-\d{2}$/.test(x)) return formatReportMonthEs(x);
  return translateEnumValue(x);
}

export function formatReportParamValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "dateFrom" || key === "dateTo") {
    return formatReportDateEs(String(value));
  }
  if (key === "openedAt" || key === "closedAt") {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("es-CL");
  }
  if (key === "paymentMethod" || key === "sessionStatus" || key === "status") {
    return translateEnumValue(value);
  }
  if (key === "orderKind") {
    const map: Record<string, string> = {
      TABLE: "Mesas",
      COUNTER: "Barra",
      TAKEAWAY: "Para llevar",
    };
    return map[String(value)] ?? String(value);
  }
  if (key === "compareWith") {
    const map: Record<string, string> = {
      none: "Sin comparación",
      previousPeriod: "Período anterior",
      samePeriodLastYear: "Mismo lapso año pasado",
    };
    return map[String(value)] ?? String(value);
  }
  if (key === "granularity") {
    const map: Record<string, string> = {
      day: "Día",
      week: "Semana",
      month: "Mes",
      auto: "Automática",
    };
    return map[String(value)] ?? String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatReportDateEs(value);
  }
  return String(value);
}
