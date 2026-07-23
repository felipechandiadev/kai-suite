import { BadRequestException } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';

export type PayrollSettlementPaymentMode =
  | 'PENDING'
  | 'PENDING_SCHEDULED'
  | 'PARTIAL'
  | 'COMPLETED';

export interface PayrollSettlementPaymentLineInput {
  dueDate: string;
  amount: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | string;
  companyBankAccountKey?: string | null;
  /** Cuenta del empleado (destino transferencia). */
  employeeBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  cashHubId?: string | null;
}

export interface PayrollSettlementPaymentInput {
  mode: PayrollSettlementPaymentMode;
  partialPaidAmount?: number;
  paidLines: PayrollSettlementPaymentLineInput[];
  scheduledLines: PayrollSettlementPaymentLineInput[];
}

function roundClp(n: unknown): number {
  return Math.max(0, Math.round(Number(n) || 0));
}

function sumLineAmounts(lines: PayrollSettlementPaymentLineInput[]): number {
  return lines.reduce((s, l) => s + roundClp(l.amount), 0);
}

/** Reparte un total CLP en N partes casi iguales (resto en la última). */
export function distributeClpAcross(total: number, count: number): number[] {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0) return [];
  const t = roundClp(total);
  const base = Math.floor(t / n);
  const parts = Array.from({ length: n }, () => base);
  const rem = t - base * n;
  if (rem > 0 && parts.length > 0) {
    parts[parts.length - 1] += rem;
  }
  return parts;
}

/**
 * Cuando el líquido cambia (p.ej. tras auto-sugerir descuentos legales),
 * reajusta montos de cuotas/abonos para igualar el nuevo neto sin alterar fechas/medios.
 */
export function alignSettlementPaymentToNet(
  payment: PayrollSettlementPaymentInput,
  netPayment: number,
): PayrollSettlementPaymentInput {
  const net = roundClp(netPayment);
  const eps = 2;
  const mode = payment.mode;

  if (mode === 'PENDING') {
    return { mode: 'PENDING', paidLines: [], scheduledLines: [] };
  }

  if (mode === 'PENDING_SCHEDULED') {
    const sched = payment.scheduledLines ?? [];
    if (!sched.length) return payment;
    if (Math.abs(sumLineAmounts(sched) - net) <= eps) return payment;
    const parts = distributeClpAcross(net, sched.length);
    return {
      ...payment,
      paidLines: [],
      scheduledLines: sched.map((line, i) => ({
        ...line,
        amount: parts[i] ?? 0,
      })),
    };
  }

  if (mode === 'COMPLETED') {
    const paid = payment.paidLines ?? [];
    if (!paid.length) return payment;
    if (Math.abs(sumLineAmounts(paid) - net) <= eps) return payment;
    const parts = distributeClpAcross(net, paid.length);
    return {
      ...payment,
      paidLines: paid.map((line, i) => ({
        ...line,
        amount: parts[i] ?? 0,
      })),
      scheduledLines: [],
    };
  }

  if (mode === 'PARTIAL') {
    const paid = payment.paidLines ?? [];
    const sched = payment.scheduledLines ?? [];
    const part = roundClp(payment.partialPaidAmount ?? sumLineAmounts(paid));
    if (part <= 0 || part >= net) {
      // No se puede alinear de forma segura; deja que la validación falle.
      return payment;
    }
    const remainder = net - part;
    let nextPaid = paid;
    if (paid.length > 0 && Math.abs(sumLineAmounts(paid) - part) > eps) {
      const parts = distributeClpAcross(part, paid.length);
      nextPaid = paid.map((line, i) => ({ ...line, amount: parts[i] ?? 0 }));
    }
    let nextSched = sched;
    if (sched.length > 0 && Math.abs(sumLineAmounts(sched) - remainder) > eps) {
      const parts = distributeClpAcross(remainder, sched.length);
      nextSched = sched.map((line, i) => ({ ...line, amount: parts[i] ?? 0 }));
    }
    return {
      ...payment,
      partialPaidAmount: part,
      paidLines: nextPaid,
      scheduledLines: nextSched,
    };
  }

  return payment;
}

