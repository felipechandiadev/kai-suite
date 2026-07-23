import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
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
import { LedgerEntryRepositoryPort } from './ports/ledger-entry.repository.port';
import { AccountingRuleRepositoryPort } from './ports/accounting-rule.repository.port';
import { AccountingAccountRepositoryPort } from './ports/accounting-account.repository.port';
import { CustomerRepositoryPort } from './ports/customer.repository.port';
import { SupplierRepositoryPort } from './ports/supplier.repository.port';
import { ShareholderRepositoryPort } from './ports/shareholder.repository.port';
import { EmployeeRepositoryPort } from './ports/employee.repository.port';
import {
  getPaymentSnapshots,
  isMultiPayment,
} from '@modules/transactions/application/payment-snapshots.util';
import {
  allocateSalePaymentDebits,
  isSalePaymentAssetAccountCode,
} from './sale-payment-debits.util';
import {
  applyOutgoingCheckCreditOverride,
  resolveOutgoingPaymentCreditAccountCode,
  shouldSkipPaymentExecutionLedger,
} from './outgoing-payment-credit-account.util';

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

export interface LedgerEntryGeneratorResponse {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'REJECTED';
  transactionId: string;
  entriesGenerated?: number;
  entriesIds?: string[];
  balanceValidated?: boolean;
  errors: ValidationError[];
  executedAt: Date;
  executionTimeMs: number;
}

@Injectable()
export class LedgerEntriesService {
  private logger = new Logger(LedgerEntriesService.name);

  constructor(
    @Inject('LedgerEntryRepositoryPort')
    private readonly ledgerEntryRepo: LedgerEntryRepositoryPort,
    @Inject('AccountingRuleRepositoryPort')
    private readonly rulesRepo: AccountingRuleRepositoryPort,
    @Inject('AccountingAccountRepositoryPort')
    private readonly accountRepo: AccountingAccountRepositoryPort,
    @Inject('CustomerRepositoryPort')
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject('SupplierRepositoryPort')
    private readonly supplierRepo: SupplierRepositoryPort,
    @Inject('ShareholderRepositoryPort')
    private readonly shareholderRepo: ShareholderRepositoryPort,
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepo: EmployeeRepositoryPort,
  ) {}

