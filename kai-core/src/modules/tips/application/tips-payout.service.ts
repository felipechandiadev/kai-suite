import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { tipAmountOpen, TipsService } from './tips.service';

export type TipPayoutLineInput = {
  employeeId: string;
  /** Monto a pagar (CLP). Si omitido, paga todo el open del empleado. */
  amount?: number;
};

@Injectable()
export class TipsPayoutService {
  private readonly logger = new Logger(TipsPayoutService.name);

  constructor(
    private readonly tipsService: TipsService,
    private readonly transactionsService: TransactionsService,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  /**
   * Crea TIP_PAYOUT (padre) + TIP_PAYOUT_LINE (hijas) y marca TipLedger PAID.
   */
  async createPayout(input: {
    lines: TipPayoutLineInput[];
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';
    companyBankAccountKey?: string | null;
    cashHubId?: string | null;
    notes?: string | null;
    userId?: string | null;
    branchId?: string | null;
  }): Promise<{
    parentTransactionId: string;
    total: number;
    lineCount: number;
  }> {
    const companyId = this.tipsService.requireCompanyId();
    if (!input.lines?.length) {
      throw new BadRequestException('Indica al menos un empleado a pagar');
    }

    const resolved: Array<{
      employeeId: string;
      amount: number;
      entryAmounts: Record<string, number>;
      entryIds: string[];
    }> = [];

    for (const line of input.lines) {
      const employeeId = String(line.employeeId || '').trim();
      if (!employeeId) continue;
      const entries = await this.tipsService.listOpenEntriesForEmployee(
        companyId,
        employeeId,
      );
      if (entries.length === 0) {
        throw new BadRequestException(
          `Empleado ${employeeId} no tiene propinas abiertas atribuidas`,
        );
      }
      const openTotal = entries.reduce((a, e) => a + tipAmountOpen(e), 0);
      const want =
        line.amount != null
          ? Math.max(0, Math.round(Number(line.amount) || 0))
          : Math.round(openTotal);
      if (want <= 0) continue;
      if (want > openTotal + 0.01) {
        throw new BadRequestException(
          `Monto ${want} supera el saldo abierto ${Math.round(openTotal)} del empleado`,
        );
      }

      let remaining = want;
      const entryAmounts: Record<string, number> = {};
      const entryIds: string[] = [];
      for (const e of entries) {
        if (remaining <= 0) break;
        const open = tipAmountOpen(e);
        const take = Math.min(open, remaining);
        if (take <= 0) continue;
        entryAmounts[e.id] = take;
        entryIds.push(e.id);
        remaining -= take;
      }
      resolved.push({
        employeeId,
        amount: want,
        entryAmounts,
        entryIds,
      });
    }

    if (resolved.length === 0) {
      throw new BadRequestException('No hay montos a pagar');
    }

    const total = resolved.reduce((a, r) => a + r.amount, 0);
    const userId =
      input.userId?.trim() ||
      TenantContext.getUserId()?.trim() ||
      '';
    if (!userId) {
      throw new BadRequestException('Usuario requerido para el pago');
    }

    let branchId = input.branchId?.trim() || '';
    if (!branchId) {
      const branch = await this.branchRepo.findOne({
        where: { companyId, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      branchId = branch?.id ?? '';
    }
    if (!branchId) {
      throw new BadRequestException('Sucursal requerida para el pago');
    }

    const parentDto = new CreateTransactionDto();
    parentDto.transactionType = TransactionType.TIP_PAYOUT;
    parentDto.branchId = branchId;
    parentDto.userId = userId;
    parentDto.subtotal = total;
    parentDto.taxAmount = 0;
    parentDto.discountAmount = 0;
    parentDto.total = total;
    parentDto.amountPaid = total;
    parentDto.paymentStatus = PaymentStatus.PAID;
    parentDto.transactionStatus = TransactionStatus.COMPLETED;
    parentDto.notes = input.notes?.trim() || 'Pago de propinas';
    parentDto.metadata = {
      origin: 'TIP_PAYOUT',
      lineCount: resolved.length,
      kind: 'TIP_PAYOUT',
    };

    const pm = String(input.paymentMethod || 'TRANSFER').toUpperCase();
    if (pm === 'CASH') parentDto.paymentMethod = PaymentMethod.CASH;
    else if (pm === 'CHECK') parentDto.paymentMethod = PaymentMethod.CHECK;
    else parentDto.paymentMethod = PaymentMethod.TRANSFER;

    if (pm === 'TRANSFER' || pm === 'CHECK') {
      parentDto.bankAccountKey =
        input.companyBankAccountKey?.trim() || undefined;
    }
    if (pm === 'CASH' && input.cashHubId) {
      parentDto.cashHubId = String(input.cashHubId).trim();
    }

    const parent = await this.transactionsService.createTransaction(parentDto);
    const parentId = parent.id;

    for (const line of resolved) {
      const childDto = new CreateTransactionDto();
      childDto.transactionType = TransactionType.TIP_PAYOUT_LINE;
      childDto.branchId = branchId;
      childDto.userId = userId;
      childDto.employeeId = line.employeeId;
      childDto.relatedTransactionId = parentId;
      childDto.subtotal = line.amount;
      childDto.taxAmount = 0;
      childDto.discountAmount = 0;
      childDto.total = line.amount;
      childDto.amountPaid = line.amount;
      childDto.paymentStatus = PaymentStatus.PAID;
      childDto.transactionStatus = TransactionStatus.COMPLETED;
      childDto.paymentMethod = parentDto.paymentMethod;
      childDto.bankAccountKey = parentDto.bankAccountKey;
      childDto.cashHubId = parentDto.cashHubId;
      childDto.metadata = {
        origin: 'TIP_PAYOUT_LINE',
        tipPayoutId: parentId,
        tipLedgerEntryIds: line.entryIds,
      };
      await this.transactionsService.createTransaction(childDto);

      await this.tipsService.applyPayoutToEntries({
        entryIds: line.entryIds,
        amountsByEntryId: line.entryAmounts,
        payoutTransactionId: parentId,
      });
    }

    this.logger.log(
      `TIP_PAYOUT ${parentId} total=${total} lines=${resolved.length}`,
    );

    return {
      parentTransactionId: parentId,
      total,
      lineCount: resolved.length,
    };
  }
}
