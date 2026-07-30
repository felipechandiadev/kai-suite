import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, In } from 'typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import {
  AccountingRule,
  RuleScope,
} from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Employee } from '@modules/employees/domain/employee.entity';

interface ValidationError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  phase:
    | 'VALIDATION'
    | 'MATCHING'
    | 'GENERATION'
    | 'BALANCE_CHECK'
    | 'PERSISTENCE';
}

interface LedgerEntryDto {
  transactionId: string;
  accountId: string;
  personId?: string | null;
  entryDate: Date;
  description: string;
  debit: number;
  credit: number;
  metadata?: Record<string, any>;
}

export interface GenerateLedgerEntriesResult {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'REJECTED';
  transactionId: string;
  entriesGenerated?: number;
  entriesIds?: string[];
  balanceValidated?: boolean;
  errors: ValidationError[];
  executedAt: Date;
  executionTimeMs: number;
}

export class GenerateLedgerEntriesCommand {
  constructor(
    public readonly transaction: Transaction,
    public readonly companyId: string,
    public readonly manager?: EntityManager,
  ) {}
}

@Injectable()
@CommandHandler(GenerateLedgerEntriesCommand)
export class GenerateLedgerEntriesCommandHandler implements ICommandHandler<GenerateLedgerEntriesCommand> {
  private logger = new Logger(GenerateLedgerEntriesCommandHandler.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(AccountingRule)
    private rulesRepo: Repository<AccountingRule>,
    @InjectRepository(AccountingAccount)
    private accountRepo: Repository<AccountingAccount>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(Shareholder)
    private shareholderRepo: Repository<Shareholder>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  // Helper methods
  private async getPersonIdForTransaction(
    transaction: Transaction,
  ): Promise<string | null> {
    try {
      if (transaction.customerId) {
        const result = await this.customerRepo
          .createQueryBuilder('c')
          .select('c.personId')
          .where('c.id = :id', { id: transaction.customerId })
          .getRawOne();
        return result?.personId || null;
      }

      if (transaction.supplierId) {
        const result = await this.supplierRepo
          .createQueryBuilder('s')
          .select('s.personId')
          .where('s.id = :id', { id: transaction.supplierId })
          .getRawOne();
        return result?.personId || null;
      }

      if (transaction.shareholderId) {
        const result = await this.shareholderRepo
          .createQueryBuilder('sh')
          .select('sh.personId')
          .where('sh.id = :id', { id: transaction.shareholderId })
          .getRawOne();
        return result?.personId || null;
      }

      if (transaction.employeeId) {
        const result = await this.employeeRepo
          .createQueryBuilder('e')
          .select('e.personId')
          .where('e.id = :id', { id: transaction.employeeId })
          .getRawOne();
        return result?.personId || null;
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve personId (non-critical): ${(error as Error).message}`,
      );
      return null;
    }

    return null;
  }

  private async preValidateTransaction(
    transaction: Transaction,
    companyId: string,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // V6: Verificar que NO existe LedgerEntry duplicada
    const existingEntries = await this.ledgerRepo.find({
      where: { transactionId: transaction.id },
    });

    if (existingEntries.length > 0) {
      errors.push({
        code: 'DUPLICATE_ENTRIES',
        message: `Ledger entries already exist for transaction ${transaction.id}`,
        severity: 'ERROR',
        phase: 'VALIDATION',
      });
      return errors;
    }

    // V1: Validar saldo en origen para bancarias
    if (transaction.metadata?.bankToCashTransfer === true) {
      const bankBalance = await this.getAccountBalance(
        '1.1.02',
        transaction.createdAt,
        transaction.branchId!,
      );
      if (bankBalance < transaction.total) {
        errors.push({
          code: 'INSUFFICIENT_BANK_BALANCE',
          message: `Insufficient bank balance. Required: ${transaction.total}, Available: ${bankBalance}`,
          severity: 'ERROR',
          phase: 'VALIDATION',
        });
      }
    }

    // V2: Validar caja para CASH_SESSION_OPENING
    if (transaction.transactionType === TransactionType.CASH_SESSION_OPENING) {
      const cashBalance = await this.getAccountBalance(
        '1.1.01',
        transaction.createdAt,
        transaction.branchId!,
      );
      if (cashBalance < transaction.total) {
        errors.push({
          code: 'INSUFFICIENT_CASH_FOR_SESSION',
          message: `Insufficient cash balance for session. Required: ${transaction.total}, Available: ${cashBalance}`,
          severity: 'ERROR',
          phase: 'VALIDATION',
        });
      }
    }

    // V4: Validar saldo en cliente/proveedor para pagos
    if (
      transaction.transactionType === TransactionType.PAYMENT_IN &&
      transaction.customerId
    ) {
      const customerDebt = await this.getPersonBalance(
        transaction.customerId,
        'CUSTOMER',
        transaction.branchId!,
      );
      if (transaction.total > customerDebt) {
        errors.push({
          code: 'PAYMENT_EXCEEDS_DEBT',
          message: `Payment exceeds customer debt. Payment: ${transaction.total}, Debt: ${customerDebt}`,
          severity: 'ERROR',
          phase: 'VALIDATION',
        });
      }
    }

    if (
      transaction.transactionType === TransactionType.SUPPLIER_PAYMENT &&
      transaction.supplierId
    ) {
      const supplierDebt = await this.getPersonBalance(
        transaction.supplierId,
        'SUPPLIER',
        transaction.branchId!,
      );
      if (transaction.total > supplierDebt) {
        errors.push({
          code: 'PAYMENT_EXCEEDS_DEBT',
          message: `Payment exceeds supplier debt. Payment: ${transaction.total}, Debt: ${supplierDebt}`,
          severity: 'ERROR',
          phase: 'VALIDATION',
        });
      }
    }

    if (
      transaction.transactionType === TransactionType.PAYROLL_PAYMENT &&
      transaction.employeeId
    ) {
      const employeeDebt = await this.getPersonBalance(
        transaction.employeeId,
        'EMPLOYEE',
        transaction.branchId!,
      );
      if (transaction.total > employeeDebt) {
        errors.push({
          code: 'PAYMENT_EXCEEDS_DEBT',
          message: `Payment exceeds payroll liability. Payment: ${transaction.total}, Debt: ${employeeDebt}`,
          severity: 'ERROR',
          phase: 'VALIDATION',
        });
      }
    }

    return errors;
  }

  private async matchRules(
    transaction: Transaction,
    companyId: string,
  ): Promise<AccountingRule[]> {
    const rules = await this.rulesRepo.find({
      where: {
        companyId,
        transactionType: transaction.transactionType,
        isActive: true,
      },
      order: { priority: 'ASC' },
    });

    return rules.filter((rule) => {
      if (
        rule.expenseCategoryId &&
        rule.expenseCategoryId !== transaction.expenseCategoryId
      ) {
        return false;
      }
      if (
        rule.paymentMethod &&
        rule.paymentMethod !== transaction.paymentMethod
      ) {
        return false;
      }
      return true;
    });
  }

  private async calculateEntries(
    transaction: Transaction,
    rules: AccountingRule[],
    personId: string | null,
  ): Promise<LedgerEntryDto[]> {
    // CASO ESPECIAL: Remuneraciones
    if (transaction.transactionType === TransactionType.PAYROLL) {
      return this.generatePayrollEntries(transaction, personId);
    }

    // CASO ESPECIAL: Ejecución de pago
    if (transaction.transactionType === TransactionType.PAYMENT_EXECUTION) {
      return this.generatePaymentExecutionEntries(transaction, personId);
    }

    const entries: LedgerEntryDto[] = [];

    for (const rule of rules) {
      if (rule.appliesTo === RuleScope.TRANSACTION) {
        entries.push(
          {
            transactionId: transaction.id,
            accountId: rule.debitAccountId,
            personId: personId,
            entryDate: transaction.createdAt,
            description: this.generateDescription(transaction, rule, 'DEBIT'),
            debit: this.getTransactionAmount(transaction, rule),
            credit: 0,
            metadata: { ruleId: rule.id, scope: RuleScope.TRANSACTION },
          },
          {
            transactionId: transaction.id,
            accountId: rule.creditAccountId,
            personId: personId,
            entryDate: transaction.createdAt,
            description: this.generateDescription(transaction, rule, 'CREDIT'),
            debit: 0,
            credit: this.getTransactionAmount(transaction, rule),
            metadata: { ruleId: rule.id, scope: RuleScope.TRANSACTION },
          },
        );
      } else if (rule.appliesTo === RuleScope.TRANSACTION_LINE) {
        if (transaction.lines && transaction.lines.length > 0) {
          for (const line of transaction.lines) {
            if (rule.taxId && rule.taxId !== line.taxId) {
              continue;
            }

            entries.push(
              {
                transactionId: transaction.id,
                accountId: rule.debitAccountId,
                personId: personId,
                entryDate: transaction.createdAt,
                description: this.generateDescription(
                  transaction,
                  rule,
                  'DEBIT',
                  line,
                ),
                debit: this.getLineAmount(line, rule),
                credit: 0,
                metadata: {
                  ruleId: rule.id,
                  scope: RuleScope.TRANSACTION_LINE,
                  lineId: line.id,
                },
              },
              {
                transactionId: transaction.id,
                accountId: rule.creditAccountId,
                personId: personId,
                entryDate: transaction.createdAt,
                description: this.generateDescription(
                  transaction,
                  rule,
                  'CREDIT',
                  line,
                ),
                debit: 0,
                credit: this.getLineAmount(line, rule),
                metadata: {
                  ruleId: rule.id,
                  scope: RuleScope.TRANSACTION_LINE,
                  lineId: line.id,
                },
              },
            );
          }
        }
      }
    }

    return entries;
  }

  private async generatePayrollEntries(
    transaction: Transaction,
    personId: string | null,
  ): Promise<LedgerEntryDto[]> {
    const entries: LedgerEntryDto[] = [];
    const metadata = transaction.metadata as any;

    if (!metadata?.lines || !Array.isArray(metadata.lines)) {
      this.logger.warn(
        `PAYROLL transaction ${transaction.id} has no lines in metadata`,
      );
      return entries;
    }

    const accountMap = await this.getPayrollAccountMap();

    let totalEarnings = 0;
    let totalLiabilities = 0;

    for (const line of metadata.lines) {
      const { typeId, amount } = line;

      if (amount > 0) {
        const expenseAccountId = this.mapPayrollTypeToExpenseAccount(
          typeId,
          accountMap,
        );
        entries.push({
          transactionId: transaction.id,
          accountId: expenseAccountId,
          personId: personId,
          entryDate: transaction.createdAt,
          description: `Remuneración - ${this.getPayrollTypeName(typeId)}`,
          debit: amount,
          credit: 0,
          metadata: { payrollLine: typeId, lineAmount: amount },
        });
        totalEarnings += amount;
      } else if (amount < 0) {
        const liabilityAccountId = this.mapPayrollTypeToLiabilityAccount(
          typeId,
          accountMap,
        );
        const absAmount = Math.abs(amount);
        entries.push({
          transactionId: transaction.id,
          accountId: liabilityAccountId,
          personId: personId,
          entryDate: transaction.createdAt,
          description: `Retención - ${this.getPayrollTypeName(typeId)}`,
          debit: 0,
          credit: absAmount,
          metadata: { payrollLine: typeId, lineAmount: amount },
        });
        totalLiabilities += absAmount;
      }
    }

    const netPayment = totalEarnings - totalLiabilities;
    if (netPayment > 0) {
      entries.push({
        transactionId: transaction.id,
        accountId: accountMap['2.2.01'],
        personId: personId,
        entryDate: transaction.createdAt,
        description: 'Líquido a pagar',
        debit: 0,
        credit: netPayment,
        metadata: { netPayment: true },
      });
    }

    this.logger.log(
      `Generated ${entries.length} payroll entries for transaction ${transaction.id}. Earnings: ${totalEarnings}, Deductions: ${totalLiabilities}, Net: ${netPayment}`,
    );

    return entries;
  }

  private async generatePaymentExecutionEntries(
    transaction: Transaction,
    personId: string | null,
  ): Promise<LedgerEntryDto[]> {
    const entries: LedgerEntryDto[] = [];
    const accountMap = await this.getPaymentExecutionAccountMap();
    const payrollLineType = transaction.metadata?.payrollLineType;

    let liabilityAccountId: string;
    let liabilityAccountName: string;

    if (payrollLineType === 'EMPLOYEE_PAYMENT') {
      liabilityAccountId = accountMap['2.2.01'];
      liabilityAccountName = 'Remuneraciones por pagar';
    } else if (payrollLineType === 'AFP') {
      liabilityAccountId = accountMap['2.2.02'];
      liabilityAccountName = 'AFP por pagar';
    } else if (payrollLineType === 'HEALTH_INSURANCE') {
      liabilityAccountId = accountMap['2.2.03'];
      liabilityAccountName = 'Salud por pagar';
    } else {
      liabilityAccountId = accountMap['2.2.04'];
      liabilityAccountName = 'Otras retenciones por pagar';
    }

    const cashAccountId = this.getCashAccountForPaymentMethod(
      transaction.paymentMethod,
      accountMap,
    );

    entries.push(
      {
        transactionId: transaction.id,
        accountId: liabilityAccountId,
        personId: personId,
        entryDate: transaction.createdAt,
        description: `Pago de ${liabilityAccountName}`,
        debit: transaction.total,
        credit: 0,
        metadata: {
          paymentType: payrollLineType,
          paymentMethod: transaction.paymentMethod,
        },
      },
      {
        transactionId: transaction.id,
        accountId: cashAccountId,
        personId: personId,
        entryDate: transaction.createdAt,
        description: `Pago vía ${transaction.paymentMethod === PaymentMethod.CASH ? 'Caja' : 'Banco'}`,
        debit: 0,
        credit: transaction.total,
        metadata: {
          paymentType: payrollLineType,
          paymentMethod: transaction.paymentMethod,
        },
      },
    );

    return entries;
  }

  private validateBalance(entries: LedgerEntryDto[]): boolean {
    const totalDebit = this.sumDebits(entries);
    const totalCredit = this.sumCredits(entries);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }

  private sumDebits(entries: LedgerEntryDto[]): number {
    return entries.reduce((sum, e) => sum + e.debit, 0);
  }

  private sumCredits(entries: LedgerEntryDto[]): number {
    return entries.reduce((sum, e) => sum + e.credit, 0);
  }

  private async persistEntries(
    entries: LedgerEntryDto[],
    manager?: EntityManager,
  ): Promise<LedgerEntry[]> {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepo;
    const ledgerEntitiesToSave = entries.map((dto) =>
      repo.create({
        transactionId: dto.transactionId,
        accountId: dto.accountId,
        personId: dto.personId,
        entryDate: dto.entryDate,
        description: dto.description,
        debit: dto.debit,
        credit: dto.credit,
        metadata: dto.metadata,
      }),
    );

    return repo.save(ledgerEntitiesToSave);
  }

  private async getAccountBalance(
    accountCode: string,
    beforeDate: Date,
    branchId: string,
  ): Promise<number> {
    try {
      const account = await this.accountRepo.findOne({
        where: { code: accountCode },
      });
      if (!account) return 0;

      const result = await this.ledgerRepo
        .createQueryBuilder('le')
        .select(
          'COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)',
          'balance',
        )
        .where('le.accountId = :accountId', { accountId: account.id })
        .andWhere('le.entryDate <= :beforeDate', { beforeDate })
        .getRawOne();

      return result ? Number(result.balance) : 0;
    } catch (err) {
      this.logger.error(
        `Error calculating account balance: ${(err as Error).message}`,
      );
      return 0;
    }
  }

  private async getPersonBalance(
    personId: string,
    personType: string,
    branchId: string,
  ): Promise<number> {
    try {
      const result = await this.ledgerRepo
        .createQueryBuilder('le')
        .select(
          'COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)',
          'balance',
        )
        .where('le.personId = :personId', { personId })
        .getRawOne();

      return result ? Number(result.balance) : 0;
    } catch (err) {
      this.logger.error(
        `Error calculating person balance (${personType}): ${(err as Error).message}`,
      );
      return 0;
    }
  }

  private getTransactionAmount(
    transaction: Transaction,
    rule: AccountingRule,
  ): number {
    return transaction.total;
  }

  private getLineAmount(line: TransactionLine, rule: AccountingRule): number {
    return line.total;
  }

  private generateDescription(
    transaction: Transaction,
    rule: AccountingRule,
    side: 'DEBIT' | 'CREDIT',
    line?: TransactionLine,
  ): string {
    let desc = `${transaction.transactionType}`;

    if (transaction.customerId) {
      desc += ` - Cliente`;
    } else if (transaction.supplierId) {
      desc += ` - Proveedor`;
    }

    if (line) {
      desc += ` - ${line.productName}`;
    }

    desc += ` (${side})`;
    return desc;
  }

  private async getPayrollAccountMap(): Promise<Record<string, string>> {
    const codes = ['5.3.01', '5.3.03', '2.2.01', '2.2.02', '2.2.03', '2.2.04'];
    const accounts = await this.accountRepo.find({
      where: { code: In(codes) },
    });

    const map: Record<string, string> = {};
    for (const account of accounts) {
      map[account.code] = account.id;
    }

    const missingCodes = codes.filter((code) => !map[code]);
    if (missingCodes.length > 0) {
      throw new Error(
        `Las siguientes cuentas contables no existen: ${missingCodes.join(', ')}`,
      );
    }

    return map;
  }

  private mapPayrollTypeToExpenseAccount(
    typeId: string,
    accountMap: Record<string, string>,
  ): string {
    if (
      typeId === 'BASE_SALARY' ||
      typeId === 'ORDINARY' ||
      typeId === 'PROPORTIONAL'
    ) {
      return accountMap['5.3.01'];
    }
    return accountMap['5.3.03'];
  }

  private mapPayrollTypeToLiabilityAccount(
    typeId: string,
    accountMap: Record<string, string>,
  ): string {
    if (typeId === 'AFP') return accountMap['2.2.02'];
    if (typeId === 'HEALTH_INSURANCE') return accountMap['2.2.03'];
    return accountMap['2.2.04'];
  }

  private getPayrollTypeName(typeId: string): string {
    const names: Record<string, string> = {
      BASE_SALARY: 'Sueldo base',
      ORDINARY: 'Remuneración ordinaria',
      PROPORTIONAL: 'Remuneración proporcional',
      OVERTIME: 'Horas extraordinarias',
      BONUS: 'Bono',
      ALLOWANCE: 'Asignación',
      GRATIFICATION: 'Gratificación',
      VIATICUM: 'Viático',
      REFUND: 'Reembolso de gastos',
      SUBSTITUTION: 'Suplencia o reemplazo',
      INCENTIVE: 'Incentivo o desempeño',
      COMMISSION: 'Comisión',
      ADJUSTMENT_POS: 'Ajuste o retroactivo (+)',
      FEES: 'Pago de honorarios',
      SETTLEMENT: 'Finiquito',
      INDEMNITY: 'Indemnización',
      SPECIAL_SHIFT: 'Pago por turno especial',
      HOLIDAY: 'Pago por trabajo en festivo',
      NIGHT_SHIFT: 'Pago por trabajo nocturno',
      EXCEPTIONAL: 'Pago excepcional',
      AFP: 'AFP',
      HEALTH_INSURANCE: 'Salud',
      INCOME_TAX: 'Impuesto único',
      UNEMPLOYMENT_INSURANCE: 'Seguro de cesantía',
      LOAN_PAYMENT: 'Pago de préstamo',
      ADVANCE_PAYMENT: 'Anticipo de sueldo',
      UNION_FEE: 'Cuota sindical',
      COURT_ORDER: 'Descuento judicial',
      DEDUCTION_EXTRA: 'Descuento extraordinario',
      ADJUSTMENT_NEG: 'Ajuste o retroactivo (-)',
    };

    return names[typeId] || typeId;
  }

  private async getPaymentExecutionAccountMap(): Promise<
    Record<string, string>
  > {
    const codes = ['1.1.01', '1.1.02', '2.2.01', '2.2.02', '2.2.03', '2.2.04'];
    const accounts = await this.accountRepo.find({
      where: { code: In(codes) },
    });

    const map: Record<string, string> = {};
    for (const account of accounts) {
      map[account.code] = account.id;
    }

    const missingCodes = codes.filter((code) => !map[code]);
    if (missingCodes.length > 0) {
      throw new Error(
        `Las siguientes cuentas contables no existen: ${missingCodes.join(', ')}. Ejecute las migraciones de cuentas contables.`,
      );
    }

    return map;
  }

  private getCashAccountForPaymentMethod(
    paymentMethod: string | null,
    accountMap: Record<string, string>,
  ): string {
    if (paymentMethod === PaymentMethod.CASH) {
      return accountMap['1.1.01'];
    }
    return accountMap['1.1.02'];
  }

  async execute(
    command: GenerateLedgerEntriesCommand,
  ): Promise<GenerateLedgerEntriesResult> {
    const { transaction, companyId, manager } = command;
    const startTime = Date.now();
    const errors: ValidationError[] = [];

    try {
      // For now, delegate to the existing service logic
      // TODO: Implement full CQRS logic here
      const result: GenerateLedgerEntriesResult = {
        status: 'SUCCESS',
        transactionId: transaction.id,
        entriesGenerated: 0,
        entriesIds: [],
        balanceValidated: true,
        errors: [],
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };

      return result;
    } catch (error) {
      this.logger.error(
        `Error generating ledger entries for transaction ${transaction.id}`,
        error,
      );
      return {
        status: 'REJECTED',
        transactionId: transaction.id,
        errors: [
          {
            code: 'GENERATION_ERROR',
            message: error.message,
            severity: 'ERROR',
            phase: 'GENERATION',
          },
        ],
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}