  /**
   * FASE PRINCIPAL: Orquesta la generación de asientos para una transacción
   */
  async generateEntriesForTransaction(
    transaction: Transaction,
    companyId: string,
    manager?: EntityManager,
  ): Promise<LedgerEntryGeneratorResponse> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];

    try {
      const metaSkip = (transaction.metadata || {}) as Record<string, unknown>;
      if (
        transaction.transactionType === TransactionType.PAYMENT_IN &&
        metaSkip.source === 'pos_sale'
      ) {
        return {
          status: 'SUCCESS',
          transactionId: transaction.id,
          entriesGenerated: 0,
          entriesIds: [],
          balanceValidated: true,
          errors: [],
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // PRE-RESOLUCIÓN: Obtener personId una sola vez al principio
      // Esto evita múltiples queries dentro de calculateEntries
      const personId = await this.getPersonIdForTransaction(transaction);

      // FASE 1: Pre-validación
      const preValidationErrors = await this.preValidateTransaction(
        transaction,
        companyId,
      );
      errors.push(...preValidationErrors);

      if (preValidationErrors.some((e) => e.severity === 'ERROR')) {
        return {
          status: 'REJECTED',
          transactionId: transaction.id,
          errors,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // FASE 2: Matching de reglas
      const applicableRules = await this.matchRules(transaction, companyId);

      const metaEarly = (transaction.metadata || {}) as Record<string, unknown>;
      const hubCashDeposit =
        transaction.transactionType === TransactionType.CASH_DEPOSIT &&
        ((transaction as any).cashHubId || metaEarly.cashHubDeposit);
      const hubBankToCash =
        transaction.transactionType === TransactionType.BANK_TO_CASH_TRANSFER &&
        ((transaction as any).cashHubId || metaEarly.bankToCashHubTransfer);

      // PAYROLL no requiere reglas contables, se genera directamente desde metadata
      if (
        applicableRules.length === 0 &&
        transaction.transactionType !== TransactionType.PAYROLL &&
        !hubCashDeposit &&
        !hubBankToCash
      ) {
        this.logger.warn(
          `No accounting rules found for transaction ${transaction.id} (type: ${transaction.transactionType})`,
        );
        // No es error, solo warning - permitir transacción sin asientos
        return {
          status: 'SUCCESS',
          transactionId: transaction.id,
          entriesGenerated: 0,
          entriesIds: [],
          balanceValidated: true,
          errors,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // FASE 3: Generación de asientos - PASAR personId pre-resuelto
      const entries = await this.calculateEntries(
        transaction,
        applicableRules,
        personId,
        companyId,
      );

      if (entries.length === 0) {
        return {
          status: 'SUCCESS',
          transactionId: transaction.id,
          entriesGenerated: 0,
          entriesIds: [],
          balanceValidated: true,
          errors,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // FASE 4: Validación de balanza
      const isBalanced = this.validateBalance(entries);
      if (!isBalanced) {
        errors.push({
          code: 'BALANCE_MISMATCH',
          message: `Total debits (${this.sumDebits(entries)}) != total credits (${this.sumCredits(entries)})`,
          severity: 'ERROR',
          phase: 'BALANCE_CHECK',
        });
        return {
          status: 'REJECTED',
          transactionId: transaction.id,
          errors,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // FASE 5: Persistencia
      const savedEntries = await this.persistEntries(entries, manager);

      this.logger.log(
        `Successfully generated ${savedEntries.length} ledger entries for transaction ${transaction.id}`,
      );

      return {
        status: 'SUCCESS',
        transactionId: transaction.id,
        entriesGenerated: savedEntries.length,
        entriesIds: savedEntries.map((e) => e.id),
        balanceValidated: true,
        errors,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      this.logger.error(
        `Error generating ledger entries: ${(err as Error).message}`,
        (err as Error).stack,
      );
      errors.push({
        code: 'INTERNAL_ERROR',
        message: (err as Error).message,
        severity: 'ERROR',
        phase: 'PERSISTENCE',
      });
      return {
        status: 'REJECTED',
        transactionId: transaction.id,
        errors,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * FASE 1: Pre-validación
   */
  private async preValidateTransaction(
    transaction: Transaction,
    companyId: string,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // V6: Verificar que NO existe LedgerEntry duplicada
    const existingEntries = await this.ledgerEntryRepo.find({
      where: { transactionId: transaction.id },
    });

    if (existingEntries.length > 0) {
      errors.push({
        code: 'DUPLICATE_ENTRIES',
        message: `Ledger entries already exist for transaction ${transaction.id}`,
        severity: 'ERROR',
        phase: 'VALIDATION',
      });
      return errors; // Detener aquí
    }

    // V1: Validar saldo en origen para bancarias (bankToCashTransfer / giro a caja)
    if (
      transaction.metadata?.bankToCashTransfer === true ||
      transaction.transactionType === TransactionType.CASH_WITHDRAWAL_TO_PETTY_CASH ||
      transaction.metadata?.cashWithdrawalToPettyCash === true
    ) {
      const bankBalance = await this.getAccountBalance(
        '1.1.02', // Banco
        transaction.createdAt,
        transaction.branchId,
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
        '1.1.01', // Caja general
        transaction.createdAt,
        transaction.branchId,
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
        transaction.branchId,
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
        transaction.branchId,
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
        transaction.branchId,
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

  /**
   * FASE 2: Matching de reglas
   */
  private async matchRules(
    transaction: Transaction,
    companyId: string,
  ): Promise<AccountingRule[]> {
    // Buscar reglas coincidentes
    const rules = await this.rulesRepo.find({
      where: {
        companyId,
        transactionType: transaction.transactionType,
        isActive: true,
      },
      order: { priority: 'ASC' },
    });

    const snapshots = getPaymentSnapshots(transaction);
    const saleMultiPay =
      transaction.transactionType === TransactionType.SALE &&
      isMultiPayment(snapshots);

    // Filtrar por condiciones opcionales (si existen se aplican)
    return rules.filter((rule) => {
      // Si la regla especifica categoría, debe coincidir
      if (
        rule.expenseCategoryId &&
        rule.expenseCategoryId !== transaction.expenseCategoryId
      ) {
        return false;
      }
      // Venta multi-medio: reglas con paymentMethod concreto no bloquean ingreso/IVA
      if (
        rule.paymentMethod &&
        rule.paymentMethod !== transaction.paymentMethod &&
        !saleMultiPay
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * FASE 3: Generación de asientos
   */
  private async calculateEntries(
    transaction: Transaction,
    rules: AccountingRule[],
    personId: string | null,
    companyId: string,
  ): Promise<LedgerEntryDto[]> {
    const meta = (transaction.metadata || {}) as Record<string, unknown>;
    if (
      transaction.transactionType === TransactionType.CASH_DEPOSIT &&
      ((transaction as any).cashHubId || meta.cashHubDeposit)
    ) {
      return this.buildHubCashDepositEntries(transaction, personId, companyId);
    }

    if (
      transaction.transactionType === TransactionType.BANK_TO_CASH_TRANSFER &&
      ((transaction as any).cashHubId || meta.bankToCashHubTransfer)
    ) {
      return this.buildHubBankToCashEntries(transaction, personId, companyId);
    }

    // CASO ESPECIAL: Remuneraciones (PAYROLL)
    // No depende de reglas contables, genera asientos directamente desde metadata
    if (transaction.transactionType === TransactionType.PAYROLL) {
      return this.generatePayrollEntries(transaction, personId);
    }

    // CASO ESPECIAL: Ejecución de pago (PAYMENT_EXECUTION)
    // Genera asientos según el tipo de cuenta por pagar
    if (transaction.transactionType === TransactionType.PAYMENT_EXECUTION) {
      return this.generatePaymentExecutionEntries(transaction, personId);
    }

    const entries: LedgerEntryDto[] = [];

    for (const rule of rules) {
      // Determinar el scope de aplicación
      if (rule.appliesTo === RuleScope.TRANSACTION) {
        // Generar UN asiento para toda la transacción
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
        // Generar asientos POR LÍNEA
        if (transaction.lines && transaction.lines.length > 0) {
          for (const line of transaction.lines) {
            // Aplicar regla solo si taxId coincide (si la regla filtra por tax)
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

    if (transaction.transactionType === TransactionType.SALE) {
      return this.applySalePaymentDebitAllocation(
        transaction,
        entries,
        personId,
        companyId,
      );
    }

    if (
      resolveOutgoingPaymentCreditAccountCode(
        transaction.transactionType,
        transaction.paymentMethod,
      )
    ) {
      const accounts = await this.accountRepo.findByCompanyId(companyId);
      const accountByCode = new Map(accounts.map((a) => [a.code, a.id]));
      return applyOutgoingCheckCreditOverride(entries, accountByCode);
    }

    return entries;
  }

  /**
   * Reemplaza el debe único de cobro (caja/banco) por un debe por snapshot de pago.
   */
  private async applySalePaymentDebitAllocation(
    transaction: Transaction,
    entries: LedgerEntryDto[],
    personId: string | null,
    companyId: string,
  ): Promise<LedgerEntryDto[]> {
    const snapshots = getPaymentSnapshots(transaction);
    if (snapshots.length === 0) {
      return entries;
    }

    const accounts = await this.accountRepo.findByCompanyId(companyId);
    const accountByCode = new Map(accounts.map((a) => [a.code, a.id]));
    const assetAccountIds = new Set(
      accounts
        .filter((a) => isSalePaymentAssetAccountCode(a.code))
        .map((a) => a.id),
    );

    const withoutRulePaymentDebits = entries.filter(
      (e) =>
        !(
          e.debit > 0 &&
          assetAccountIds.has(e.accountId) &&
          e.metadata?.scope === RuleScope.TRANSACTION
        ),
    );

    const baseDescription =
      transaction.notes ||
      transaction.documentNumber ||
      `Venta ${transaction.id}`;

    const { lines, warnings } = allocateSalePaymentDebits(
      snapshots,
      accountByCode,
      baseDescription,
    );
    for (const msg of warnings) {
      this.logger.warn(
        `[ledger] SALE ${transaction.id} payment debit: ${msg}`,
      );
    }

    const paymentEntries: LedgerEntryDto[] = lines.map((line) => ({
      transactionId: transaction.id,
      accountId: line.accountId,
      personId,
      entryDate: transaction.createdAt,
      description: line.description,
      debit: line.debit,
      credit: 0,
      metadata: line.metadata,
    }));

    return [...withoutRulePaymentDebits, ...paymentEntries];
  }

  /** Depósito desde centro de acopio (1110) hacia banco (1102): Debe banco / Haber efectivo acopio. */
  private async buildHubCashDepositEntries(
    transaction: Transaction,
    personId: string | null,
    companyId: string,
  ): Promise<LedgerEntryDto[]> {
    const accounts = await this.accountRepo.findByCompanyId(companyId);
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));
    const bankId =
      byCode.get('1102') ?? byCode.get('1.1.02') ?? byCode.get('1.1.2');
    const hubId = byCode.get('1110') ?? byCode.get('1.1.10');
    if (!bankId || !hubId) {
      this.logger.warn(
        `[ledger] CASH_DEPOSIT con hub: faltan cuentas 1102/1110 para companyId=${companyId}; sin asientos.`,
      );
      return [];
    }
    const amount = Math.abs(Number(transaction.total || 0));
    if (amount < 0.01) {
      return [];
    }
    const desc =
      transaction.notes ||
      'Depósito bancario desde centro de acopio (efectivo acopio → banco)';
    return [
      {
        transactionId: transaction.id,
        accountId: bankId,
        personId,
        entryDate: transaction.createdAt,
        description: desc,
        debit: amount,
        credit: 0,
        metadata: { cashHubDeposit: true, scope: 'TRANSACTION' },
      },
      {
        transactionId: transaction.id,
        accountId: hubId,
        personId,
        entryDate: transaction.createdAt,
        description: desc,
        debit: 0,
        credit: amount,
        metadata: { cashHubDeposit: true, scope: 'TRANSACTION' },
      },
    ];
  }

  /** Giro banco → centro de acopio (1102 → 1110): Debe efectivo acopio / Haber banco. */
  private async buildHubBankToCashEntries(
    transaction: Transaction,
    personId: string | null,
    companyId: string,
  ): Promise<LedgerEntryDto[]> {
    const accounts = await this.accountRepo.findByCompanyId(companyId);
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));
    const bankId =
      byCode.get('1102') ?? byCode.get('1.1.02') ?? byCode.get('1.1.2');
    const hubId = byCode.get('1110') ?? byCode.get('1.1.10');
    if (!bankId || !hubId) {
      this.logger.warn(
        `[ledger] BANK_TO_CASH_TRANSFER con hub: faltan cuentas 1102/1110 para companyId=${companyId}; sin asientos.`,
      );
      return [];
    }
    const amount = Math.abs(Number(transaction.total || 0));
    if (amount < 0.01) {
      return [];
    }
    const desc =
      transaction.notes ||
      'Giro bancario a centro de efectivo (banco → efectivo acopio)';
    return [
      {
        transactionId: transaction.id,
        accountId: hubId,
        personId,
        entryDate: transaction.createdAt,
        description: desc,
        debit: amount,
        credit: 0,
        metadata: { bankToCashHubTransfer: true, scope: 'TRANSACTION' },
      },
      {
        transactionId: transaction.id,
        accountId: bankId,
        personId,
        entryDate: transaction.createdAt,
        description: desc,
        debit: 0,
        credit: amount,
        metadata: { bankToCashHubTransfer: true, scope: 'TRANSACTION' },
      },
    ];
  }

  /**
   * Genera asientos contables para transacciones de tipo PAYROLL (remuneraciones)
   *
   * Lógica de doble partida:
   * - DEBE (Gastos): 5.3.01 Sueldos, 5.3.03 Otros haberes
   * - HABER (Pasivos): 2.2.01 Remuneraciones por pagar, 2.2.02 AFP, 2.2.03 Salud, 2.2.04 Otras retenciones
   *
   * Estructura metadata.lines:
   * [
   *   { typeId: 'BASE_SALARY', amount: 450000 },
   *   { typeId: 'OVERTIME', amount: 50000 },
   *   { typeId: 'AFP', amount: -60000 },
   *   { typeId: 'HEALTH_INSURANCE', amount: -35750 }
   * ]
   */
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

    const autoOe =
      metadata.autoCreateOperationalExpenses === true ||
      (Array.isArray(metadata.operationalExpenseIds) &&
        metadata.operationalExpenseIds.length > 0);

    const accountMap = await this.getPayrollAccountMap();

    let totalEarnings = 0;
    let totalLiabilities = 0;

    for (const line of metadata.lines) {
      const { typeId, amount, category } = line;
      const absAmount = Math.abs(Number(amount) || 0);
      if (absAmount <= 0) continue;

      const isDeduction =
        category === 'DEDUCTION' ||
        amount < 0 ||
        ['AFP', 'AFP_COMMISSION', 'HEALTH_INSURANCE', 'INCOME_TAX', 'UNEMPLOYMENT_INSURANCE', 'LOAN_PAYMENT', 'ADVANCE_PAYMENT', 'UNION_FEE', 'COURT_ORDER', 'DEDUCTION_EXTRA', 'ADJUSTMENT_NEG'].includes(
          String(typeId),
        );

      if (isDeduction) {
        const liabilityAccountId = this.mapPayrollTypeToLiabilityAccount(
          typeId,
          accountMap,
        );
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
        continue;
      }

      // Haber (earning)
      if (!autoOe) {
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
          debit: absAmount,
          credit: 0,
          metadata: { payrollLine: typeId, lineAmount: amount },
        });
      }
      totalEarnings += absAmount;
    }

    // Con auto-OE el gasto y CxP del líquido viven en OE; aquí solo pasivos de retención.
    // Balance: DEBIT a 2.2.01 (o gasto bridge) omitido — las retenciones quedan como pasivo
    // financiado por el gasto reconocido en OE Sueldos (neto) + lógica de tesorería.
    // Para cuadrar el asiento cuando solo hay créditos de retención, debitamos gasto de cargas/retenciones.
    if (autoOe) {
      if (totalLiabilities > 0) {
        const expenseAccountId = accountMap['5.3.03'] ?? accountMap['5.3.01'];
        if (expenseAccountId) {
          entries.push({
            transactionId: transaction.id,
            accountId: expenseAccountId,
            personId: personId,
            entryDate: transaction.createdAt,
            description: 'Retenciones legales (contrapartida)',
            debit: totalLiabilities,
            credit: 0,
            metadata: { payrollAutoOeWithholdings: true },
          });
        }
      }
      this.logger.log(
        `Generated ${entries.length} payroll retention entries (auto-OE) for ${transaction.id}`,
      );
      return entries;
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
      `Generated ${entries.length} payroll entries for transaction ${transaction.id}. ` +
        `Earnings: ${totalEarnings}, Deductions: ${totalLiabilities}, Net: ${netPayment}`,
    );

    return entries;
  }

  /**
   * Obtiene un mapa de códigos de cuenta a IDs
   */
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
      throw new BadRequestException(
        `Las siguientes cuentas contables no existen: ${missingCodes.join(', ')}`,
      );
    }

    return map;
  }

  /**
   * Mapea typeId de haber (ingreso) a cuenta de gasto
   */
  private mapPayrollTypeToExpenseAccount(
    typeId: string,
    accountMap: Record<string, string>,
  ): string {
    // Sueldos base → 5.3.01 Sueldos y salarios
    if (
      typeId === 'BASE_SALARY' ||
      typeId === 'ORDINARY' ||
      typeId === 'PROPORTIONAL'
    ) {
      return accountMap['5.3.01'];
    }

    // Otros haberes → 5.3.03 Otros haberes
    // (Overtime, bonuses, commissions, etc.)
    return accountMap['5.3.03'];
  }

  /**
   * Mapea typeId de deducción a cuenta de pasivo
   */
  private mapPayrollTypeToLiabilityAccount(
    typeId: string,
    accountMap: Record<string, string>,
  ): string {
    // AFP / comisión AFP → 2.2.02
    if (typeId === 'AFP' || typeId === 'AFP_COMMISSION') {
      return accountMap['2.2.02'];
    }

    // Salud → 2.2.03
    if (typeId === 'HEALTH_INSURANCE') {
      return accountMap['2.2.03'];
    }

    // Otras retenciones → 2.2.04
    // (Income tax, loans, advances, union fees, etc.)
    return accountMap['2.2.04'];
  }

  /**
   * Retorna nombre legible del typeId
   */
  private getPayrollTypeName(typeId: string): string {
    const names: Record<string, string> = {
      // Haberes
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
      // Descuentos
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

  /**
   * Genera asientos contables para PAYMENT_EXECUTION
   *
   * Cuando se ejecuta un pago de cuenta por pagar, se genera:
   * - DEBE: Cuenta por pagar específica (2.2.01 Remuneraciones, 2.2.02 AFP, etc.)
   * - HABER: Cuenta de efectivo (1.1.01 Caja o 1.1.02 Banco)
   *
   * La cuenta por pagar se identifica usando el metadata.payrollLineType del pago origen (SUPPLIER_PAYMENT / legado).
   *
   * Ejemplo:
   * - Pago de remuneración $90,000:
   *   DEBE 2.2.01 Remuneraciones por pagar $90,000
   *   HABER 1.1.02 Banco $90,000
   *
   * - Pago de AFP $15,000:
   *   DEBE 2.2.02 AFP por pagar $15,000
   *   HABER 1.1.02 Banco $15,000
   */
  private async generatePaymentExecutionEntries(
    transaction: Transaction,
    personId: string | null,
  ): Promise<LedgerEntryDto[]> {
    if (shouldSkipPaymentExecutionLedger(transaction.paymentMethod)) {
      this.logger.log(
        `Skipping PAYMENT_EXECUTION ledger for CHECK payment ${transaction.id} (bank movement on check clear)`,
      );
      return [];
    }

    const entries: LedgerEntryDto[] = [];

    // Obtener mapa de cuentas necesarias
    const accountMap = await this.getPaymentExecutionAccountMap();

    // Determinar cuenta por pagar según el tipo de pago
    const payrollLineType = transaction.metadata?.payrollLineType;
    let liabilityAccountId: string;
    let liabilityAccountName: string;

    if (payrollLineType === 'EMPLOYEE_PAYMENT') {
      // Pago de remuneración al empleado
      liabilityAccountId = accountMap['2.2.01'];
      liabilityAccountName = 'Remuneraciones por pagar';
    } else if (payrollLineType === 'AFP') {
      // Pago de AFP
      liabilityAccountId = accountMap['2.2.02'];
      liabilityAccountName = 'AFP por pagar';
    } else if (payrollLineType === 'HEALTH_INSURANCE') {
      // Pago de salud (Isapre/Fonasa)
      liabilityAccountId = accountMap['2.2.03'];
      liabilityAccountName = 'Salud por pagar';
    } else if (payrollLineType === 'INCOME_TAX' || payrollLineType === 'TAX') {
      // Pago de impuestos
      liabilityAccountId = accountMap['2.2.04'];
      liabilityAccountName = 'Impuestos por pagar';
    } else {
      // Otros tipos de pagos (préstamos, anticipos, etc.)
      liabilityAccountId = accountMap['2.2.04'];
      liabilityAccountName = 'Otras retenciones por pagar';
    }

    // Determinar cuenta de efectivo según método de pago
    const cashAccountId = this.getCashAccountForPaymentMethod(
      transaction.paymentMethod,
      accountMap,
    );
    const cashAccountName =
      transaction.paymentMethod === PaymentMethod.CASH ? 'Caja' : 'Banco';

    // Asiento: DEBE cuenta por pagar (disminuye pasivo)
    entries.push({
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
        relatedPaymentOutId: transaction.relatedTransactionId,
      },
    });

    // Asiento: HABER cuenta de efectivo (disminuye activo)
    entries.push({
      transactionId: transaction.id,
      accountId: cashAccountId,
      personId: personId,
      entryDate: transaction.createdAt,
      description: `Pago vía ${cashAccountName}`,
      debit: 0,
      credit: transaction.total,
      metadata: {
        paymentType: payrollLineType,
        paymentMethod: transaction.paymentMethod,
        relatedPaymentOutId: transaction.relatedTransactionId,
      },
    });

    this.logger.log(
      `Generated ${entries.length} payment execution entries for transaction ${transaction.id}. ` +
        `Liability: ${liabilityAccountName}, Amount: ${transaction.total}`,
    );

    return entries;
  }

  /**
   * Obtiene mapa de cuentas para ejecución de pagos
   */
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
      throw new BadRequestException(
        `Las siguientes cuentas contables no existen: ${missingCodes.join(', ')}. ` +
          `Ejecute las migraciones de cuentas contables.`,
      );
    }

    return map;
  }

  /**
   * Determina cuenta de efectivo según método de pago
   */
  private getCashAccountForPaymentMethod(
    paymentMethod: string | null,
    accountMap: Record<string, string>,
  ): string {
    if (paymentMethod === PaymentMethod.CASH) {
      return accountMap['1.1.01']; // Caja
    }
    // Por defecto usar Banco (TRANSFER, CHECK, etc.)
    return accountMap['1.1.02']; // Banco
  }

  /**
   * Validar que DEBE = HABER
   */
  private validateBalance(entries: LedgerEntryDto[]): boolean {
    const totalDebit = this.sumDebits(entries);
    const totalCredit = this.sumCredits(entries);

    // Tolerancia: 0.01 CLP por redondeos
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }

  private sumDebits(entries: LedgerEntryDto[]): number {
    return entries.reduce((sum, e) => sum + e.debit, 0);
  }

  private sumCredits(entries: LedgerEntryDto[]): number {
    return entries.reduce((sum, e) => sum + e.credit, 0);
  }

  /**
   * FASE 5: Persistencia
   */
  private async persistEntries(
    entries: LedgerEntryDto[],
    manager?: EntityManager,
  ): Promise<LedgerEntry[]> {
    if (manager) {
      // Using EntityManager - use TypeORM repository directly
      const repo = manager.getRepository(LedgerEntry);
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
    } else {
      // Using port - use saveMany method
      const ledgerEntitiesToSave = entries.map((dto) =>
        this.ledgerEntryRepo.create({
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
      return this.ledgerEntryRepo.saveMany(ledgerEntitiesToSave);
    }
  }

  /**
   * Helpers
   */

  private async getPersonIdForTransaction(
    transaction: Transaction,
  ): Promise<string | null> {
    // Optimización: hacer queries simples sin JOINs para minimize lock contention
    // Usar select() para proyectar solo el campo necesario
    // Timeout agresivo para evitar "Lock wait timeout exceeded"
    try {
      if (transaction.customerId) {
        const result = await Promise.race([
          this.customerRepo
            .createQueryBuilder('c')
            .select('c.personId')
            .where('c.id = :id', { id: transaction.customerId })
            .getRawOne(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000),
          ),
        ]);
        return result?.personId || null;
      }

      if (transaction.supplierId) {
        const result = await Promise.race([
          this.supplierRepo
            .createQueryBuilder('s')
            .select('s.personId')
            .where('s.id = :id', { id: transaction.supplierId })
            .getRawOne(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000),
          ),
        ]);
        return result?.personId || null;
      }

      if (transaction.shareholderId) {
        const result = await Promise.race([
          this.shareholderRepo
            .createQueryBuilder('sh')
            .select('sh.personId')
            .where('sh.id = :id', { id: transaction.shareholderId })
            .getRawOne(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000),
          ),
        ]);
        return result?.personId || null;
      }

      if (transaction.employeeId) {
        const result = await Promise.race([
          this.employeeRepo
            .createQueryBuilder('e')
            .select('e.personId')
            .where('e.id = :id', { id: transaction.employeeId })
            .getRawOne(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000),
          ),
        ]);
        return result?.personId || null;
      }
    } catch (error) {
      // Si hay lock timeout o cualquier error, simplemente retornar null (no crítico)
      this.logger.warn(
        `Could not resolve personId (non-critical): ${(error as Error).message}`,
      );
      return null;
    }

    return null;
  }

  private getTransactionAmount(
    transaction: Transaction,
    _rule: AccountingRule,
  ): number {
    // Por defecto, usa el total de la transacción
    return transaction.total;
  }

  private getLineAmount(line: TransactionLine, _rule: AccountingRule): number {
    // Por línea: usar el total línea
    return line.total;
  }

  private generateDescription(
    transaction: Transaction,
    _rule: AccountingRule,
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

  /**
   * Calcular saldo de cuenta (DEBE - CRÉDITO)
   *
   * Sumatorias hasta beforeDate para obtener posición contable en esa fecha
   * Usado para validaciones V1 (banco), V2 (caja)
   */
  async getAccountBalance(
    accountId: string,
    beforeDate: Date,
    _companyId?: string,
  ): Promise<number> {
    try {
      const result = await this.ledgerEntryRepo
        .createQueryBuilder('le')
        .select(
          'COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)',
          'balance',
        )
        .where('le.accountId = :accountId', { accountId })
        .andWhere('le.entryDate <= :beforeDate', { beforeDate })
        .getRawOne();

      return result ? Number(result.balance) : 0;
    } catch (err) {
      this.logger.error(
        `Error calculating account balance: ${(err as Error).message}`,
      );
      return 0; // Default a 0 si error (conservative)
    }
  }

  /**
   * Calcular saldo de persona (cliente, proveedor, socio)
   *
   * Usado para validación V4 (deuda cliente/proveedor antes de pagar)
   * personType permite identificar el tipo de relación
   */
  async getPersonBalance(
    personId: string,
    personType: 'CUSTOMER' | 'SUPPLIER' | 'SHAREHOLDER' | 'EMPLOYEE',
    _companyId?: string,
  ): Promise<number> {
    try {
      // Buscar todas las LedgerEntry donde personId coincida
      const result = await this.ledgerEntryRepo
        .createQueryBuilder('le')
        .select(
          'COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)',
          'balance',
        )
        .where('le.personId = :personId', { personId })
        .getRawOne();

      // Nota: El saldo aquí es la deuda del cliente/proveedor
      // Para clientes: saldo > 0 significa deuda a favor de empresa
      // Para proveedores: saldo > 0 significa deuda de empresa al proveedor
      return result ? Number(result.balance) : 0;
    } catch (err) {
      this.logger.error(
        `Error calculating person balance (${personType}): ${(err as Error).message}`,
      );
      return 0;
    }
  }
}
