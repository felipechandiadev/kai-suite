import { BadRequestException, Injectable, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { ParentPaymentAggregateService } from '@modules/transactions/application/services/parent-payment-aggregate.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { Employee } from '@modules/employees/domain/employee.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import {
  calculatePayrollTotals,
  getPayrollLineCategory,
  listPayrollLineTypeOptions,
  normalizePayrollLineTypeId,
  type PayrollLineInput,
} from './payroll-lines.util';
import {
  alignSettlementPaymentToNet,
  coerceSettlementPaymentInput,
  mapUiPaymentMethod,
  resolvePayrollPaymentLines,
  shouldCreatePayrollPaymentChildren,
  type PayrollSettlementPaymentInput,
  type PayrollSettlementPaymentLineInput,
} from './payroll-settlement-payment.util';
import {
  PayrollLineSuggestion,
  PayrollLineSuggestionStatus,
} from '../domain/payroll-line-suggestion.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { HrEmployeeTimelineService } from '@modules/employees/application/hr-employee-timeline.service';
import { HrEmployeeTimelineKind } from '@modules/employees/domain/hr-employee-timeline-entry.entity';
import { EmploymentContractsService } from '@modules/employees/application/employment-contracts.service';
import { HrJornadaService } from '@modules/hr-jornada/application/hr-jornada.service';
import { PayrollStatutoryCalculator } from './payroll-statutory.calculator';
import { PayrollAutoExpenseService } from './payroll-auto-expense.service';
import type { PayrollEmployerCost } from '../domain/payroll-imponible';
import { isStatutoryEmployeeDeduction } from '../domain/payroll-imponible';
import { PayrollLineCategory } from '../domain/payroll-line-type.enum';

export interface PlannedPaymentLineInput {
  dueDate: string;
  amount: number;
}

@Injectable()
export class RemunerationsService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ResultCenter)
    private readonly resultCenterRepository: Repository<ResultCenter>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PayrollLineSuggestion)
    private readonly suggestionRepository: Repository<PayrollLineSuggestion>,
    private readonly timelineService: HrEmployeeTimelineService,
    private readonly contractsService: EmploymentContractsService,
    private readonly statutoryCalculator: PayrollStatutoryCalculator,
    private readonly autoExpenseService: PayrollAutoExpenseService,
    @Optional()
    @Inject(forwardRef(() => HrJornadaService))
    private readonly jornadaService?: HrJornadaService,
  ) {}

  private async appendTimelineSafe(
    input: Parameters<HrEmployeeTimelineService['append']>[0],
  ) {
    try {
      await this.timelineService.append(input);
    } catch {
      // never fail payroll write because of timeline
    }
  }

  async getPayrollLineTypeOptions() {
    return listPayrollLineTypeOptions();
  }

  async listPayrollSuggestions(params?: {
    employeeId?: string;
    periodStart?: string;
    periodEnd?: string;
    status?: string;
  }) {
    const companyId = TenantContext.getCompanyId();
    const qb = this.suggestionRepository
      .createQueryBuilder('s')
      .where('s.companyId = :companyId', { companyId });
    if (params?.employeeId) {
      qb.andWhere('s.employeeId = :employeeId', {
        employeeId: params.employeeId,
      });
    }
    if (params?.periodStart) {
      qb.andWhere('s.periodStart >= :periodStart', {
        periodStart: params.periodStart,
      });
    }
    if (params?.periodEnd) {
      qb.andWhere('s.periodEnd <= :periodEnd', {
        periodEnd: params.periodEnd,
      });
    }
    if (params?.status) {
      qb.andWhere('s.status = :status', { status: params.status });
    } else {
      qb.andWhere('s.status = :status', {
        status: PayrollLineSuggestionStatus.PENDING,
      });
    }
    qb.orderBy('s.createdAt', 'DESC');
    return qb.getMany();
  }

  async acceptPayrollSuggestion(id: string) {
    const companyId = TenantContext.getCompanyId();
    const row = await this.suggestionRepository.findOne({
      where: { id, companyId: companyId ?? undefined },
    });
    if (!row) throw new BadRequestException('Sugerencia no encontrada');
    row.status = PayrollLineSuggestionStatus.ACCEPTED;
    return this.suggestionRepository.save(row);
  }

  async dismissPayrollSuggestion(id: string) {
    const companyId = TenantContext.getCompanyId();
    const row = await this.suggestionRepository.findOne({
      where: { id, companyId: companyId ?? undefined },
    });
    if (!row) throw new BadRequestException('Sugerencia no encontrada');
    row.status = PayrollLineSuggestionStatus.DISMISSED;
    return this.suggestionRepository.save(row);
  }

  async getRemunerationById(id: string) {
    const tx = await this.transactionRepository.findOne({
      where: { id, transactionType: TransactionType.PAYROLL },
      relations: ['employee', 'employee.person', 'resultCenter'],
    });

    if (!tx) {
      return null;
    }

    return this.formatRemuneration(tx);
  }

  async getAllRemunerations(params?: {
    employeeId?: string;
    status?: TransactionStatus;
  }) {
    const query = this.transactionRepository.createQueryBuilder('t');

    query.leftJoinAndSelect('t.employee', 'employee');
    query.leftJoinAndSelect('employee.person', 'person');
    query.leftJoinAndSelect('t.resultCenter', 'resultCenter');

    query.where('t.transactionType = :type', { type: TransactionType.PAYROLL });

    if (params?.employeeId) {
      query.andWhere('t.employeeId = :employeeId', {
        employeeId: params.employeeId,
      });
    }
    if (params?.status) {
      query.andWhere('t.status = :status', { status: params.status });
    }

    const remunerations = await query.orderBy('t.createdAt', 'DESC').getMany();

    return remunerations.map((tx) => this.formatRemuneration(tx));
  }

  async previewSettlement(data: {
    employeeId: string;
    date?: string;
    lines?: PayrollLineInput[];
    includeContractAllowances?: boolean;
  }) {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }
    const contract = await this.contractsService.getActive(data.employeeId);
    const baseSalary = Number(contract?.baseSalary ?? employee.baseSalary ?? 0) || 0;

    let earnings = (data.lines ?? []).filter((l) => {
      try {
        return (
          getPayrollLineCategory(normalizePayrollLineTypeId(l.typeId)) ===
          PayrollLineCategory.EARNING
        );
      } catch {
        return true;
      }
    });

    if (earnings.length === 0 && baseSalary > 0) {
      earnings = [{ typeId: 'ORDINARY', amount: Math.round(baseSalary) }];
    }

    const statutory = this.statutoryCalculator.calculate({
      earnings,
      contract,
      includeContractAllowances: data.includeContractAllowances !== false,
    });

    const earningLines = [
      ...earnings,
      ...statutory.suggestedAllowances.map((a) => ({
        typeId: a.typeId,
        amount: a.amount,
      })),
    ];
    const allLines = [
      ...earningLines,
      ...statutory.suggestedDeductions.map((d) => ({
        typeId: d.typeId,
        amount: d.amount,
      })),
    ];
    const totals = calculatePayrollTotals(allLines, {
      employerCosts: statutory.employerCosts,
    });

    return {
      date: data.date ?? null,
      contract: contract
        ? {
            id: contract.id,
            laborType: contract.laborType,
            afpName: contract.afpName,
            afpContributionPercent: contract.afpContributionPercent,
            healthSystem: contract.healthSystem,
            mutualName: contract.mutualName,
          }
        : null,
      suggestedEarnings: earningLines,
      suggestedDeductions: statutory.suggestedDeductions,
      employerCosts: statutory.employerCosts,
      totals: {
        totalImponible: totals.totalImponible,
        totalNoImponible: totals.totalNoImponible,
        totalEarnings: totals.totalEarnings,
        totalDeductions: totals.totalDeductions,
        totalEmployerCost: totals.totalEmployerCost,
        netPayment: totals.netPayment,
        taxableBase: statutory.taxableBase,
      },
      note: 'Los aportes del empleador no se descuentan del sueldo líquido.',
    };
  }

  async createRemuneration(data: {
    employeeId: string;
    resultCenterId?: string | null;
    date: string;
    lines: PayrollLineInput[];
    userId?: string;
    plannedPayments?: PlannedPaymentLineInput[];
    settlementPayment?: PayrollSettlementPaymentInput;
    employerCosts?: PayrollEmployerCost[];
    /** Default true: genera OE Sueldos/Cargas + CxP; no crea PAYROLL_PAYMENT. */
    autoCreateOperationalExpenses?: boolean;
    /** Si faltan descuentos legales, los sugiere desde contrato. Default true. */
    autoSuggestStatutory?: boolean;
  }) {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employeeId },
      relations: ['person'],
    });
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    if (this.jornadaService) {
      await this.jornadaService.assertMonthClosedForPayroll(data.date);
    }

    const resultCenterId =
      data.resultCenterId ?? employee.resultCenterId ?? null;

    const branchId = await this.resolveBranchId(employee, resultCenterId);
    if (!branchId) {
      throw new BadRequestException('Branch not found for remuneration');
    }

    const userId = await this.resolveUserId(data.userId);
    const companyId = TenantContext.getCompanyId() ?? employee.companyId;
    if (!companyId) {
      throw new BadRequestException('Company context required');
    }

    const contract = await this.contractsService.getActive(data.employeeId);
    const autoSuggest = data.autoSuggestStatutory !== false;
    const autoOe = data.autoCreateOperationalExpenses !== false;

    let lines: PayrollLineInput[] = [...data.lines];
    const earningsOnly = lines.filter((l) => {
      try {
        return (
          getPayrollLineCategory(normalizePayrollLineTypeId(l.typeId)) ===
          PayrollLineCategory.EARNING
        );
      } catch {
        return !isStatutoryEmployeeDeduction(l.typeId);
      }
    });

    const statutory = this.statutoryCalculator.calculate({
      earnings: earningsOnly,
      contract,
    });

    let didAutoSuggestDeductions = false;
    if (autoSuggest) {
      const hasAnyStatutory = lines.some((l) =>
        isStatutoryEmployeeDeduction(l.typeId),
      );
      if (!hasAnyStatutory && statutory.suggestedDeductions.length > 0) {
        lines = this.statutoryCalculator.mergeSuggestedDeductions(
          lines,
          statutory.suggestedDeductions,
        );
        didAutoSuggestDeductions = true;
      }
    }

    const employerCosts =
      data.employerCosts && data.employerCosts.length > 0
        ? data.employerCosts
        : statutory.employerCosts;

    const {
      totalEarnings,
      totalDeductions,
      totalImponible,
      totalNoImponible,
      totalEmployerCost,
      netPayment,
      normalizedLines,
    } = calculatePayrollTotals(lines, { employerCosts });

    let settlementInput = coerceSettlementPaymentInput(
      data.settlementPayment,
    );
    // Si el front armó cuotas sobre el bruto (sin descuentos legales),
    // realinear al líquido tras auto-sugerir.
    if (didAutoSuggestDeductions && settlementInput) {
      settlementInput = alignSettlementPaymentToNet(
        settlementInput,
        netPayment,
      );
    }
    const paymentPlan = resolvePayrollPaymentLines(
      settlementInput,
      netPayment,
      data.date,
    );

    const plannedForMeta = [
      ...paymentPlan.paidLines,
      ...paymentPlan.scheduledLines,
    ];

    const metadata: Record<string, unknown> = {
      remuneration: true,
      documentKind: 'PAYROLL_SETTLEMENT',
      payrollDate: data.date,
      lines: normalizedLines,
      totalEarnings,
      totalDeductions,
      totalImponible,
      totalNoImponible,
      totalEmployerCost,
      employerCosts,
      netPayment,
      autoCreateOperationalExpenses: autoOe,
      settlementPayment: {
        mode: paymentPlan.mode,
        ...(paymentPlan.mode === 'PARTIAL' &&
        data.settlementPayment?.partialPaidAmount != null
          ? { partialPaidAmount: data.settlementPayment.partialPaidAmount }
          : {}),
        paidLines: paymentPlan.paidLines,
        scheduledLines: paymentPlan.scheduledLines,
      },
      plannedPayments: plannedForMeta,
    };

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PAYROLL;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.employeeId = employee.id;
    dto.resultCenterId = resultCenterId ?? undefined;
    dto.subtotal = totalEarnings;
    dto.taxAmount = 0;
    dto.discountAmount = totalDeductions;
    dto.total = netPayment;
    dto.paymentMethod =
      paymentPlan.paidLines[0]?.paymentMethod != null
        ? mapUiPaymentMethod(paymentPlan.paidLines[0].paymentMethod)
        : PaymentMethod.TRANSFER;
    dto.amountPaid = autoOe ? 0 : paymentPlan.parentAmountPaid;
    dto.paymentStatus = autoOe
      ? PaymentStatus.PENDING
      : paymentPlan.parentPaymentStatus;
    dto.paymentDueDate = data.date;
    dto.metadata = metadata;

    const created = await this.transactionsService.createTransaction(dto);

    await this.appendTimelineSafe({
      employeeId: employee.id,
      kind: HrEmployeeTimelineKind.PAYROLL_CREATED,
      title: 'Liquidación creada',
      body: `Fecha ${data.date}`,
      actorUserId: TenantContext.getUserId() ?? null,
      sourceType: 'Transaction',
      sourceId: created.id,
      payload: { date: data.date, netPayment, totalEmployerCost },
    });

    if (autoOe) {
      try {
        const { operationalExpenseIds } =
          await this.autoExpenseService.createLinkedExpenses({
            companyId,
            branchId,
            userId,
            employee,
            payrollTransactionId: created.id,
            payrollDate: data.date,
            netPayment,
            employerCosts,
            settlementPayment: settlementInput,
            resultCenterId,
          });
        await this.transactionRepository.update(created.id, {
          metadata: {
            ...metadata,
            operationalExpenseIds,
          },
        });
      } catch (err) {
        throw new BadRequestException(
          `Liquidación creada pero falló la generación de gastos operativos: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return this.getRemunerationById(created.id);
    }

    if (
      paymentPlan.mode === 'COMPLETED' ||
      paymentPlan.parentPaymentStatus === PaymentStatus.PAID
    ) {
      await this.appendTimelineSafe({
        employeeId: employee.id,
        kind: HrEmployeeTimelineKind.PAYROLL_PAID,
        title: 'Liquidación pagada',
        body: `Fecha ${data.date}`,
        actorUserId: TenantContext.getUserId() ?? null,
        sourceType: 'Transaction',
        sourceId: created.id,
        payload: { date: data.date, mode: paymentPlan.mode },
      });
    }

    if (!shouldCreatePayrollPaymentChildren(paymentPlan)) {
      return this.getRemunerationById(created.id);
    }

    const { paidLines, scheduledLines } = paymentPlan;
    const totalPaymentLines =
      paymentPlan.mode === 'COMPLETED'
        ? paidLines.length
        : paymentPlan.mode === 'PARTIAL'
          ? paidLines.length + scheduledLines.length
          : paymentPlan.mode === 'PENDING_SCHEDULED'
            ? scheduledLines.length
            : 0;

    if (paymentPlan.mode === 'COMPLETED') {
      for (let i = 0; i < paidLines.length; i++) {
        await this.createPayrollPaymentLine({
          payrollId: created.id,
          employeeId: employee.id,
          branchId,
          userId,
          line: paidLines[i],
          asDraft: false,
          note: `Pago liquidación (${i + 1}/${paidLines.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines || paidLines.length,
        });
      }
    } else if (paymentPlan.mode === 'PARTIAL') {
      for (let i = 0; i < paidLines.length; i++) {
        await this.createPayrollPaymentLine({
          payrollId: created.id,
          employeeId: employee.id,
          branchId,
          userId,
          line: paidLines[i],
          asDraft: false,
          note: `Abono liquidación (${i + 1}/${paidLines.length})`,
          installmentNumber: i + 1,
          totalInstallments: totalPaymentLines,
        });
      }
      for (let i = 0; i < scheduledLines.length; i++) {
        await this.createPayrollPaymentLine({
          payrollId: created.id,
          employeeId: employee.id,
          branchId,
          userId,
          line: scheduledLines[i],
          asDraft: true,
          note: `Cuota programada liquidación (${i + 1}/${scheduledLines.length})`,
          installmentNumber: paidLines.length + i + 1,
          totalInstallments: totalPaymentLines,
        });
      }
    } else if (paymentPlan.mode === 'PENDING_SCHEDULED') {
      for (let i = 0; i < scheduledLines.length; i++) {
        await this.createPayrollPaymentLine({
          payrollId: created.id,
          employeeId: employee.id,
          branchId,
          userId,
          line: scheduledLines[i],
          asDraft: true,
          note: `Cuota programada liquidación (${i + 1}/${scheduledLines.length})`,
          installmentNumber: i + 1,
          totalInstallments: scheduledLines.length,
        });
      }
    }

    if (totalPaymentLines > 0) {
      await this.parentPaymentAggregate.recalculateParentPaymentStatus(created.id);
    }

    return this.getRemunerationById(created.id);
  }

  async updateRemuneration(
    id: string,
    data: Partial<{
      date: string;
      status: TransactionStatus;
      resultCenterId?: string | null;
      lines: PayrollLineInput[];
    }>,
  ) {
    const existing = await this.transactionRepository.findOne({
      where: { id, transactionType: TransactionType.PAYROLL },
    });
    if (!existing) {
      return null;
    }

    const updateData: Partial<Transaction> = {};

    if (data.status) {
      updateData.status = data.status;
    }
    if (typeof data.resultCenterId !== 'undefined') {
      updateData.resultCenterId = data.resultCenterId ?? null;
    }
    if (data.date) {
      updateData.paymentDueDate = new Date(data.date);
    }

    if (data.lines) {
      const { totalEarnings, totalDeductions, netPayment, normalizedLines } =
        calculatePayrollTotals(data.lines);
      updateData.subtotal = totalEarnings;
      updateData.discountAmount = totalDeductions;
      updateData.total = netPayment;
      updateData.metadata = {
        ...(existing.metadata ?? {}),
        remuneration: true,
        payrollDate: data.date ?? existing.metadata?.payrollDate,
        lines: normalizedLines,
        totalEarnings,
        totalDeductions,
        netPayment,
      };
    }

    await this.transactionRepository.update(id, updateData as any);

    if (
      existing.employeeId &&
      data.status === TransactionStatus.COMPLETED &&
      existing.status !== TransactionStatus.COMPLETED
    ) {
      await this.appendTimelineSafe({
        employeeId: existing.employeeId,
        kind: HrEmployeeTimelineKind.PAYROLL_PAID,
        title: 'Liquidación pagada',
        actorUserId: TenantContext.getUserId() ?? null,
        sourceType: 'Transaction',
        sourceId: id,
      });
    }

    return this.getRemunerationById(id);
  }

  async deleteRemuneration(id: string) {
    await this.transactionRepository.update(
      { id, transactionType: TransactionType.PAYROLL },
      { status: TransactionStatus.CANCELLED },
    );
    return { success: true };
  }

  private async createPayrollPaymentLine(opts: {
    payrollId: string;
    employeeId: string;
    branchId: string;
    userId: string;
    line: PayrollSettlementPaymentLineInput;
    asDraft: boolean;
    note: string;
    installmentNumber: number;
    totalInstallments: number;
  }) {
    const amount = Math.round(Number(opts.line.amount) || 0);
    if (amount <= 0) return;

    const payDto = new CreateTransactionDto();
    payDto.transactionType = TransactionType.PAYROLL_PAYMENT;
    if (opts.asDraft) {
      payDto.transactionStatus = TransactionStatus.DRAFT;
    }
    payDto.branchId = opts.branchId;
    payDto.userId = opts.userId;
    payDto.employeeId = opts.employeeId;
    payDto.relatedTransactionId = opts.payrollId;
    payDto.subtotal = amount;
    payDto.taxAmount = 0;
    payDto.discountAmount = 0;
    payDto.total = amount;
    payDto.amountPaid = opts.asDraft ? 0 : amount;
    payDto.paymentStatus = opts.asDraft
      ? PaymentStatus.PENDING
      : PaymentStatus.PAID;
    payDto.paymentDueDate = String(opts.line.dueDate || '').trim();

    const pm = String(opts.line.paymentMethod || '').trim().toUpperCase();
    if (pm && ['CASH', 'TRANSFER', 'CHECK'].includes(pm)) {
      payDto.paymentMethod = mapUiPaymentMethod(pm);
      if (pm === 'TRANSFER' || pm === 'CHECK') {
        payDto.bankAccountKey =
          opts.line.companyBankAccountKey != null
            ? String(opts.line.companyBankAccountKey).trim()
            : undefined;
      }
      if (pm === 'CASH' && opts.line.cashHubId != null) {
        payDto.cashHubId = String(opts.line.cashHubId).trim();
      }
    }

    payDto.notes = opts.note;
    const employeeBankKey =
      opts.line.employeeBankAccountKey ?? opts.line.supplierBankAccountKey;
    payDto.metadata = {
      origin: 'PAYROLL_PAYMENT',
      installmentNumber: opts.installmentNumber,
      totalInstallments: opts.totalInstallments,
      payrollTransactionId: opts.payrollId,
      settlementPaymentLine: {
        dueDate: opts.line.dueDate,
        amount,
        paymentMethod: opts.line.paymentMethod,
        companyBankAccountKey: opts.line.companyBankAccountKey ?? null,
        employeeBankAccountKey: employeeBankKey ?? null,
        chequeNumber: opts.line.chequeNumber ?? null,
        cashHubId: opts.line.cashHubId ?? null,
        isScheduled: opts.asDraft,
      },
    };

    await this.transactionsService.createTransaction(payDto);
  }

  private formatRemuneration(tx: Transaction) {
    const person = tx.employee?.person;
    const employeeName = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() ||
        (person.businessName ?? '').trim()
      : '';
    const employeeDocumentNumber =
      (person?.documentNumber ?? '').trim() || null;

    const metadata = tx.metadata ?? {};
    const payrollDate =
      metadata.payrollDate ?? tx.paymentDueDate ?? tx.createdAt;

    return {
      id: tx.id,
      documentNumber: tx.documentNumber ?? null,
      date: payrollDate,
      employeeId: tx.employeeId ?? null,
      employeeName,
      employeeDocumentNumber,
      resultCenterId: tx.resultCenterId ?? null,
      totalEarnings: Number(metadata.totalEarnings ?? tx.subtotal ?? 0),
      totalDeductions: Number(
        metadata.totalDeductions ?? tx.discountAmount ?? 0,
      ),
      totalImponible: Number(metadata.totalImponible ?? 0),
      totalNoImponible: Number(metadata.totalNoImponible ?? 0),
      totalEmployerCost: Number(metadata.totalEmployerCost ?? 0),
      netPayment: Number(metadata.netPayment ?? tx.total ?? 0),
      employerCosts: Array.isArray(metadata.employerCosts)
        ? metadata.employerCosts
        : [],
      status: tx.status,
      createdAt: tx.createdAt,
      updatedAt: tx.createdAt,
      lines: metadata.lines ?? [],
    };
  }

  private async resolveBranchId(
    employee: Employee,
    resultCenterId?: string | null,
  ) {
    if (employee.branchId) {
      return employee.branchId;
    }

    if (resultCenterId) {
      const resultCenter = await this.resultCenterRepository.findOne({
        where: { id: resultCenterId },
      });
      if (resultCenter?.branchId) {
        return resultCenter.branchId;
      }
    }

    const branches = await this.branchRepository.find({
      order: { name: 'ASC' },
      take: 1,
    });

    return branches[0]?.id ?? null;
  }

  private async resolveUserId(userId?: string) {
    if (userId) {
      return userId;
    }

    const users = await this.userRepository.find({
      order: { userName: 'ASC' },
      take: 1,
    });

    if (!users[0]) {
      throw new BadRequestException('No users available to register payroll');
    }

    return users[0].id;
  }
}
