import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { Check, CheckDirection, CheckStatus } from '../domain/check.entity';
import { OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE } from '@modules/ledger-entries/application/outgoing-payment-credit-account.util';
import { resolveAccountIdByCode } from '@modules/ledger-entries/application/sale-payment-debits.util';

type CheckLedgerPhase =
  | 'OUTGOING_CLEARED'
  | 'OUTGOING_CLEAR_REVERSED'
  | 'OUTGOING_ISSUED_REVERSED';

function resolveLiabilityAccountId(
  txType: TransactionType,
  map: Map<string, string>,
): string | null {
  const codes: string[] =
    txType === TransactionType.PAYROLL_PAYMENT
      ? ['2.2.01', '2201']
      : txType === TransactionType.EXPENSE_PAYMENT
        ? ['5201', '5.2.03', '5.2.01']
        : ['2.1.01', '2101'];
  for (const code of codes) {
    const id = resolveAccountIdByCode(code, map) ?? map.get(code);
    if (id) return id;
  }
  return null;
}

@Injectable()
export class CheckLedgerService {
  private readonly logger = new Logger(CheckLedgerService.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(AccountingAccount)
    private readonly accountRepo: Repository<AccountingAccount>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async postOutgoingCleared(check: Check): Promise<void> {
    if (check.direction !== CheckDirection.OUTGOING || !check.transactionId) {
      return;
    }
    if (await this.hasPhase(check.transactionId, 'OUTGOING_CLEARED')) {
      return;
    }

    const tx = await this.txRepo.findOne({
      where: { id: check.transactionId },
    });
    if (!tx) return;

    const map = await this.accountMapForCompany(check.companyId);
    const payableId = resolveAccountIdByCode(
      OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE,
      map,
    );
    const bankId = resolveAccountIdByCode('1.1.02', map);
    if (!payableId || !bankId) {
      this.logger.warn(
        `[check-ledger] Missing accounts for OUTGOING_CLEARED check=${check.id}`,
      );
      return;
    }

    const amount = Math.abs(Number(check.amount) || 0);
    if (amount < 0.01) return;

    const entryDate = check.clearedDate
      ? new Date(`${check.clearedDate}T12:00:00`)
      : new Date();
    const desc = `Compensación cheque ${check.checkNumber} (${check.bankName})`;

    await this.persistPair({
      companyId: check.companyId,
      transactionId: check.transactionId,
      entryDate,
      amount,
      debitAccountId: payableId,
      creditAccountId: bankId,
      description: desc,
      phase: 'OUTGOING_CLEARED',
      checkId: check.id,
    });
  }

  async reverseOutgoingCheck(
    check: Check,
    previousStatus: CheckStatus,
  ): Promise<void> {
    if (check.direction !== CheckDirection.OUTGOING || !check.transactionId) {
      return;
    }

    if (previousStatus === CheckStatus.CLEARED) {
      await this.reversePhase(check, 'OUTGOING_CLEARED', 'OUTGOING_CLEAR_REVERSED');
    }

    await this.reverseIssuedPayment(check);
  }

  private async reverseIssuedPayment(check: Check): Promise<void> {
    if (
      await this.hasPhase(check.transactionId!, 'OUTGOING_ISSUED_REVERSED')
    ) {
      return;
    }

    const tx = await this.txRepo.findOne({
      where: { id: check.transactionId! },
    });
    if (!tx) return;

    const map = await this.accountMapForCompany(check.companyId);
    const payableId = resolveAccountIdByCode(
      OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE,
      map,
    );
    const liabilityId = resolveLiabilityAccountId(tx.transactionType, map);
    if (!payableId || !liabilityId) {
      this.logger.warn(
        `[check-ledger] Missing accounts to reverse issued check=${check.id}`,
      );
      return;
    }

    const amount = Math.abs(Number(check.amount) || Number(tx.total) || 0);
    if (amount < 0.01) return;

    const desc = `Reverso emisión cheque ${check.checkNumber}`;
    await this.persistPair({
      companyId: check.companyId,
      transactionId: check.transactionId!,
      entryDate: new Date(),
      amount,
      debitAccountId: payableId,
      creditAccountId: liabilityId,
      description: desc,
      phase: 'OUTGOING_ISSUED_REVERSED',
      checkId: check.id,
    });
  }

  private async reversePhase(
    check: Check,
    fromPhase: CheckLedgerPhase,
    toPhase: CheckLedgerPhase,
  ): Promise<void> {
    if (await this.hasPhase(check.transactionId!, toPhase)) {
      return;
    }

    const rows = await this.ledgerRepo.find({
      where: { transactionId: check.transactionId! },
    });
    const originals = rows.filter(
      (r) => (r.metadata as any)?.checkLedgerPhase === fromPhase,
    );
    if (originals.length === 0) {
      return;
    }

    const reversals = originals.map((row) =>
      this.ledgerRepo.create({
        companyId: check.companyId,
        transactionId: check.transactionId!,
        accountId: row.accountId,
        personId: row.personId ?? null,
        entryDate: new Date(),
        description: `Reverso: ${row.description}`,
        debit: Number(row.credit) || 0,
        credit: Number(row.debit) || 0,
        metadata: {
          checkLedgerPhase: toPhase,
          checkId: check.id,
          reversesEntryId: row.id,
        },
      }),
    );
    await this.ledgerRepo.save(reversals);
  }

  private async persistPair(params: {
    companyId: string;
    transactionId: string;
    entryDate: Date;
    amount: number;
    debitAccountId: string;
    creditAccountId: string;
    description: string;
    phase: CheckLedgerPhase;
    checkId: string;
  }): Promise<void> {
    const {
      companyId,
      transactionId,
      entryDate,
      amount,
      debitAccountId,
      creditAccountId,
      description,
      phase,
      checkId,
    } = params;

    await this.ledgerRepo.save([
      this.ledgerRepo.create({
        companyId,
        transactionId,
        accountId: debitAccountId,
        entryDate,
        description,
        debit: amount,
        credit: 0,
        metadata: { checkLedgerPhase: phase, checkId },
      }),
      this.ledgerRepo.create({
        companyId,
        transactionId,
        accountId: creditAccountId,
        entryDate,
        description,
        debit: 0,
        credit: amount,
        metadata: { checkLedgerPhase: phase, checkId },
      }),
    ]);
  }

  private async hasPhase(
    transactionId: string,
    phase: CheckLedgerPhase,
  ): Promise<boolean> {
    const rows = await this.ledgerRepo.find({ where: { transactionId } });
    return rows.some((r) => (r.metadata as any)?.checkLedgerPhase === phase);
  }

  private async accountMapForCompany(
    companyId: string,
  ): Promise<Map<string, string>> {
    const accounts = await this.accountRepo.find({ where: { companyId } });
    return new Map(accounts.map((a) => [a.code, a.id]));
  }
}
