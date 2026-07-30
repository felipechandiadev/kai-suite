import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';

export type SupplierDocumentPaymentPlanInput = {
  mode: string;
  partialPaidAmount?: number;
  paidLines: Record<string, unknown>[];
  scheduledLines: Record<string, unknown>[];
};

@Injectable()
export class SupplierDocumentPaymentPlanService {
  constructor(private readonly transactionsService: TransactionsService) {}

  normalize(raw: unknown): SupplierDocumentPaymentPlanInput {
    if (!raw || typeof raw !== 'object') {
      return { mode: 'PENDING', paidLines: [], scheduledLines: [] };
    }
    const o = raw as Record<string, unknown>;
    const modeRaw = String(o.mode || 'PENDING').toUpperCase();
    const mode = ['PENDING', 'PENDING_SCHEDULED', 'PARTIAL', 'COMPLETED'].includes(
      modeRaw,
    )
      ? modeRaw
      : 'PENDING';
    return {
      mode,
      partialPaidAmount:
        o.partialPaidAmount != null ? this.roundClp(o.partialPaidAmount) : undefined,
      paidLines: Array.isArray(o.paidLines) ? o.paidLines : [],
      scheduledLines: Array.isArray(o.scheduledLines) ? o.scheduledLines : [],
    };
  }

  validate(
    payment: SupplierDocumentPaymentPlanInput,
    docTotal: number,
    posCashSessionId?: string | null,
  ): string | null {
    const eps = 2;
    const { mode } = payment;
    const paid = payment.paidLines;
    const sched = payment.scheduledLines;

    for (let i = 0; i < paid.length; i++) {
      const err = this.validatePaymentLine(paid[i], `Abono ${i + 1}`, {
        posCashSessionId,
        isScheduledLine: false,
      });
      if (err) return err;
    }
    for (let i = 0; i < sched.length; i++) {
      const err = this.validatePaymentLine(sched[i], `Cuota ${i + 1}`, {
        posCashSessionId,
        isScheduledLine: true,
      });
      if (err) return err;
    }

    if (mode === 'PENDING') {
      if (paid.length || sched.length) {
        return 'Modo pendiente: no debe incluir líneas de pago.';
      }
      return null;
    }

    if (mode === 'PENDING_SCHEDULED') {
      if (paid.length) {
        return 'Pago pendiente con cuotas: no debe incluir abonos ejecutados.';
      }
      if (!sched.length) {
        return 'Indique al menos una cuota programada.';
      }
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(sumS - docTotal) > eps) {
        return `Las cuotas (${sumS}) deben sumar el total del documento (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'COMPLETED') {
      if (!paid.length) return 'Pago completado: defina la línea de pago.';
      if (sched.length) {
        return 'Pago completado: no debe incluir cuotas pendientes adicionales.';
      }
      const sumP = this.sumLineAmounts(paid);
      if (Math.abs(sumP - docTotal) > eps) {
        return `El pago (${sumP}) debe igualar el total (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'PARTIAL') {
      const part = this.roundClp(payment.partialPaidAmount ?? 0);
      if (part <= 0 || part >= docTotal) {
        return 'Indique un monto parcial mayor que 0 y menor que el total del documento.';
      }
      if (paid.length) {
        const sumP = this.sumLineAmounts(paid);
        if (Math.abs(sumP - part) > eps) {
          return `Los abonos (${sumP}) deben coincidir con el monto parcial indicado (${part}).`;
        }
      }
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(part + sumS - docTotal) > eps) {
        return 'Abonos + saldo programado deben igualar el total del documento.';
      }
      if (part < docTotal - eps && !sched.length) {
        return 'Pago parcial: indique las cuotas para el saldo pendiente.';
      }
      return null;
    }

    return null;
  }

