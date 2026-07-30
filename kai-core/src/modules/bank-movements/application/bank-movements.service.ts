import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';

@Injectable()
export class BankMovementsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async getOverview() {
    const { movements, bankAccountMap } = await this.buildMovementList();
    const recentMovements = movements.slice(0, 25);

    const now = new Date();
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);

    const monthMovements = movements.filter(
      (movement) =>
        new Date(movement.createdAt).getTime() >= monthStart.getTime(),
    );

    const incomingTotal = monthMovements
      .filter((movement) => movement.direction === 'IN')
      .reduce((acc, movement) => acc + Number(movement.total || 0), 0);

    const outgoingTotal = monthMovements
      .filter((movement) => movement.direction === 'OUT')
      .reduce((acc, movement) => acc + Number(movement.total || 0), 0);

    const bankAccountsBalance = Array.from(bankAccountMap.values()).reduce(
      (acc, account) => {
        const balance = Number(account.balance ?? 0);
        return Number.isFinite(balance) ? acc + balance : acc;
      },
      0,
    );

    const projectedBalance =
      bankAccountsBalance + incomingTotal - outgoingTotal;

    return {
      summary: {
        projectedBalance,
        incomingTotal,
        outgoingTotal,
      },
      monthMovements,
      recentMovements,
    };
  }

  async list() {
    const { movements } = await this.buildMovementList();
    return movements;
  }

  async create() {
    return { success: true };
  }

  private async buildMovementList() {
    const [transactions, bankAccountMap] = await Promise.all([
      this.transactionRepository.find({
        where: [
          { bankAccountKey: Not(IsNull()) },
          {
            transactionType: TransactionType.SALE,
            paymentMethod: PaymentMethod.TRANSFER,
          },
          {
            transactionType: TransactionType.PAYMENT_IN,
            paymentMethod: PaymentMethod.TRANSFER,
          },
        ],
        relations: {
          shareholder: { person: true },
          customer: { person: true },
          supplier: { person: true },
          employee: { person: true },
        },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
      this.loadBankAccountsMap(),
    ]);

    const movements = transactions.map((transaction) => {
      const movementKind = this.resolveMovementKind(transaction);
      const direction = this.resolveDirection(movementKind, transaction);
      const snapshots = getPaymentSnapshots(transaction);
      const transferSnapshot = snapshots.find(
        (s) =>
          String(s.method).toUpperCase() === PaymentMethod.TRANSFER &&
          s.bankAccountKey,
      );
      const bankAccountKey =
        transaction.bankAccountKey || transferSnapshot?.bankAccountKey || null;
      const accountInfo = bankAccountKey
        ? bankAccountMap.get(bankAccountKey)
        : undefined;
      const counterpartyName = this.resolveCounterpartyName(transaction);

      return {
        id: transaction.id,
        createdAt: transaction.createdAt,
        documentNumber: transaction.documentNumber,
        movementKind,
        direction,
        total: Number(transaction.total || 0),
        bankAccountKey,
        bankAccountLabel: accountInfo?.label ?? null,
        bankAccountNumber: accountInfo?.accountNumber ?? null,
        bankAccountBalance: accountInfo?.balance ?? null,
        counterpartyName: counterpartyName ?? null,
        notes: transaction.notes ?? null,
      };
    });

    return { movements, bankAccountMap };
  }

  private async loadBankAccountsMap() {
    const map = new Map<
      string,
      { label: string; accountNumber?: string | null; balance?: number | null }
    >();
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    const accounts = company?.bankAccounts ?? [];
    for (const account of accounts) {
      if (!account?.accountKey) {
        continue;
      }
      const parts: string[] = [];
      if (account.bankName) parts.push(account.bankName);
      if (account.accountType) parts.push(account.accountType);
      if (account.accountNumber) parts.push(account.accountNumber);
      const label = parts.length > 0 ? parts.join(' · ') : 'Cuenta bancaria';
      map.set(account.accountKey, {
        label,
        accountNumber: account.accountNumber ?? null,
        balance: account.currentBalance ?? null,
      });
    }

    return map;
  }

  private resolveMovementKind(transaction: Transaction): string {
    if (transaction.metadata?.capitalContribution) {
      return 'CAPITAL_CONTRIBUTION';
    }
    if (transaction.metadata?.bankToCashTransfer) {
      return 'BANK_TO_CASH_TRANSFER';
    }

    switch (transaction.transactionType) {
      case TransactionType.PAYMENT_IN:
        return 'CUSTOMER_PAYMENT';
      case TransactionType.PAYROLL_PAYMENT:
        return 'PAYROLL_PAYMENT';
      case TransactionType.SUPPLIER_PAYMENT:
        return 'SUPPLIER_PAYMENT';
      case TransactionType.EXPENSE_PAYMENT:
        return 'OPERATING_EXPENSE';
      case TransactionType.PAYMENT_EXECUTION:
        return 'SUPPLIER_PAYMENT';
      case TransactionType.OPERATING_EXPENSE:
        return 'OPERATING_EXPENSE';
      case TransactionType.CASH_DEPOSIT:
        return 'CASH_DEPOSIT';
      case TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER:
        return 'BANK_WITHDRAWAL_TO_SHAREHOLDER';
      case TransactionType.BANK_TO_CASH_TRANSFER:
        return 'BANK_TO_CASH_TRANSFER';
      default:
        return 'GENERAL';
    }
  }

  private resolveDirection(
    movementKind: string,
    transaction: Transaction,
  ): 'IN' | 'OUT' {
    switch (movementKind) {
      case 'CAPITAL_CONTRIBUTION':
      case 'CUSTOMER_PAYMENT':
      case 'CASH_DEPOSIT':
        return 'IN';
      case 'PAYROLL_PAYMENT':
      case 'SUPPLIER_PAYMENT':
      case 'OPERATING_EXPENSE':
      case 'BANK_WITHDRAWAL_TO_SHAREHOLDER':
      case 'BANK_TO_CASH_TRANSFER':
        return 'OUT';
      default:
        return Number(transaction.total || 0) >= 0 ? 'IN' : 'OUT';
    }
  }

  private resolveCounterpartyName(transaction: Transaction): string | null {
    const person =
      transaction.shareholder?.person ??
      transaction.customer?.person ??
      transaction.supplier?.person ??
      transaction.employee?.person ??
      null;

    if (!person) {
      return null;
    }

    const businessName = person.businessName?.trim();
    if (businessName) {
      return businessName;
    }

    return (
      [person.firstName, person.lastName].filter(Boolean).join(' ').trim() ||
      null
    );
  }
}
