import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { Person, PersonType, DocumentType } from '@modules/persons/domain/person.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { ExpenseCategoryOperationalGroup } from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '@modules/expense-categories/domain/expense-category-pnl-nature.enum';
import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';
import {
  OperationalExpenseDocumentKind,
  OperationalExpenseStatus,
} from '@modules/operational-expenses/domain/operational-expense.entity';
import type { PayrollEmployerCost } from '../domain/payroll-imponible';
import type {
  PayrollSettlementPaymentInput,
  PayrollSettlementPaymentLineInput,
} from './payroll-settlement-payment.util';

const INSTITUTIONAL_SUPPLIER_ALIAS = 'Cargas previsionales';

@Injectable()
export class PayrollAutoExpenseService {
  private readonly logger = new Logger(PayrollAutoExpenseService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    private readonly operationalExpenses: OperationalExpensesService,
  ) {}

  async ensureEmployeeSupplier(
    companyId: string,
    employee: Employee,
  ): Promise<Supplier> {
    const personId = employee.personId;
    if (!personId) {
      throw new Error('El empleado no tiene persona asociada');
    }
    const existing = await this.supplierRepo.findOne({
      where: { companyId, personId, deletedAt: IsNull() },
    });
    if (existing) return existing;

    const supplier = this.supplierRepo.create({
      id: uuid(),
      companyId,
      personId,
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'Empleado (nómina)',
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Creado automáticamente desde liquidación de sueldo',
    });
    return this.supplierRepo.save(supplier);
  }

  async ensureInstitutionalSupplier(companyId: string): Promise<Supplier> {
    const byAlias = await this.supplierRepo
      .createQueryBuilder('s')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.deletedAt IS NULL')
      .andWhere('s.alias = :alias', { alias: INSTITUTIONAL_SUPPLIER_ALIAS })
      .getOne();
    if (byAlias) return byAlias;

    const person = this.personRepo.create({
      companyId,
      type: PersonType.COMPANY,
      firstName: INSTITUTIONAL_SUPPLIER_ALIAS,
      businessName: INSTITUTIONAL_SUPPLIER_ALIAS,
      documentType: DocumentType.OTHER,
      documentNumber: `PREV-${companyId.slice(0, 8)}`,
    });
    const savedPerson = await this.personRepo.save(person);

    const supplier = this.supplierRepo.create({
      id: uuid(),
      companyId,
      personId: savedPerson.id,
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: INSTITUTIONAL_SUPPLIER_ALIAS,
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Proveedor institucional para cargas sociales de nómina',
    });
    return this.supplierRepo.save(supplier);
  }

  async ensureNominaCategory(
    companyId: string,
    name: 'Sueldos' | 'Cargas sociales',
  ): Promise<ExpenseCategory> {
    const found = await this.categoryRepo
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.name = :name', { name })
      .andWhere('c.deletedAt IS NULL')
      .getOne();
    if (found) return found;

    const cat = this.categoryRepo.create({
      id: uuid(),
      companyId,
      name,
      code: `EC-NOM-${name === 'Sueldos' ? 'SUE' : 'CAR'}-${uuid().slice(0, 8)}`,
      operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
      pnlNature: ExpenseCategoryPnlNature.ADMIN,
      nonDeletable: true,
      isActive: true,
    });
    return this.categoryRepo.save(cat);
  }

  private mapSettlementToOePayment(
    settlement: PayrollSettlementPaymentInput | undefined,
    amount: number,
    fallbackDate: string,
  ): {
    mode: string;
    partialPaidAmount?: number;
    paidLines: Array<Record<string, unknown>>;
    scheduledLines: Array<Record<string, unknown>>;
  } {
    const mapLine = (l: PayrollSettlementPaymentLineInput) => ({
      dueDate: l.dueDate,
      amount: l.amount,
      paymentMethod: l.paymentMethod ?? 'TRANSFER',
      companyBankAccountKey: l.companyBankAccountKey ?? null,
      supplierBankAccountKey:
        l.employeeBankAccountKey ?? l.supplierBankAccountKey ?? null,
      chequeNumber: l.chequeNumber ?? null,
      cashHubId: l.cashHubId ?? null,
    });

    if (!settlement || settlement.mode === 'PENDING') {
      return {
        mode: 'PENDING',
        paidLines: [],
        scheduledLines: [],
      };
    }
    if (settlement.mode === 'PENDING_SCHEDULED') {
      const lines =
        settlement.scheduledLines?.length > 0
          ? settlement.scheduledLines.map(mapLine)
          : [{ dueDate: fallbackDate, amount }];
      return { mode: 'PENDING_SCHEDULED', paidLines: [], scheduledLines: lines };
    }
    if (settlement.mode === 'COMPLETED') {
      const lines =
        settlement.paidLines?.length > 0
          ? settlement.paidLines.map(mapLine)
          : [{ dueDate: fallbackDate, amount, paymentMethod: 'TRANSFER' }];
      return { mode: 'COMPLETED', paidLines: lines, scheduledLines: [] };
    }
    // PARTIAL
    return {
      mode: 'PARTIAL',
      partialPaidAmount: settlement.partialPaidAmount,
      paidLines: (settlement.paidLines ?? []).map(mapLine),
      scheduledLines: (settlement.scheduledLines ?? []).map(mapLine),
    };
  }

