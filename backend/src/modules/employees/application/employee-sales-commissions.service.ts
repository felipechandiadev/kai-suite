import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Employee } from '../domain/employee.entity';
import { EmploymentContract } from '../domain/employment-contract.entity';
import {
  EmploymentContractStatus,
  SalesCommissionType,
} from '../domain/employment-contract.enums';
import { User } from '@modules/users/domain/user.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

function requireCompanyId(): string {
  const companyId = TenantContext.getCompanyId();
  if (!companyId) {
    throw new NotFoundException('Empresa activa requerida');
  }
  return companyId;
}

export type SalesCommissionMonthSummary = {
  yearMonth: string;
  salesCount: number;
  /** Suma de montos netos (sin IVA, post-descuento) de ventas POS. */
  salesNetTotal: number;
  commissionTotal: number;
};

export type SalesCommissionSaleRow = {
  id: string;
  documentNumber: string;
  occurredAt: string;
  pointOfSaleName: string | null;
  /** Monto neto de la venta (base de comisión). */
  total: number;
  commission: number;
};

@Injectable()
export class EmployeeSalesCommissionsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(EmploymentContract)
    private readonly contracts: Repository<EmploymentContract>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(PointOfSale)
    private readonly pointsOfSale: Repository<PointOfSale>,
  ) {}

  async getSummary(
    employeeId: string,
    monthsCount = 12,
  ): Promise<{
    enabled: boolean;
    percent: number | null;
    linked: boolean;
    userIds: string[];
    months: SalesCommissionMonthSummary[];
  }> {
    const companyId = requireCompanyId();
    const employee = await this.requireEmployee(employeeId, companyId);
    const rule = await this.resolvePercentRule(employee.id, companyId);
    if (!rule.enabled) {
      return {
        enabled: false,
        percent: null,
        linked: false,
        userIds: [],
        months: [],
      };
    }

    const userIds = await this.resolveOperatorUserIds(employee.personId);
    const months = this.buildYearMonthKeys(monthsCount);
    if (userIds.length === 0) {
      return {
        enabled: true,
        percent: rule.percent,
        linked: false,
        userIds: [],
        months: months.map((yearMonth) => ({
          yearMonth,
          salesCount: 0,
          salesNetTotal: 0,
          commissionTotal: 0,
        })),
      };
    }

    const { from, to } = this.rangeForYearMonths(months);
    const sales = await this.transactions.find({
      where: {
        userId: In(userIds),
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
        pointOfSaleId: Not(IsNull()),
      },
      select: ['id', 'total', 'taxAmount', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    const inRange = sales.filter((s) => {
      const t = s.createdAt?.getTime?.() ?? new Date(s.createdAt).getTime();
      return t >= from.getTime() && t <= to.getTime();
    });

    const byMonth = new Map<string, SalesCommissionMonthSummary>();
    for (const ym of months) {
      byMonth.set(ym, {
        yearMonth: ym,
        salesCount: 0,
        salesNetTotal: 0,
        commissionTotal: 0,
      });
    }

    for (const sale of inRange) {
      const ym = this.toYearMonth(sale.createdAt);
      const bucket = byMonth.get(ym);
      if (!bucket) continue;
      const net = this.saleNetBase(sale);
      bucket.salesCount += 1;
      bucket.salesNetTotal += net;
      bucket.commissionTotal += this.roundClp((net * rule.percent) / 100);
    }

    return {
      enabled: true,
      percent: rule.percent,
      linked: true,
      userIds,
      months: months.map((ym) => byMonth.get(ym)!),
    };
  }

  async listSales(
    employeeId: string,
    yearMonth: string,
    page = 1,
    limit = 25,
  ): Promise<{
    enabled: boolean;
    percent: number | null;
    linked: boolean;
    items: SalesCommissionSaleRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const companyId = requireCompanyId();
    const employee = await this.requireEmployee(employeeId, companyId);
    const rule = await this.resolvePercentRule(employee.id, companyId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    if (!rule.enabled) {
      return {
        enabled: false,
        percent: null,
        linked: false,
        items: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
      };
    }

    const userIds = await this.resolveOperatorUserIds(employee.personId);
    if (userIds.length === 0) {
      return {
        enabled: true,
        percent: rule.percent,
        linked: false,
        items: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
      };
    }

    const { from, to } = this.rangeForSingleYearMonth(yearMonth);

    const qb = this.transactions
      .createQueryBuilder('tx')
      .where('tx.userId IN (:...userIds)', { userIds })
      .andWhere('tx.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
      .andWhere('tx.pointOfSaleId IS NOT NULL')
      .andWhere('tx.createdAt >= :from', { from })
      .andWhere('tx.createdAt <= :to', { to })
      .orderBy('tx.createdAt', 'DESC');

    const total = await qb.getCount();
    const rows = await qb
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const posIds = [
      ...new Set(
        rows
          .map((r) => r.pointOfSaleId)
          .filter((id): id is string => typeof id === 'string' && !!id.trim()),
      ),
    ];
    const posNameById = new Map<string, string>();
    if (posIds.length > 0) {
      const posRows = await this.pointsOfSale.find({
        where: { id: In(posIds) },
        select: ['id', 'name'],
      });
      for (const p of posRows) {
        posNameById.set(p.id, p.name?.trim() || p.id);
      }
    }

    const items: SalesCommissionSaleRow[] = rows.map((r) => {
      const netAmt = this.saleNetBase(r);
      return {
        id: r.id,
        documentNumber: r.documentNumber ?? '—',
        occurredAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
        pointOfSaleName: r.pointOfSaleId
          ? posNameById.get(r.pointOfSaleId) ?? null
          : null,
        total: netAmt,
        commission: this.roundClp((netAmt * rule.percent) / 100),
      };
    });

    return {
      enabled: true,
      percent: rule.percent,
      linked: true,
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  private async requireEmployee(employeeId: string, companyId: string) {
    const employee = await this.employees.findOne({
      where: { id: employeeId, companyId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return employee;
  }

  private async resolvePercentRule(
    employeeId: string,
    companyId: string,
  ): Promise<{ enabled: true; percent: number } | { enabled: false }> {
    const contract = await this.contracts.findOne({
      where: {
        companyId,
        employeeId,
        status: EmploymentContractStatus.ACTIVE,
      },
    });
    if (!contract) return { enabled: false };
    if (contract.salesCommissionType !== SalesCommissionType.PERCENT) {
      return { enabled: false };
    }
    const percent = Number(contract.salesCommissionValue);
    if (!Number.isFinite(percent) || percent <= 0) {
      return { enabled: false };
    }
    return { enabled: true, percent };
  }

  private async resolveOperatorUserIds(personId: string): Promise<string[]> {
    const users = await this.users
      .createQueryBuilder('u')
      .where('u.personId = :personId', { personId })
      .select(['u.id'])
      .getMany();
    return users.map((u) => u.id);
  }

  private buildYearMonthKeys(count: number): string[] {
    const n = Math.min(36, Math.max(1, count));
    const keys: string[] = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      keys.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      );
    }
    return keys;
  }

  private toYearMonth(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private rangeForYearMonths(yearMonths: string[]): { from: Date; to: Date } {
    const sorted = [...yearMonths].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const from = this.rangeForSingleYearMonth(first).from;
    const to = this.rangeForSingleYearMonth(last).to;
    return { from, to };
  }

  private rangeForSingleYearMonth(yearMonth: string): { from: Date; to: Date } {
    const m = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || '').trim());
    if (!m) {
      const now = new Date();
      const y = now.getUTCFullYear();
      const mo = now.getUTCMonth();
      return {
        from: new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0)),
        to: new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59, 999)),
      };
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    return {
      from: new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59, 999)),
    };
  }

  private roundClp(n: unknown): number {
    return Math.round(Number(n) || 0);
  }

  /** Neto post-descuento = total cobrado − IVA (no usa monto bruto). */
  private saleNetBase(sale: {
    total?: unknown;
    taxAmount?: unknown;
  }): number {
    return Math.max(
      0,
      this.roundClp(sale.total) - this.roundClp(sale.taxAmount),
    );
  }
}
