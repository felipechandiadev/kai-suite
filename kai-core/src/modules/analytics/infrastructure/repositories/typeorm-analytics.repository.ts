import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { AnalyticsRepositoryPort } from '../../application/ports/analytics.repository.port';
import {
  resolveTrendRange,
  type ResolvedAnalyticsPeriod,
} from '../../application/analytics-period.util';
import type {
  AnalyticsDashboardResponse,
  AnalyticsOperationQueueItem,
  AnalyticsQueryParams,
  AnalyticsTrendPoint,
} from '../../domain/analytics.types';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import {
  Employee,
  EmployeeStatus,
} from '@modules/employees/domain/employee.entity';
import {
  OperationalExpense,
  OperationalExpenseStatus,
} from '@modules/operational-expenses/domain/operational-expense.entity';
import {
  Installment,
  InstallmentSourceType,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';

const EXCLUDED_TX_STATUSES = [
  TransactionStatus.CANCELLED,
  TransactionStatus.VOIDED,
];

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

@Injectable()
export class TypeOrmAnalyticsRepository implements AnalyticsRepositoryPort {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(OperationalExpense)
    private readonly operationalExpenseRepository: Repository<OperationalExpense>,
    @InjectRepository(Installment)
    private readonly installmentRepository: Repository<Installment>,
  ) {}

  async getDashboard(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    opts: AnalyticsQueryParams,
  ): Promise<AnalyticsDashboardResponse> {
    const branchId = opts.branchId?.trim() || undefined;
    const trendPeriod = resolveTrendRange(period.to, opts.trendMonths ?? 12);

    const [
      salesToday,
      salesMtd,
      purchasesMtd,
      openPurchaseOrders,
      thresholdAlertCount,
      outOfStockCount,
      activeCustomers,
      newCustomersMtd,
      openQuotations,
      activeBackorders,
      openCashSessions,
      receivablesOutstanding,
      overdueInstallments,
      activeEmployees,
      payrollNetMtd,
      expensesMtd,
      expensesPendingApproval,
      trends,
      operations,
    ] = await Promise.all([
      this.sumSales(companyId, this.todayRange(), branchId),
      this.aggregateSales(companyId, period, branchId),
      this.sumPurchases(companyId, period, branchId),
      this.countOpenPurchaseOrders(companyId, branchId),
      this.countThresholdAlerts(companyId),
      this.countOutOfStock(companyId),
      this.countActiveCustomers(companyId),
      this.countNewCustomers(companyId, period),
      this.countOpenQuotations(companyId, branchId),
      this.countActiveBackorders(companyId, branchId),
      this.countOpenCashSessions(companyId, branchId),
      this.sumReceivablesOutstanding(companyId),
      this.countOverdueInstallments(companyId),
      this.countActiveEmployees(companyId, branchId),
      this.sumPayroll(companyId, period, branchId),
      this.aggregateExpenses(companyId, period, branchId),
      this.countExpensesPendingApproval(companyId, branchId),
      this.loadTrends(companyId, trendPeriod, branchId),
      this.getOperationsQueues(companyId, period, branchId),
    ]);

    const mtdAverageTicket =
      salesMtd.count > 0 ? Math.round(salesMtd.total / salesMtd.count) : 0;

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      sales: {
        today: salesToday,
        mtd: salesMtd.total,
        mtdCount: salesMtd.count,
        mtdAverageTicket,
      },
      purchases: {
        mtd: purchasesMtd,
        openPurchaseOrders,
      },
      inventory: {
        thresholdAlertCount,
        outOfStockCount,
      },
      commercial: {
        activeCustomers,
        newCustomersMtd,
        openQuotations,
        activeBackorders,
      },
      treasury: {
        openCashSessions,
        receivablesOutstanding,
        overdueInstallments,
      },
      hr: {
        activeEmployees,
        payrollNetMtd,
      },
      expenses: {
        countMtd: expensesMtd.count,
        totalMtd: expensesMtd.total,
        netMtd: expensesMtd.net,
        pendingApproval: expensesPendingApproval,
      },
      trends,
      operations,
      salesToday,
      totalCustomers: activeCustomers,
      lowStockItems: thresholdAlertCount,
      openOrders: openPurchaseOrders,
    };
  }

  async getSalesTrends(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsTrendPoint[]> {
    const trends = await this.loadTrends(companyId, period, branchId);
    return trends.sales;
  }

  async getPurchasesTrends(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsTrendPoint[]> {
    const trends = await this.loadTrends(companyId, period, branchId);
    return trends.purchases;
  }

  async getOperationsQueues(
    companyId: string,
    _period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsOperationQueueItem[]> {
    const [
      openPurchaseOrders,
      openQuotations,
      activeBackorders,
      overdueInstallments,
      openCashSessions,
      thresholdAlertCount,
      expensesPendingApproval,
      transfersInProgress,
    ] = await Promise.all([
      this.countOpenPurchaseOrders(companyId, branchId),
      this.countOpenQuotations(companyId, branchId),
      this.countActiveBackorders(companyId, branchId),
      this.countOverdueInstallments(companyId),
      this.countOpenCashSessions(companyId, branchId),
      this.countThresholdAlerts(companyId),
      this.countExpensesPendingApproval(companyId, branchId),
      this.countTransfersInProgress(companyId, branchId),
    ]);

    const [payrollNetMtd] = await Promise.all([
      this.sumPayroll(companyId, _period, branchId),
    ]);

    return [
      {
        key: 'open_purchase_orders',
        label: 'Órdenes de compra abiertas',
        value: openPurchaseOrders,
        kind: 'count',
      },
      {
        key: 'open_quotations',
        label: 'Cotizaciones sin convertir',
        value: openQuotations,
        kind: 'count',
      },
      {
        key: 'active_backorders',
        label: 'Pedidos pendientes (backorder)',
        value: activeBackorders,
        kind: 'count',
      },
      {
        key: 'overdue_installments',
        label: 'Cuotas vencidas',
        value: overdueInstallments,
        kind: 'count',
      },
      {
        key: 'open_cash_sessions',
        label: 'Sesiones de caja abiertas',
        value: openCashSessions,
        kind: 'count',
      },
      {
        key: 'stock_threshold_alerts',
        label: 'SKU bajo mínimo',
        value: thresholdAlertCount,
        kind: 'count',
      },
      {
        key: 'expenses_pending_approval',
        label: 'Gastos pendientes de aprobación',
        value: expensesPendingApproval,
        kind: 'count',
      },
      {
        key: 'transfers_in_progress',
        label: 'Transferencias entre bodegas en curso',
        value: transfersInProgress,
        kind: 'count',
      },
      {
        key: 'payroll_mtd',
        label: 'Nómina liquidada (período)',
        value: payrollNetMtd,
        kind: 'money',
      },
    ];
  }

  private todayRange(): ResolvedAnalyticsPeriod {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private applyBranchFilter(
    qb: ReturnType<Repository<Transaction>['createQueryBuilder']>,
    branchId: string | undefined,
    alias = 't',
  ) {
    if (branchId) {
      qb.andWhere(`${alias}.branchId = :branchId`, { branchId });
    }
    return qb;
  }

  private async sumSales(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'sum')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });
    this.applyBranchFilter(qb, branchId);
    const raw = await qb.getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  private async aggregateSales(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<{ total: number; count: number }> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)::int', 'count')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });
    this.applyBranchFilter(qb, branchId);
    const raw = await qb.getRawOne<{ total: string; count: string }>();
    return {
      total: Number(raw?.total ?? 0),
      count: Number(raw?.count ?? 0),
    };
  }

  private async sumPurchases(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'sum')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });
    this.applyBranchFilter(qb, branchId);
    const raw = await qb.getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  private async countOpenPurchaseOrders(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const where: Record<string, unknown> = {
      companyId,
      transactionType: TransactionType.PURCHASE_ORDER,
      status: Not(
        In([
          TransactionStatus.CANCELLED,
          TransactionStatus.COMPLETED,
          TransactionStatus.VOIDED,
        ]),
      ),
    };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.transactionRepository.count({ where: where as never });
  }

  private async countOutOfStock(companyId: string): Promise<number> {
    return this.stockLevelRepository
      .createQueryBuilder('sl')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere('sl.availableStock <= 0')
      .getCount();
  }

  private async countThresholdAlerts(companyId: string): Promise<number> {
    return this.stockLevelRepository
      .createQueryBuilder('sl')
      .innerJoin('sl.variant', 'pv')
      .where('sl.companyId = :companyId', { companyId })
      .andWhere(
        'COALESCE(sl.minimumStockEnabled, pv.minimumStockEnabled, false) = true',
      )
      .andWhere(
        `sl.availableStock < COALESCE(NULLIF(sl.minimumStock, 0), NULLIF(pv.minimumStock, 0), 999999999)`,
      )
      .getCount();
  }

  private async countActiveCustomers(companyId: string): Promise<number> {
    return this.customerRepository.count({
      where: { companyId, isActive: true },
    });
  }

  private async countNewCustomers(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
  ): Promise<number> {
    return this.customerRepository
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId })
      .andWhere('c.createdAt >= :from', { from: range.from })
      .andWhere('c.createdAt <= :to', { to: range.to })
      .getCount();
  }

  private async countOpenQuotations(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.QUOTATION })
      .andWhere('t.status = :status', { status: TransactionStatus.CONFIRMED })
      .andWhere(
        `(t.metadata->'quotation'->>'convertedToTransactionId') IS NULL`,
      );
    this.applyBranchFilter(qb, branchId);
    return qb.getCount();
  }

  private async countActiveBackorders(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.BACKORDER })
      .andWhere('t.status NOT IN (:...excluded)', {
        excluded: [
          TransactionStatus.CANCELLED,
          TransactionStatus.COMPLETED,
          TransactionStatus.VOIDED,
        ],
      });
    this.applyBranchFilter(qb, branchId);
    return qb.getCount();
  }

  private async countOpenCashSessions(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    if (!branchId) {
      return this.cashSessionRepository.count({
        where: { companyId, status: CashSessionStatus.OPEN },
      });
    }
    return this.cashSessionRepository
      .createQueryBuilder('cs')
      .innerJoin('cs.pointOfSale', 'pos')
      .where('cs.companyId = :companyId', { companyId })
      .andWhere('cs.status = :status', { status: CashSessionStatus.OPEN })
      .andWhere('pos.branchId = :branchId', { branchId })
      .getCount();
  }

  private async sumReceivablesOutstanding(companyId: string): Promise<number> {
    const raw = await this.installmentRepository
      .createQueryBuilder('i')
      .select(
        'COALESCE(SUM(GREATEST(i.amount - i.amountPaid, 0)), 0)',
        'sum',
      )
      .where('i.companyId = :companyId', { companyId })
      .andWhere('i.sourceType = :sourceType', {
        sourceType: InstallmentSourceType.SALE,
      })
      .andWhere('i.status IN (:...statuses)', {
        statuses: [
          InstallmentStatus.PENDING,
          InstallmentStatus.PARTIAL,
          InstallmentStatus.OVERDUE,
        ],
      })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  private async countOverdueInstallments(companyId: string): Promise<number> {
    return this.installmentRepository.count({
      where: {
        companyId,
        status: InstallmentStatus.OVERDUE,
      },
    });
  }

  private async countActiveEmployees(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const where: Record<string, unknown> = {
      companyId,
      status: EmployeeStatus.ACTIVE,
    };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.employeeRepository.count({ where: where as never });
  }

  private async sumPayroll(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'sum')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.PAYROLL })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to });
    this.applyBranchFilter(qb, branchId);
    const raw = await qb.getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  private async aggregateExpenses(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<{ count: number; total: number; net: number }> {
    const qb = this.operationalExpenseRepository
      .createQueryBuilder('oe')
      .select('COUNT(*)::int', 'count')
      .addSelect(
        `COALESCE(SUM(
          CAST(oe.metadata->'linkedTributaryDocument'->>'totalAmount' AS DECIMAL)
        ), 0)`,
        'total',
      )
      .addSelect(
        `COALESCE(SUM(
          CAST(oe.metadata->'linkedTributaryDocument'->>'netAmount' AS DECIMAL)
        ), 0)`,
        'net',
      )
      .where('oe.companyId = :companyId', { companyId })
      .andWhere('oe.status NOT IN (:...excluded)', {
        excluded: [
          OperationalExpenseStatus.CANCELLED,
          OperationalExpenseStatus.REJECTED,
        ],
      })
      .andWhere('oe.operationDate >= :fromDate', {
        fromDate: range.from.toISOString().slice(0, 10),
      })
      .andWhere('oe.operationDate <= :toDate', {
        toDate: range.to.toISOString().slice(0, 10),
      });
    if (branchId) {
      qb.andWhere('oe.branchId = :branchId', { branchId });
    }
    const raw = await qb.getRawOne<{ count: string; total: string; net: string }>();
    return {
      count: Number(raw?.count ?? 0),
      total: Number(raw?.total ?? 0),
      net: Number(raw?.net ?? 0),
    };
  }

  private async countExpensesPendingApproval(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const where: Record<string, unknown> = {
      companyId,
      status: OperationalExpenseStatus.PENDING_APPROVAL,
    };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.operationalExpenseRepository.count({ where: where as never });
  }

  private async countTransfersInProgress(
    companyId: string,
    branchId?: string,
  ): Promise<number> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', {
        type: TransactionType.TRANSFER_OUT,
      })
      .andWhere('t.status IN (:...statuses)', {
        statuses: [TransactionStatus.CONFIRMED, TransactionStatus.PENDING],
      });
    this.applyBranchFilter(qb, branchId);
    return qb.getCount();
  }

  private async loadTrends(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<{ sales: AnalyticsTrendPoint[]; purchases: AnalyticsTrendPoint[] }> {
    const [salesRows, purchaseRows] = await Promise.all([
      this.monthlyTotals(companyId, range, TransactionType.SALE, branchId),
      this.monthlyTotals(companyId, range, TransactionType.PURCHASE, branchId),
    ]);
    const salesMap = new Map(salesRows.map((r) => [r.period, r.total]));
    const purchaseMap = new Map(purchaseRows.map((r) => [r.period, r.total]));
    const periods = this.enumerateMonths(range.from, range.to);

    const sales: AnalyticsTrendPoint[] = [];
    const purchases: AnalyticsTrendPoint[] = [];
    for (const period of periods) {
      const label = this.monthLabel(period);
      sales.push({
        period,
        label,
        total: salesMap.get(period) ?? 0,
      });
      purchases.push({
        period,
        label,
        total: purchaseMap.get(period) ?? 0,
      });
    }
    return { sales, purchases };
  }

  private async monthlyTotals(
    companyId: string,
    range: ResolvedAnalyticsPeriod,
    type: TransactionType,
    branchId?: string,
  ): Promise<Array<{ period: string; total: number }>> {
    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select(`TO_CHAR(DATE_TRUNC('month', t."createdAt"), 'YYYY-MM')`, 'period')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type })
      .andWhere('t.status NOT IN (:...excluded)', { excluded: EXCLUDED_TX_STATUSES })
      .andWhere('t.createdAt >= :from', { from: range.from })
      .andWhere('t.createdAt <= :to', { to: range.to })
      .groupBy(`DATE_TRUNC('month', t."createdAt")`)
      .orderBy(`DATE_TRUNC('month', t."createdAt")`, 'ASC');
    this.applyBranchFilter(qb, branchId);
    const rows = await qb.getRawMany<{ period: string; total: string }>();
    return rows.map((r) => ({
      period: r.period,
      total: Number(r.total ?? 0),
    }));
  }

  private enumerateMonths(from: Date, to: Date): string[] {
    const periods: string[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      periods.push(`${y}-${m}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return periods;
  }

  private monthLabel(period: string): string {
    const month = Number(period.split('-')[1]);
    return MONTH_LABELS[month - 1] ?? period;
  }
}