function validatePaymentLine(
  line: PayrollSettlementPaymentLineInput,
  label: string,
  opts: { isScheduledLine: boolean },
): string | null {
  const amount = roundClp(line.amount);
  if (amount <= 0) {
    return `${label}: el monto debe ser mayor a cero.`;
  }
  const dueDate = String(line.dueDate ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return `${label}: fecha de pago inválida.`;
  }
  if (opts.isScheduledLine) {
    return null;
  }
  const pm = String(line.paymentMethod ?? '').trim().toUpperCase();
  if (!pm || !['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
    return `${label}: seleccione forma de pago.`;
  }
  if (pm === 'TRANSFER') {
    if (!String(line.companyBankAccountKey ?? '').trim()) {
      return `${label}: indique cuenta bancaria de origen.`;
    }
  }
  if (pm === 'CHECK') {
    if (!String(line.companyBankAccountKey ?? '').trim()) {
      return `${label}: indique cuenta bancaria para el cheque.`;
    }
    if (!String(line.chequeNumber ?? '').trim()) {
      return `${label}: indique número de cheque.`;
    }
  }
  if (pm === 'CASH') {
    if (!String(line.cashHubId ?? '').trim()) {
      return `${label}: indique centro de acopio para efectivo.`;
    }
  }
  return null;
}

export function validatePayrollSettlementPaymentPlan(
  payment: PayrollSettlementPaymentInput,
  netPayment: number,
): void {
  const eps = 2;
  const docTotal = roundClp(netPayment);
  const { mode } = payment;
  const paid = payment.paidLines ?? [];
  const sched = payment.scheduledLines ?? [];

  for (let i = 0; i < paid.length; i++) {
    const err = validatePaymentLine(paid[i], `Abono ${i + 1}`, {
      isScheduledLine: false,
    });
    if (err) throw new BadRequestException(err);
  }
  for (let i = 0; i < sched.length; i++) {
    const err = validatePaymentLine(sched[i], `Cuota ${i + 1}`, {
      isScheduledLine: true,
    });
    if (err) throw new BadRequestException(err);
  }

  if (mode === 'PENDING') {
    if (paid.length || sched.length) {
      throw new BadRequestException(
        'Modo pendiente: no debe incluir líneas de pago.',
      );
    }
    return;
  }

  if (docTotal <= 0) {
    throw new BadRequestException(
      'No se puede programar pago cuando el líquido es cero.',
    );
  }

  if (mode === 'PENDING_SCHEDULED') {
    if (paid.length) {
      throw new BadRequestException(
        'Pago pendiente con cuotas: no debe incluir abonos ejecutados.',
      );
    }
    if (!sched.length) {
      throw new BadRequestException('Indique al menos una cuota programada.');
    }
    const sumS = sumLineAmounts(sched);
    if (Math.abs(sumS - docTotal) > eps) {
      throw new BadRequestException(
        `Las cuotas (${sumS}) deben sumar el líquido (${docTotal}).`,
      );
    }
    return;
  }

  if (mode === 'COMPLETED') {
    if (!paid.length) {
      throw new BadRequestException('Pago completado: defina la línea de pago.');
    }
    if (sched.length) {
      throw new BadRequestException(
        'Pago completado: no debe incluir cuotas pendientes adicionales.',
      );
    }
    const sumP = sumLineAmounts(paid);
    if (Math.abs(sumP - docTotal) > eps) {
      throw new BadRequestException(
        `El pago (${sumP}) debe igualar el líquido (${docTotal}).`,
      );
    }
    return;
  }

  if (mode === 'PARTIAL') {
    const part = roundClp(payment.partialPaidAmount ?? 0);
    if (part <= 0 || part >= docTotal) {
      throw new BadRequestException(
        'Indique un monto parcial mayor que 0 y menor que el líquido a pagar.',
      );
    }
    if (paid.length) {
      const sumP = sumLineAmounts(paid);
      if (Math.abs(sumP - part) > eps) {
        throw new BadRequestException(
          `Los abonos (${sumP}) deben coincidir con el monto parcial indicado (${part}).`,
        );
      }
    }
    const sumS = sumLineAmounts(sched);
    if (Math.abs(part + sumS - docTotal) > eps) {
      throw new BadRequestException(
        'Abonos + saldo programado deben igualar el líquido a pagar.',
      );
    }
    if (part < docTotal - eps && !sched.length) {
      throw new BadRequestException(
        'Pago parcial: indique las cuotas para el saldo pendiente.',
      );
    }
    return;
  }

  throw new BadRequestException(`Modo de pago no válido: ${mode}`);
}

export function mapUiPaymentMethod(raw: unknown): PaymentMethod {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (u === 'CASH') return PaymentMethod.CASH;
  if (u === 'CHECK') return PaymentMethod.CHECK;
  return PaymentMethod.TRANSFER;
}

export function coerceSettlementPaymentInput(
  payment: PayrollSettlementPaymentInput | undefined,
): PayrollSettlementPaymentInput | undefined {
  if (!payment) {
    return undefined;
  }
  const mode = String(payment.mode ?? '')
    .trim()
    .toUpperCase() as PayrollSettlementPaymentMode;
  if (mode === 'PENDING') {
    return { mode: 'PENDING', paidLines: [], scheduledLines: [] };
  }
  return {
    ...payment,
    mode,
    paidLines: payment.paidLines ?? [],
    scheduledLines: payment.scheduledLines ?? [],
  };
}

/** True when the settlement should create PAYROLL_PAYMENT draft/confirmed children. */
export function shouldCreatePayrollPaymentChildren(plan: {
  mode: PayrollSettlementPaymentMode;
  paidLines: PayrollSettlementPaymentLineInput[];
  scheduledLines: PayrollSettlementPaymentLineInput[];
}): boolean {
  if (plan.mode === 'PENDING') {
    return false;
  }
  if (plan.mode === 'COMPLETED') {
    return plan.paidLines.length > 0;
  }
  if (plan.mode === 'PARTIAL') {
    return plan.scheduledLines.length > 0;
  }
  if (plan.mode === 'PENDING_SCHEDULED') {
    return plan.scheduledLines.length > 0;
  }
  return false;
}

export function resolvePayrollPaymentLines(
  payment: PayrollSettlementPaymentInput | undefined,
  netPayment: number,
  defaultDueDate: string,
): {
  paidLines: PayrollSettlementPaymentLineInput[];
  scheduledLines: PayrollSettlementPaymentLineInput[];
  mode: PayrollSettlementPaymentMode;
  parentPaymentStatus: PaymentStatus;
  parentAmountPaid: number;
} {
  const coerced = coerceSettlementPaymentInput(payment);
  if (!coerced) {
    return {
      mode: 'PENDING',
      paidLines: [],
      scheduledLines: [],
      parentPaymentStatus: PaymentStatus.PENDING,
      parentAmountPaid: 0,
    };
  }

  const mode = coerced.mode;
  const normalizedPayment: PayrollSettlementPaymentInput = { ...coerced };

  validatePayrollSettlementPaymentPlan(normalizedPayment, netPayment);

  const paid = normalizedPayment.paidLines ?? [];
  const sched = normalizedPayment.scheduledLines ?? [];
  const net = roundClp(netPayment);

  if (mode === 'COMPLETED') {
    return {
      mode,
      paidLines: paid,
      scheduledLines: [],
      parentPaymentStatus: PaymentStatus.PAID,
      parentAmountPaid: net,
    };
  }
  if (mode === 'PARTIAL') {
    const part = roundClp(coerced.partialPaidAmount ?? 0);
    return {
      mode,
      paidLines: paid,
      scheduledLines: sched,
      parentPaymentStatus: PaymentStatus.PARTIAL,
      parentAmountPaid: paid.length ? sumLineAmounts(paid) : part,
    };
  }
  if (mode === 'PENDING_SCHEDULED') {
    return {
      mode,
      paidLines: [],
      scheduledLines: sched,
      parentPaymentStatus: PaymentStatus.PENDING,
      parentAmountPaid: 0,
    };
  }
  return {
    mode: 'PENDING',
    paidLines: [],
    scheduledLines: [],
    parentPaymentStatus: PaymentStatus.PENDING,
    parentAmountPaid: 0,
  };
}
