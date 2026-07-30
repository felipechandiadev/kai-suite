export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DatePreset = "today" | "week" | "month" | "prev-month";

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
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toIsoDate(from), dateTo: to };
  }
  const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
  return { dateFrom: toIsoDate(firstPrev), dateTo: toIsoDate(lastPrev) };
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
  supplierId: "Proveedor",
  supplierName: "Proveedor",
  supplierLabel: "Proveedor",
  storageIds: "Bodega",
  storageId: "Bodega",
  paymentMethod: "Medio de pago",
  branchId: "Sucursal",
  topN: "Top N",
};

const SUMMARY_LABELS_ES: Record<string, string> = {
  totalPurchases: "Compras totales",
  totalPayments: "Pagos totales",
  purchaseCount: "Cantidad de recepciones",
  paymentCount: "Cantidad de pagos",
  avgTicket: "Ticket promedio",
  subtotalNet: "Neto",
  taxAmount: "IVA",
  quantity: "Cantidad",
  amount: "Monto",
  returnsTotal: "Total devoluciones",
  returnsCount: "Cantidad devoluciones",
  purchasesTotal: "Total compras",
  returnsVsPurchasesPct: "Devoluciones vs compras",
  supplierName: "Proveedor",
  methods: "Medios de pago",
};

const COLUMN_LABELS_ES: Record<string, string> = {
  day: "Día",
  count: "Cantidad",
  total: "Total",
  avgTicket: "Ticket prom.",
  createdAt: "Fecha",
  id: "ID",
  paymentMethod: "Pago",
  status: "Estado",
  documentNumber: "Documento",
  supplierName: "Proveedor",
  productSku: "SKU",
  productName: "Producto",
  quantity: "Cant.",
  unitPrice: "P. unit.",
  unitCost: "Costo",
  subtotal: "Subtotal",
  taxAmount: "IVA",
  qty: "Cant.",
  amount: "Monto",
  sharePct: "%",
};

export type ReportValueKind = "money" | "count" | "percent" | "text" | "date" | "datetime";

/** Claves tipadas (exactas) — evita match por substring tipo ticketCount → money. */
const VALUE_KIND_BY_KEY: Record<string, ReportValueKind> = {
  totalPurchases: "money",
  totalPayments: "money",
  avgTicket: "money",
  amount: "money",
  returnsTotal: "money",
  purchasesTotal: "money",
  total: "money",
  subtotal: "money",
  subtotalNet: "money",
  taxAmount: "money",
  unitPrice: "money",
  unitCost: "money",
  purchaseCount: "count",
  paymentCount: "count",
  count: "count",
  quantity: "count",
  qty: "count",
  methods: "count",
  returnsCount: "count",
  returnsVsPurchasesPct: "percent",
  sharePct: "percent",
  day: "date",
  createdAt: "datetime",
  supplierName: "text",
  paymentMethod: "text",
  status: "text",
  productName: "text",
  productSku: "text",
  documentNumber: "text",
  id: "text",
  supplierId: "text",
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
  return PARAM_LABELS_ES[key] ?? key;
}

export function formatReportSummaryLabel(key: string): string {
  return SUMMARY_LABELS_ES[key] ?? PARAM_LABELS_ES[key] ?? key;
}

export function formatReportColumnLabel(key: string, fallback?: string): string {
  return COLUMN_LABELS_ES[key] ?? fallback ?? key;
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
      k.includes("totalpurchases") ||
      k.includes("totalpayments") ||
      k.includes("purchasestotal") ||
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
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatReportDateEs(value);
  }
  return String(value);
}

export function formatReportMoney(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatReportPercent(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(v)}%`;
}

export function formatReportCount(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatReportSummaryValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  const kind = getReportValueKind(key);
  if (kind === "money" && typeof value === "number") return formatReportMoney(value);
  if (kind === "percent" && typeof value === "number") return formatReportPercent(value);
  if (kind === "count" && typeof value === "number") return formatReportCount(value);
  if (kind === "date" && typeof value === "string") return formatReportDateEs(value);
  if (key === "sessionStatus" || key === "paymentMethod" || key === "status") {
    return translateEnumValue(value);
  }
  return String(value);
}

export function formatReportCell(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "paymentMethod" || key === "status" || key === "sessionStatus") {
    return translateEnumValue(value);
  }
  const kind = getReportValueKind(key);
  if (kind === "money" && (typeof value === "number" || !Number.isNaN(Number(value)))) {
    return formatReportMoney(value);
  }
  if (kind === "percent" && typeof value === "number") return formatReportPercent(value);
  if (kind === "count" && typeof value === "number") return formatReportCount(value);
  if (value instanceof Date) return value.toLocaleString("es-CL");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatReportDateEs(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("es-CL");
  }
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return formatReportMonthEs(value);
  }
  if (typeof value === "number") {
    if (kind === "text") return formatReportCount(value);
    return String(value);
  }
  return String(value);
}