  resolveFiscalParentFields(
    payment: SupplierDocumentPaymentPlanInput,
    docTotal: number,
    posCashSessionId?: string | null,
  ): {
    paymentStatus: PaymentStatus;
    amountPaid: number;
    plannedPayments: Record<string, unknown>[];
    paymentMethod?: PaymentMethod;
  } {
    const paid = payment.paidLines;
    const sched = payment.scheduledLines;
    let paymentStatus = PaymentStatus.PENDING;
    let amountPaid = 0;
    let plannedForMeta: Record<string, unknown>[] = [];

    if (payment.mode === 'COMPLETED') {
      paymentStatus = PaymentStatus.PAID;
      amountPaid = docTotal;
      plannedForMeta = paid.map((l) =>
        this.toPlannedPaymentMeta(l, posCashSessionId),
      );
    } else if (payment.mode === 'PARTIAL') {
      paymentStatus = PaymentStatus.PARTIAL;
      const part = this.roundClp(payment.partialPaidAmount ?? 0);
      amountPaid = paid.length ? this.sumLineAmounts(paid) : part;
      plannedForMeta = [
        ...paid.map((l) =>
          this.toPlannedPaymentMeta(l, posCashSessionId, { isScheduled: false }),
        ),
        ...sched.map((l) =>
          this.toPlannedPaymentMeta(l, posCashSessionId, { isScheduled: true }),
        ),
      ];
    } else if (payment.mode === 'PENDING_SCHEDULED') {
      paymentStatus = PaymentStatus.PENDING;
      amountPaid = 0;
      plannedForMeta = sched.map((l) =>
        this.toPlannedPaymentMeta(l, posCashSessionId, { isScheduled: true }),
      );
    } else {
      paymentStatus = PaymentStatus.PENDING;
      amountPaid = 0;
      plannedForMeta = [];
    }

    const methodSource = paid[0]?.paymentMethod;
    let paymentMethod: PaymentMethod | undefined;
    if (methodSource) {
      paymentMethod = this.mapUiPaymentMethod(String(methodSource));
    }

    return { paymentStatus, amountPaid, plannedPayments: plannedForMeta, paymentMethod };
  }

