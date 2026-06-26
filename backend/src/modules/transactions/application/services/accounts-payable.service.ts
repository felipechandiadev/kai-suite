import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, In } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '../../domain/transaction.entity';
import {
  AccountsPayableOriginCategory,
  resolveAccountsPayableOriginCategory,
} from '../helpers/accounts-payable-origin.util';

export type AccountsPayablePaymentType =
  | 'SUPPLIER_PAYMENT'
  | 'PAYROLL_PAYMENT'
  | 'EXPENSE_PAYMENT';

export interface AccountsPayableRowDto {
  id: string;
  paymentType: AccountsPayablePaymentType;
  documentNumber: string;
  parentTransactionId: string | null;
  parentDocumentNumber: string | null;
  parentType: string | null;
  payeeType: 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
  payeeId: string | null;
  payeeName: string | null;
  installmentNumber: number;
  totalInstallments: number;
  fromReceptionNumber: string | null;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  status: string;
  isOverdue: boolean;
  daysOverdue: number;
  paymentTransactionId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Origen de negocio: compra, gasto operativo, nómina. */
  originCategory: AccountsPayableOriginCategory;
  /** @deprecated use originCategory — kept for grid compatibility */
  sourceType: string;
}

export interface AccountsPayableListFilters {
  paymentType?: AccountsPayablePaymentType | AccountsPayablePaymentType[];
  originCategory?: AccountsPayableOriginCategory | AccountsPayableOriginCategory[];
  payeeType?: string;
  supplierId?: string;
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
  overdueOnly?: boolean;
  search?: string;
}

const PAYMENT_TYPES: TransactionType[] = [
  TransactionType.SUPPLIER_PAYMENT,
  TransactionType.PAYROLL_PAYMENT,
  TransactionType.EXPENSE_PAYMENT,
];

function matchesOriginCategoryFilter(
  rowCategory: AccountsPayableOriginCategory,
  filter: AccountsPayableOriginCategory | AccountsPayableOriginCategory[],
): boolean {
  const categories = Array.isArray(filter) ? filter : [filter];
  return categories.includes(rowCategory);
}

@Injectable()
export class AccountsPayableService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async list(filters?: AccountsPayableListFilters): Promise<AccountsPayableRowDto[]> {
    const qb = this.txRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('employee.person', 'employeePerson')
      .where('payment.transactionType IN (:...paymentTypes)', {
        paymentTypes: PAYMENT_TYPES,
      })
      .andWhere('payment.status = :draft', {
        draft: TransactionStatus.DRAFT,
      })
      .andWhere('payment.paymentStatus IN (:...pendingStatuses)', {
        pendingStatuses: [
          PaymentStatus.PENDING,
          PaymentStatus.PARTIAL,
          PaymentStatus.OVERDUE,
        ],
      });

    if (filters?.paymentType) {
      const types = Array.isArray(filters.paymentType)
        ? filters.paymentType
        : [filters.paymentType];
      qb.andWhere('payment.transactionType IN (:...filterTypes)', {
        filterTypes: types,
      });
    }

