import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankMovement } from '@modules/bank-movements/domain/bank-movement.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Check, CheckDirection } from '../domain/check.entity';

const CHECK_MARKER = (checkId: string) => `[check:${checkId}]`;

/**
 * Publica el impacto en cartola bancaria (Tesorería → Banco) al compensar
 * o revertir un cheque.
 *
 * La grilla de cartola lista transacciones con `bankAccountKey`. Al emitir
 * con cheque el haber contable va a "cheques por pagar"; el banco (y la
 * cartola) solo se tocan al CLEARED.
 */
@Injectable()
export class CheckBankCartolaService {
  private readonly logger = new Logger(CheckBankCartolaService.name);

  constructor(
    @InjectRepository(BankMovement)
    private readonly movements: Repository<BankMovement>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async postCleared(check: Check): Promise<void> {
    const accountKey = await this.resolveAccountKey(check);
    if (!accountKey) {
      this.logger.warn(
        `[check-cartola] Missing bankAccountKey for CLEARED check=${check.id}`,
      );
      return;
    }
    if (!check.transactionId) {
      this.logger.warn(
        `[check-cartola] Missing transactionId for CLEARED check=${check.id}`,
      );
      return;
    }

    const direction: 'IN' | 'OUT' =
      check.direction === CheckDirection.OUTGOING ? 'OUT' : 'IN';
    const amount = Math.abs(Number(check.amount) || 0);
    if (amount < 0.01) return;

    await this.ensureBankMovement(check, direction, amount, accountKey);
    await this.applyBankAccountKeyOnPayment(check.transactionId, accountKey);
  }

  async reverseCleared(check: Check): Promise<void> {
    const accountKey = await this.resolveAccountKey(check);
    if (!check.transactionId) return;

    await this.removeBankMovement(check);
    await this.clearBankAccountKeyIfOwned(check.transactionId, accountKey);
  }

  private async resolveAccountKey(check: Check): Promise<string | null> {
    const fromCheck = check.bankAccountKey?.trim();
    if (fromCheck) return fromCheck;

    if (!check.transactionId) return null;
    const tx = await this.transactions.findOne({
      where: { id: check.transactionId },
    });
    if (!tx) return null;

    const fromTx = tx.bankAccountKey?.trim();
    if (fromTx) return fromTx;

    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    const checkData = meta.checkData as Record<string, unknown> | undefined;
    const fromMeta =
      (typeof checkData?.bankAccountKey === 'string' &&
        checkData.bankAccountKey.trim()) ||
      (typeof meta.checkBankAccountKey === 'string' &&
        meta.checkBankAccountKey.trim()) ||
      null;
    return fromMeta || null;
  }

  private async ensureBankMovement(
    check: Check,
    direction: 'IN' | 'OUT',
    amount: number,
    accountKey: string,
  ): Promise<void> {
    const marker = CHECK_MARKER(check.id);
    const existing = await this.movements.find({
      where: { transactionId: check.transactionId! },
    });
    if (existing.some((m) => (m.description ?? '').includes(marker))) {
      return;
    }

    const label =
      direction === 'OUT'
        ? `Compensación cheque ${check.checkNumber} (${check.bankName})`
        : `Cobro cheque ${check.checkNumber} (${check.bankName})`;

    await this.movements.save(
      this.movements.create({
        companyId: check.companyId,
        transactionId: check.transactionId!,
        direction,
        bankAccount: accountKey,
        amount,
        description: `${label} ${marker}`,
      }),
    );
  }

  private async removeBankMovement(check: Check): Promise<void> {
    if (!check.transactionId) return;
    const marker = CHECK_MARKER(check.id);
    const rows = await this.movements.find({
      where: { transactionId: check.transactionId },
    });
    const toRemove = rows.filter((m) =>
      (m.description ?? '').includes(marker),
    );
    if (toRemove.length > 0) {
      await this.movements.remove(toRemove);
    }
  }

  private async applyBankAccountKeyOnPayment(
    transactionId: string,
    accountKey: string,
  ): Promise<void> {
    const tx = await this.transactions.findOne({ where: { id: transactionId } });
    if (!tx) return;
    if (tx.bankAccountKey?.trim() === accountKey) return;

    const metadata = {
      ...(tx.metadata ?? {}),
      checkClearedBankAccountKey: accountKey,
    };
    await this.transactions.update(transactionId, {
      bankAccountKey: accountKey,
      metadata: metadata as any,
    });
  }

  private async clearBankAccountKeyIfOwned(
    transactionId: string,
    accountKey: string | null,
  ): Promise<void> {
    const tx = await this.transactions.findOne({ where: { id: transactionId } });
    if (!tx) return;
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    const clearedKey =
      typeof meta.checkClearedBankAccountKey === 'string'
        ? meta.checkClearedBankAccountKey.trim()
        : null;
    if (!clearedKey) return;
    if (accountKey && tx.bankAccountKey?.trim() !== accountKey) return;

    const nextMeta = { ...meta };
    delete nextMeta.checkClearedBankAccountKey;
    await this.transactions.update(transactionId, {
      bankAccountKey: null as any,
      metadata: nextMeta as any,
    });
  }
}