  async createLinkedExpenses(opts: {
    companyId: string;
    branchId: string;
    userId: string;
    employee: Employee;
    payrollTransactionId: string;
    payrollDate: string;
    netPayment: number;
    employerCosts: PayrollEmployerCost[];
    settlementPayment?: PayrollSettlementPaymentInput;
    resultCenterId?: string | null;
  }): Promise<{ operationalExpenseIds: string[] }> {
    const ids: string[] = [];
    const employeeSupplier = await this.ensureEmployeeSupplier(
      opts.companyId,
      opts.employee,
    );
    const sueldosCat = await this.ensureNominaCategory(opts.companyId, 'Sueldos');

    if (opts.netPayment > 0) {
      const payment = this.mapSettlementToOePayment(
        opts.settlementPayment,
        opts.netPayment,
        opts.payrollDate,
      );
      const oe = await this.operationalExpenses.create({
        companyId: opts.companyId,
        branchId: opts.branchId,
        resultCenterId: opts.resultCenterId ?? undefined,
        categoryId: sueldosCat.id,
        supplierId: employeeSupplier.id,
        employeeId: opts.employee.id,
        name: `Sueldo líquido · liquidación ${opts.payrollDate}`,
        referenceNumber: `NOM-SUE-${opts.payrollTransactionId.slice(0, 8)}`,
        description: 'Generado automáticamente desde liquidación de sueldo',
        operationDate: opts.payrollDate,
        status: OperationalExpenseStatus.APPROVED,
        documentKind: OperationalExpenseDocumentKind.OTHER,
        fiscalAmounts: {
          subtotal: opts.netPayment,
          taxAmount: 0,
          total: opts.netPayment,
        },
        supplierDocumentPayment: payment as any,
        metadata: {
          origin: 'PAYROLL_AUTO',
          links: { payrollTransactionId: opts.payrollTransactionId },
        },
        createdBy: opts.userId,
      });
      ids.push(oe.id);
    }

    const totalEmployer = opts.employerCosts.reduce((s, c) => s + c.amount, 0);
    if (totalEmployer > 0) {
      const institutional = await this.ensureInstitutionalSupplier(opts.companyId);
      const cargasCat = await this.ensureNominaCategory(
        opts.companyId,
        'Cargas sociales',
      );
      const oe = await this.operationalExpenses.create({
        companyId: opts.companyId,
        branchId: opts.branchId,
        resultCenterId: opts.resultCenterId ?? undefined,
        categoryId: cargasCat.id,
        supplierId: institutional.id,
        employeeId: opts.employee.id,
        name: `Cargas sociales · liquidación ${opts.payrollDate}`,
        referenceNumber: `NOM-CAR-${opts.payrollTransactionId.slice(0, 8)}`,
        description: opts.employerCosts
          .map((c) => `${c.label}: ${c.amount}`)
          .join('; '),
        operationDate: opts.payrollDate,
        status: OperationalExpenseStatus.APPROVED,
        documentKind: OperationalExpenseDocumentKind.OTHER,
        fiscalAmounts: {
          subtotal: totalEmployer,
          taxAmount: 0,
          total: totalEmployer,
        },
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        metadata: {
          origin: 'PAYROLL_AUTO',
          employerCosts: opts.employerCosts,
          links: { payrollTransactionId: opts.payrollTransactionId },
        },
        createdBy: opts.userId,
      });
      ids.push(oe.id);
    }

    this.logger.log(
      `Payroll ${opts.payrollTransactionId}: created OE [${ids.join(', ')}]`,
    );
    return { operationalExpenseIds: ids };
  }
}