  async createPaymentChildren(opts: {
    host: { branchId: string; userId: string; supplierId: string };
    fiscalDocId: string;
    payment: SupplierDocumentPaymentPlanInput;
    paymentOrigin: string;
    posCashSessionId?: string | null;
  }): Promise<void> {
    const { payment, fiscalDocId, host, paymentOrigin, posCashSessionId } = opts;
    const paid = payment.paidLines;
    const sched = payment.scheduledLines;

    const totalPaymentLines =
      payment.mode === 'COMPLETED'
        ? paid.length
        : payment.mode === 'PARTIAL'
          ? paid.length + sched.length
          : payment.mode === 'PENDING_SCHEDULED'
            ? sched.length
            : 0;

    if (payment.mode === 'COMPLETED') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          host,
          fiscalDocId,
          line: paid[i],
          asDraft: false,
          note: `Pago documento (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines || paid.length,
          paymentOrigin,
          posCashSessionId,
        });
      }
      return;
    }

    if (payment.mode === 'PARTIAL') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          host,
          fiscalDocId,
          line: paid[i],
          asDraft: false,
          note: `Abono (${i + 1}/${paid.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines,
          paymentOrigin,
          posCashSessionId,
        });
      }
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          host,
          fiscalDocId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada (${i + 1}/${sched.length})`,
          installmentNumber: paid.length + i + 1,
          totalInstallments: totalPaymentLines,
          paymentOrigin,
          posCashSessionId,
        });
      }
      return;
    }

    if (payment.mode === 'PENDING_SCHEDULED') {
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          host,
          fiscalDocId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada (${i + 1}/${sched.length})`,
          installmentNumber: i + 1,
          totalInstallments: sched.length,
          paymentOrigin,
          posCashSessionId,
        });
      }
    }
  }

  private async createSupplierPaymentLine(opts: {
    host: { branchId: string; userId: string; supplierId: string };
    fiscalDocId: string;
    line: Record<string, unknown>;
    asDraft: boolean;
    note: string;
    installmentNumber?: number;
    totalInstallments?: number;
    paymentOrigin: string;
    posCashSessionId?: string | null;
  }): Promise<void> {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SUPPLIER_PAYMENT;
    if (opts.asDraft) {
      dto.transactionStatus = TransactionStatus.DRAFT;
    }
    dto.branchId = opts.host.branchId;
    dto.userId = opts.host.userId;
    dto.supplierId = opts.host.supplierId;
    dto.relatedTransactionId = opts.fiscalDocId;
    const amount = this.roundClp(opts.line.amount);
    dto.subtotal = amount;
    dto.discountAmount = 0;
    dto.taxAmount = 0;
    dto.total = amount;
    dto.amountPaid = opts.asDraft ? 0 : amount;
    dto.paymentStatus = opts.asDraft ? PaymentStatus.PENDING : PaymentStatus.PAID;
    dto.paymentDueDate = String(opts.line.dueDate || '').trim();

    const pm = String(opts.line.paymentMethod || '').toUpperCase();
    if (pm && ['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
      dto.paymentMethod = this.mapUiPaymentMethod(pm);
      if (pm === 'TRANSFER') {
        dto.bankAccountKey =
          opts.line.companyBankAccountKey != null
            ? String(opts.line.companyBankAccountKey).trim()
            : undefined;
      }
      if (pm === 'CHECK' && opts.line.companyBankAccountKey != null) {
        // Cartola al compensar el cheque, no al emitir.
        dto.metadata = {
          ...(dto.metadata ?? {}),
          checkBankAccountKey: String(opts.line.companyBankAccountKey).trim(),
        };
      }
      if (pm === 'CASH' && opts.line.cashHubId != null) {
        dto.cashHubId = String(opts.line.cashHubId).trim();
      }
    }

    dto.notes = opts.note;
    dto.metadata = {
      ...(dto.metadata ?? {}),
      origin: opts.paymentOrigin,
      installmentNumber: opts.installmentNumber ?? 1,
      totalInstallments: opts.totalInstallments ?? 1,
      supplierPaymentLine: this.toPlannedPaymentMeta(
        opts.line,
        opts.posCashSessionId,
        { isScheduled: opts.asDraft },
      ),
    };

    await this.transactionsService.createTransaction(dto);
  }

  private validatePaymentLine(
    l: Record<string, unknown>,
    label: string,
    opts?: { posCashSessionId?: string | null; isScheduledLine?: boolean },
  ): string | null {
    const due = typeof l.dueDate === 'string' ? l.dueDate.trim() : '';
    const amount = this.roundClp(l.amount);
    if (!due) return `${label}: fecha de vencimiento requerida.`;
    if (amount <= 0) return `${label}: monto inválido.`;
    if (opts?.isScheduledLine) {
      return null;
    }
    const pm = String(l.paymentMethod || '').toUpperCase();
    if (!['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
      return `${label}: medio de pago inválido.`;
    }
    if (pm === 'CASH') {
      const hub = typeof l.cashHubId === 'string' ? l.cashHubId.trim() : '';
      if (!hub) return `${label}: efectivo requiere centro de acopio.`;
    }
    if (pm === 'TRANSFER' || pm === 'CHECK') {
      const c = l.companyBankAccountKey;
      if (c == null || String(c).trim() === '') {
        return `${label}: transferencia/cheque requiere cuenta empresa.`;
      }
    }
    if (pm === 'CHECK') {
      const ch = l.chequeNumber;
      if (ch == null || String(ch).trim() === '') {
        return `${label}: cheque requiere número.`;
      }
    }
    if (pm === 'TRANSFER') {
      const s = l.supplierBankAccountKey;
      if (s == null || String(s).trim() === '') {
        return `${label}: transferencia requiere cuenta proveedor.`;
      }
    }
    return null;
  }

  private toPlannedPaymentMeta(
    line: Record<string, unknown>,
    _posCashSessionId?: string | null,
    opts?: { isScheduled?: boolean },
  ): Record<string, unknown> {
    const dueDate = String(line.dueDate || '').trim();
    const amount = this.roundClp(line.amount);
    const pm = String(line.paymentMethod || '').toUpperCase();
    if (opts?.isScheduled && !pm) {
      return { dueDate, amount };
    }
    return {
      dueDate,
      amount,
      ...(pm ? { paymentMethod: pm } : {}),
      companyBankAccountKey:
        pm === 'TRANSFER' || pm === 'CHECK'
          ? line.companyBankAccountKey != null
            ? String(line.companyBankAccountKey)
            : null
          : null,
      supplierBankAccountKey:
        pm === 'TRANSFER'
          ? line.supplierBankAccountKey != null
            ? String(line.supplierBankAccountKey)
            : null
          : null,
      chequeNumber:
        pm === 'CHECK' && line.chequeNumber != null
          ? String(line.chequeNumber).trim()
          : null,
      cashHubId:
        pm === 'CASH' && line.cashHubId != null
          ? String(line.cashHubId).trim()
          : null,
    };
  }

  private sumLineAmounts(lines: Record<string, unknown>[]): number {
    return lines.reduce((s, l) => s + this.roundClp(l.amount), 0);
  }

  private mapUiPaymentMethod(pm: string): PaymentMethod {
    const u = pm.toUpperCase();
    if (u === 'CASH') return PaymentMethod.CASH;
    if (u === 'CHECK') return PaymentMethod.CHECK;
    if (u === 'TRANSFER') return PaymentMethod.TRANSFER;
    return PaymentMethod.TRANSFER;
  }

  private roundClp(n: unknown): number {
    return Math.round(Number(n) || 0);
  }
}
