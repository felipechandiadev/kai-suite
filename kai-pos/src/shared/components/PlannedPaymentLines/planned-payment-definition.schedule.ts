import {
  addCalendarDays,
  addCalendarMonths,
  parseYyyyMmDdLocal,
  toYyyyMmDdLocal,
} from "@/features/purchasing-reception/lib/planned-payment-helpers";

/** Primera cuota y siguientes según plazo del proveedor (compras / DTE). */
export type PlannedPaymentTermScheduleConfig = {
  kind: "payment-term";
  docDate: string;
  termDays: number;
};

/** Cuotas con misma base de fecha (legacy nómina). */
export type PlannedPaymentFixedBaseScheduleConfig = {
  kind: "fixed-base";
  baseDueDate: string;
};

/**
 * Cuotas en cadena mensual: 1.ª = ancla + 1 mes, 2.ª = 1.ª + 1 mes, etc.
 * Ancla por defecto: fecha actual.
 */
export type PlannedPaymentMonthlyScheduleConfig = {
  kind: "monthly-chain";
  /** Fecha base; la primera cuota vence un mes después. Default: hoy. */
  anchorDate?: string;
};

export type PlannedPaymentScheduleConfig =
  | PlannedPaymentTermScheduleConfig
  | PlannedPaymentFixedBaseScheduleConfig
  | PlannedPaymentMonthlyScheduleConfig;

function resolveMonthlyAnchor(config: PlannedPaymentMonthlyScheduleConfig): Date {
  const raw = config.anchorDate?.trim();
  if (raw) {
    return parseYyyyMmDdLocal(raw);
  }
  return parseYyyyMmDdLocal(toYyyyMmDdLocal(new Date()));
}

export function resolveFirstScheduledDueDate(config: PlannedPaymentScheduleConfig): string {
  if (config.kind === "fixed-base") {
    return config.baseDueDate;
  }
  if (config.kind === "monthly-chain") {
    return toYyyyMmDdLocal(addCalendarMonths(resolveMonthlyAnchor(config), 1));
  }
  const base = parseYyyyMmDdLocal(config.docDate || toYyyyMmDdLocal(new Date()));
  return toYyyyMmDdLocal(addCalendarDays(base, config.termDays));
}

export function resolveNextScheduledDueDate(
  config: PlannedPaymentScheduleConfig,
  lastDueDate: string,
): string {
  if (config.kind === "fixed-base") {
    return config.baseDueDate;
  }
  if (config.kind === "monthly-chain") {
    const last = parseYyyyMmDdLocal(lastDueDate);
    return toYyyyMmDdLocal(addCalendarMonths(last, 1));
  }
  const last = parseYyyyMmDdLocal(lastDueDate);
  return toYyyyMmDdLocal(addCalendarDays(last, config.termDays));
}