    if (filters?.supplierId) {
      qb.andWhere('payment.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters?.employeeId) {
      qb.andWhere('payment.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters?.payeeType === 'SUPPLIER') {
      qb.andWhere('payment.supplierId IS NOT NULL');
    } else if (filters?.payeeType === 'EMPLOYEE') {
      qb.andWhere('payment.employeeId IS NOT NULL');
    }

    if (filters?.fromDate) {
      qb.andWhere('payment.paymentDueDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters?.toDate) {
      qb.andWhere('payment.paymentDueDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters?.overdueOnly) {
      qb.andWhere('payment.paymentDueDate < :today', {
        today: new Date().toISOString().split('T')[0],
      });
    }

    const searchTerm = filters?.search?.trim();
    if (searchTerm) {
      qb.leftJoin(
        Transaction,
        'parent',
        'parent.id = payment.relatedTransactionId',
      );
      const like = `%${searchTerm}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('payment.documentNumber LIKE :like', { like })
            .orWhere('payment.externalReference LIKE :like', { like })
            .orWhere('parent.documentNumber LIKE :like', { like })
            .orWhere('parent.documentFolio LIKE :like', { like })
            .orWhere('supplierPerson.businessName LIKE :like', { like })
            .orWhere('supplierPerson.firstName LIKE :like', { like })
            .orWhere('supplierPerson.lastName LIKE :like', { like })
            .orWhere('employeePerson.firstName LIKE :like', { like })
            .orWhere('employeePerson.lastName LIKE :like', { like });
        }),
      );
    }

    qb.orderBy('payment.paymentDueDate', 'ASC');
    qb.addOrderBy('payment.createdAt', 'DESC');

    const payments = await qb.getMany();

    const parentIds = [
      ...new Set(
        payments
          .map((p) => p.relatedTransactionId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const parents =
      parentIds.length > 0
        ? await this.txRepo.find({ where: { id: In(parentIds) } })
        : [];
    const parentById = new Map(parents.map((p) => [p.id, p]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = payments
      .map((payment) => {
        const total = Number(payment.total || 0);
        const paid = Number(payment.amountPaid || 0);
        const pendingAmount = Math.max(0, total - paid);
        if (pendingAmount <= 0) {
          return null;
        }

        const parent = payment.relatedTransactionId
          ? parentById.get(payment.relatedTransactionId)
          : undefined;

        const meta = (payment.metadata as Record<string, unknown>) || {};
        const installmentNumber = Number(meta.installmentNumber ?? 1);
        const totalInstallments = Number(meta.totalInstallments ?? 1);

        const payee = this.resolvePayee(payment);
        const dueDateRaw = payment.paymentDueDate;
        const dueDate = dueDateRaw
          ? dueDateRaw instanceof Date
            ? dueDateRaw.toISOString().split('T')[0]
            : String(dueDateRaw).split('T')[0]
          : null;

        let isOverdue = false;
        let daysOverdue = 0;
        if (dueDate) {
          const due = new Date(dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            isOverdue = true;
            daysOverdue = Math.floor(
              (today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000),
            );
          }
        }

        const paymentType = payment.transactionType as AccountsPayablePaymentType;
        const originCategory = resolveAccountsPayableOriginCategory(
          payment.transactionType,
          parent,
        );

        return {
          id: payment.id,
          paymentType,
          originCategory,
          documentNumber: payment.documentNumber,
          parentTransactionId: payment.relatedTransactionId ?? null,
          parentDocumentNumber: parent?.documentNumber ?? null,
          parentType: parent?.transactionType
            ? String(parent.transactionType)
            : null,
          payeeType: payee.payeeType,
          payeeId: payee.payeeId,
          payeeName: payee.payeeName,
          installmentNumber,
          totalInstallments,
          fromReceptionNumber: parent?.documentNumber ?? null,
          amount: total,
          amountPaid: paid,
          pendingAmount,
          dueDate,
          status: isOverdue ? 'OVERDUE' : 'PENDING',
          isOverdue,
          daysOverdue,
          paymentTransactionId: payment.id,
          metadata: meta,
          createdAt:
            payment.createdAt instanceof Date
              ? payment.createdAt.toISOString()
              : String(payment.createdAt),
          sourceType: originCategory,
        };
      })
      .filter((row) => row !== null) as AccountsPayableRowDto[];

    if (filters?.originCategory) {
      return rows.filter((row) =>
        matchesOriginCategoryFilter(row.originCategory, filters.originCategory!),
      );
    }

    return rows;
  }

  async getPaymentContext(paymentId: string) {
    const payment = await this.txRepo.findOne({
      where: { id: paymentId },
      relations: ['supplier', 'supplier.person', 'employee', 'employee.person', 'branch', 'branch.company'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (!PAYMENT_TYPES.includes(payment.transactionType)) {
      throw new NotFoundException('No es un pago de cuentas por pagar');
    }

    const total = Number(payment.total || 0);
    const paid = Number(payment.amountPaid || 0);
    const pendingAmount = Math.max(0, total - paid);

    const supplierPerson = payment.supplier?.person;
    const employeePerson = payment.employee?.person;
    const supplierName =
      payment.supplier?.alias ||
      supplierPerson?.businessName ||
      [supplierPerson?.firstName, supplierPerson?.lastName].filter(Boolean).join(' ').trim() ||
      null;
    const employeeName = [employeePerson?.firstName, employeePerson?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || null;

    const payeeName = supplierName || employeeName || '—';
    const company = payment.branch?.company;
    const companyAccounts = company?.bankAccounts ?? [];
    const payeeAccounts =
      supplierPerson?.bankAccounts || employeePerson?.bankAccounts || [];

    return {
      payment: {
        id: payment.id,
        paymentType: payment.transactionType,
        documentNumber: payment.documentNumber ?? '-',
        payeeName,
        payeePersonId: supplierPerson?.id ?? employeePerson?.id ?? null,
        total,
        pendingAmount,
        paymentMethod: payment.paymentMethod ?? null,
        dueDate: payment.paymentDueDate,
      },
      supplierAccounts: payeeAccounts,
      companyAccounts,
    };
  }

  private resolvePayee(payment: Transaction): {
    payeeType: 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
    payeeId: string | null;
    payeeName: string | null;
  } {
    if (payment.supplierId) {
      const person = payment.supplier?.person;
      const name =
        payment.supplier?.alias ||
        person?.businessName ||
        [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() ||
        null;
      return {
        payeeType: 'SUPPLIER',
        payeeId: payment.supplierId,
        payeeName: name,
      };
    }
    if (payment.employeeId) {
      const person = payment.employee?.person;
      const name = [person?.firstName, person?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null;
      return {
        payeeType: 'EMPLOYEE',
        payeeId: payment.employeeId,
        payeeName: name,
      };
    }
    return { payeeType: 'OTHER', payeeId: null, payeeName: null };
  }
}
