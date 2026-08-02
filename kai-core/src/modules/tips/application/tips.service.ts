import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { TipDistributionMode } from '@modules/companies/domain/company-tips.types';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import {
  TipCaptureStatus,
  TipLedgerEntry,
  TipLedgerStatus,
} from '../domain/tip-ledger-entry.entity';
import {
  TIP_CARD_DUE_BUSINESS_DAYS,
  addBusinessDaysUtc,
  isCardTipPaymentMethod,
} from '../domain/tip-business-days.util';
import { distributeByWeights } from '../domain/tip-distribute.util';

export type TipFromSaleInput = {
  companyId: string;
  branchId?: string | null;
  saleTransactionId: string;
  diningOrderId?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentMethod?: string | null;
};

/** Asiento de tip con nombre de trabajador (API). */
export type TipLedgerEntryView = TipLedgerEntry & {
  employeeName?: string | null;
};

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function personDisplayName(person: {
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
} | null | undefined): string | null {
  if (!person) return null;
  const full = [person.firstName, person.lastName]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  if (full) return full;
  const biz = (person.businessName ?? '').trim();
  return biz || null;
}

function parseMoney(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function parseTipStatus(raw: unknown): TipCaptureStatus {
  const s = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (
    s === TipCaptureStatus.ACCEPTED ||
    s === TipCaptureStatus.CUSTOM ||
    s === TipCaptureStatus.DECLINED ||
    s === TipCaptureStatus.SUGGESTED ||
    s === TipCaptureStatus.NONE
  ) {
    return s;
  }
  return TipCaptureStatus.NONE;
}

export function tipAmountOpen(entry: TipLedgerEntry): number {
  return Math.max(0, parseMoney(entry.amount) - parseMoney(entry.amountPaid));
}

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);

  constructor(
    @InjectRepository(TipLedgerEntry)
    private readonly ledgerRepo: Repository<TipLedgerEntry>,
    @InjectRepository(DiningOrder)
    private readonly diningOrderRepo: Repository<DiningOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCompanyPerson)
    private readonly userCompanyPersonRepo: Repository<UserCompanyPerson>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmploymentContract)
    private readonly contractRepo: Repository<EmploymentContract>,
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * Tras crear una SALE: si tips enabled y tipAmount > 0, registra ACCRUED.
   * Idempotente por saleTransactionId.
   */
  async maybeRecordFromSale(input: TipFromSaleInput): Promise<TipLedgerEntry | null> {
    const settings = await this.companiesService.getTipSettings(input.companyId);
    if (!settings.enabled) return null;

    const meta = input.metadata ?? {};
    const tipAmount = parseMoney(meta.tipAmount);
    const tipStatus = parseTipStatus(meta.tipStatus);

    if (tipAmount <= 0 || tipStatus === TipCaptureStatus.DECLINED) {
      return null;
    }

    const existing = await this.ledgerRepo.findOne({
      where: { saleTransactionId: input.saleTransactionId },
    });
    if (existing) return existing;

    const suggestedAmount = parseMoney(meta.tipSuggestedAmount);
    const suggestPercent =
      meta.tipPercentApplied != null
        ? parseMoney(meta.tipPercentApplied)
        : settings.suggestPercent;

    const paymentMethod = input.paymentMethod ?? null;
    const dueAt = isCardTipPaymentMethod(paymentMethod)
      ? addBusinessDaysUtc(new Date(), TIP_CARD_DUE_BUSINESS_DAYS)
      : null;

    let employeeId =
      typeof meta.tipEmployeeId === 'string' && meta.tipEmployeeId.trim()
        ? meta.tipEmployeeId.trim()
        : null;

    if (
      !employeeId &&
      settings.distributionMode === 'DIRECT' &&
      input.diningOrderId
    ) {
      employeeId = await this.resolveEmployeeFromDiningOrder(
        input.companyId,
        input.diningOrderId,
      );
    }

    const now = employeeId ? new Date() : null;

    const row = this.ledgerRepo.create({
      companyId: input.companyId,
      branchId: input.branchId ?? null,
      saleTransactionId: input.saleTransactionId,
      diningOrderId: input.diningOrderId ?? null,
      amount: money(tipAmount),
      amountPaid: money(0),
      status: TipLedgerStatus.ACCRUED,
      tipStatus:
        tipStatus === TipCaptureStatus.NONE
          ? TipCaptureStatus.ACCEPTED
          : tipStatus,
      suggestPercent: money(suggestPercent),
      suggestedAmount: suggestedAmount > 0 ? money(suggestedAmount) : null,
      paymentMethod,
      employeeId,
      dueAt,
      attributedAt: now,
      payoutTransactionId: null,
    });

    try {
      return await this.ledgerRepo.save(row);
    } catch (err) {
      this.logger.warn(
        `Tip ledger save failed for sale ${input.saleTransactionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private async resolveEmployeeFromDiningOrder(
    companyId: string,
    diningOrderId: string,
  ): Promise<string | null> {
    const order = await this.diningOrderRepo.findOne({
      where: { id: diningOrderId, companyId },
    });
    const userId = order?.openedByUserId?.trim();
    if (!userId) return null;

    const link = await this.userCompanyPersonRepo.findOne({
      where: { userId, companyId },
    });
    let personId = link?.personId?.trim() || null;
    if (!personId) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['person'],
      });
      personId = user?.person?.id?.trim() || null;
    }
    if (!personId) return null;
    const employee = await this.employeeRepo.findOne({
      where: { companyId, personId, deletedAt: IsNull() },
    });
    return employee?.id ?? null;
  }

  async listEntries(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
    status?: TipLedgerStatus;
    employeeId?: string;
    overdueOnly?: boolean;
    limit?: number;
  }): Promise<TipLedgerEntryView[]> {
    const take = Math.min(Math.max(params.limit ?? 200, 1), 500);
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId: params.companyId })
      .orderBy('t.createdAt', 'DESC')
      .take(take);

    if (params.status) {
      qb.andWhere('t.status = :status', { status: params.status });
    }
    if (params.employeeId) {
      qb.andWhere('t.employeeId = :employeeId', {
        employeeId: params.employeeId,
      });
    }
    if (params.dateFrom) {
      qb.andWhere('t.createdAt >= :from', {
        from: `${params.dateFrom}T00:00:00.000Z`,
      });
    }
    if (params.dateTo) {
      qb.andWhere('t.createdAt <= :to', {
        to: `${params.dateTo}T23:59:59.999Z`,
      });
    }
    if (params.overdueOnly) {
      qb.andWhere('t.status = :accrued', { accrued: TipLedgerStatus.ACCRUED });
      qb.andWhere('t.dueAt IS NOT NULL');
      qb.andWhere('t.dueAt <= :now', { now: new Date() });
      qb.andWhere('t.amount > t.amountPaid');
    }
    const rows = await qb.getMany();
    return this.attachEmployeeNames(params.companyId, rows);
  }

  async listOverdue(companyId: string): Promise<{
    items: TipLedgerEntryView[];
    overdueTotal: number;
    overdueCount: number;
  }> {
    const items = await this.listEntries({
      companyId,
      overdueOnly: true,
      limit: 500,
    });
    let overdueTotal = 0;
    for (const e of items) overdueTotal += tipAmountOpen(e);
    return {
      items,
      overdueTotal: Math.round(overdueTotal * 100) / 100,
      overdueCount: items.length,
    };
  }

  async summary(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    accruedTotal: number;
    accruedCount: number;
    overdueTotal: number;
    overdueCount: number;
    byDay: Array<{ date: string; total: number; count: number }>;
  }> {
    const entries = await this.listEntries({
      ...params,
      status: TipLedgerStatus.ACCRUED,
      limit: 500,
    });
    let accruedTotal = 0;
    let overdueTotal = 0;
    let overdueCount = 0;
    const now = Date.now();
    const dayMap = new Map<string, { total: number; count: number }>();
    for (const e of entries) {
      const open = tipAmountOpen(e);
      accruedTotal += open;
      if (e.dueAt && e.dueAt.getTime() <= now && open > 0) {
        overdueTotal += open;
        overdueCount += 1;
      }
      const day = e.createdAt.toISOString().slice(0, 10);
      const cur = dayMap.get(day) ?? { total: 0, count: 0 };
      cur.total += open;
      cur.count += 1;
      dayMap.set(day, cur);
    }
    const byDay = [...dayMap.entries()]
      .map(([date, v]) => ({ date, total: v.total, count: v.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      accruedTotal: Math.round(accruedTotal * 100) / 100,
      accruedCount: entries.length,
      overdueTotal: Math.round(overdueTotal * 100) / 100,
      overdueCount,
      byDay,
    };
  }

  async balancesByEmployee(companyId: string): Promise<{
    poolOpen: number;
    byEmployee: Array<{
      employeeId: string | null;
      employeeName: string | null;
      openAmount: number;
      entryCount: number;
    }>;
  }> {
    const entries = await this.ledgerRepo.find({
      where: { companyId, status: TipLedgerStatus.ACCRUED },
      take: 2000,
    });
    const map = new Map<
      string | null,
      { openAmount: number; entryCount: number }
    >();
    let poolOpen = 0;
    for (const e of entries) {
      const open = tipAmountOpen(e);
      if (open <= 0) continue;
      const key = e.employeeId ?? null;
      if (key == null) poolOpen += open;
      const cur = map.get(key) ?? { openAmount: 0, entryCount: 0 };
      cur.openAmount += open;
      cur.entryCount += 1;
      map.set(key, cur);
    }
    const ids = [...map.keys()].filter((id): id is string => !!id);
    const names = await this.employeeNameMap(companyId, ids);
    const byEmployee = [...map.entries()].map(([employeeId, v]) => ({
      employeeId,
      employeeName: employeeId ? (names.get(employeeId) ?? null) : null,
      openAmount: Math.round(v.openAmount * 100) / 100,
      entryCount: v.entryCount,
    }));
    byEmployee.sort((a, b) => b.openAmount - a.openAmount);
    return {
      poolOpen: Math.round(poolOpen * 100) / 100,
      byEmployee,
    };
  }

  private async employeeNameMap(
    companyId: string,
    employeeIds: string[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const ids = [...new Set(employeeIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return out;
    const employees = await this.employeeRepo.find({
      where: { companyId, id: In(ids), deletedAt: IsNull() },
      relations: ['person'],
    });
    for (const emp of employees) {
      const name = personDisplayName(emp.person);
      if (name) out.set(emp.id, name);
    }
    return out;
  }

  private async attachEmployeeNames(
    companyId: string,
    rows: TipLedgerEntry[],
  ): Promise<TipLedgerEntryView[]> {
    const ids = rows
      .map((r) => r.employeeId)
      .filter((id): id is string => typeof id === 'string' && !!id.trim());
    const names = await this.employeeNameMap(companyId, ids);
    return rows.map((r) => {
      const employeeName = r.employeeId
        ? (names.get(r.employeeId) ?? null)
        : null;
      return Object.assign(r, { employeeName }) as TipLedgerEntryView;
    });
  }

  /**
   * Atribuye tips ACCRUED sin employeeId según acuerdo POOL/POINTS.
   * Asigna entries enteras al cupo de cada trabajador (acuerdo de trabajadores).
   */
  async attributeOpenTips(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ attributedCount: number; attributedTotal: number }> {
    const settings = await this.companiesService.getTipSettings(params.companyId);
    const mode: TipDistributionMode = settings.distributionMode;
    if (mode !== 'POOL' && mode !== 'POINTS') {
      throw new BadRequestException(
        'Atribución masiva solo aplica con distributionMode POOL o POINTS (acuerdo de trabajadores).',
      );
    }

    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId: params.companyId })
      .andWhere('t.status = :status', { status: TipLedgerStatus.ACCRUED })
      .andWhere('t.employeeId IS NULL')
      .andWhere('t.amount > t.amountPaid');
    if (params.dateFrom) {
      qb.andWhere('t.createdAt >= :from', {
        from: `${params.dateFrom}T00:00:00.000Z`,
      });
    }
    if (params.dateTo) {
      qb.andWhere('t.createdAt <= :to', {
        to: `${params.dateTo}T23:59:59.999Z`,
      });
    }
    const unattributed = await qb.getMany();
    if (unattributed.length === 0) {
      return { attributedCount: 0, attributedTotal: 0 };
    }

    const recipients = await this.resolveDistributionRecipients(
      params.companyId,
      settings.distributionWeights,
    );
    if (recipients.length === 0) {
      throw new BadRequestException(
        'No hay trabajadores tipsEligible (ni pesos en distributionWeights) para atribuir.',
      );
    }

    return this.attributeOpenTipsAsPoolShares({
      companyId: params.companyId,
      unattributed,
      recipients,
    });
  }

  /**
   * Atribuye el pozo: marca cada entry al "bucket" del empleado según peso del total.
   * Implementación: asigna entries enteras al empleado con mayor remanente de cuota.
   */
  private async attributeOpenTipsAsPoolShares(params: {
    companyId: string;
    unattributed: TipLedgerEntry[];
    recipients: Array<{ id: string; weight: number }>;
  }): Promise<{ attributedCount: number; attributedTotal: number }> {
    const totalOpen = params.unattributed.reduce(
      (a, e) => a + tipAmountOpen(e),
      0,
    );
    const targets = distributeByWeights(totalOpen, params.recipients);
    const remaining = new Map(targets.map((t) => [t.id, t.amount]));
    const now = new Date();
    let attributedCount = 0;
    let attributedTotal = 0;

    const sorted = [...params.unattributed].sort(
      (a, b) => tipAmountOpen(b) - tipAmountOpen(a),
    );

    for (const entry of sorted) {
      const open = tipAmountOpen(entry);
      if (open <= 0) continue;
      let bestId: string | null = null;
      let bestRem = -1;
      for (const [id, rem] of remaining) {
        if (rem >= open && rem > bestRem) {
          bestRem = rem;
          bestId = id;
        }
      }
      if (!bestId) {
        // Assign to whoever has largest remaining (even if < open)
        for (const [id, rem] of remaining) {
          if (rem > bestRem) {
            bestRem = rem;
            bestId = id;
          }
        }
      }
      if (!bestId) continue;
      entry.employeeId = bestId;
      entry.attributedAt = now;
      await this.ledgerRepo.save(entry);
      remaining.set(bestId, Math.max(0, (remaining.get(bestId) ?? 0) - open));
      attributedCount += 1;
      attributedTotal += open;
    }

    return {
      attributedCount,
      attributedTotal: Math.round(attributedTotal * 100) / 100,
    };
  }

  private async resolveDistributionRecipients(
    companyId: string,
    weights: Record<string, number>,
  ): Promise<Array<{ id: string; weight: number }>> {
    const weightEntries = Object.entries(weights).filter(
      ([, w]) => Number(w) > 0,
    );
    if (weightEntries.length > 0) {
      return weightEntries.map(([id, weight]) => ({ id, weight: Number(weight) }));
    }

    const contracts = await this.contractRepo.find({
      where: { companyId, tipsEligible: true },
      take: 500,
    });
    const employeeIds = [
      ...new Set(contracts.map((c) => c.employeeId).filter(Boolean)),
    ];
    if (employeeIds.length === 0) return [];
    const employees = await this.employeeRepo.find({
      where: { id: In(employeeIds), companyId, deletedAt: IsNull() },
    });
    return employees.map((e) => ({ id: e.id, weight: 1 }));
  }

  async applyPayoutToEntries(params: {
    entryIds: string[];
    amountsByEntryId: Record<string, number>;
    payoutTransactionId: string;
  }): Promise<void> {
    const entries = await this.ledgerRepo.find({
      where: { id: In(params.entryIds) },
    });
    for (const entry of entries) {
      const pay = Math.max(
        0,
        Math.round(params.amountsByEntryId[entry.id] ?? 0),
      );
      if (pay <= 0) continue;
      const open = tipAmountOpen(entry);
      const applied = Math.min(open, pay);
      entry.amountPaid = money(parseMoney(entry.amountPaid) + applied);
      entry.payoutTransactionId = params.payoutTransactionId;
      if (tipAmountOpen(entry) <= 0.001) {
        entry.status = TipLedgerStatus.PAID;
        entry.amountPaid = entry.amount;
      }
      await this.ledgerRepo.save(entry);
    }
  }

  async openAmountForEmployee(
    companyId: string,
    employeeId: string,
  ): Promise<{ openAmount: number; entryIds: string[] }> {
    const entries = await this.ledgerRepo.find({
      where: {
        companyId,
        employeeId,
        status: TipLedgerStatus.ACCRUED,
      },
      take: 500,
    });
    let openAmount = 0;
    const entryIds: string[] = [];
    const amounts: Record<string, number> = {};
    for (const e of entries) {
      const open = tipAmountOpen(e);
      if (open <= 0) continue;
      openAmount += open;
      entryIds.push(e.id);
      amounts[e.id] = open;
    }
    void amounts;
    return {
      openAmount: Math.round(openAmount * 100) / 100,
      entryIds,
    };
  }

  async listOpenEntriesForEmployee(
    companyId: string,
    employeeId: string,
  ): Promise<TipLedgerEntry[]> {
    const entries = await this.ledgerRepo.find({
      where: {
        companyId,
        employeeId,
        status: TipLedgerStatus.ACCRUED,
      },
      order: { createdAt: 'ASC' },
      take: 500,
    });
    return entries.filter((e) => tipAmountOpen(e) > 0);
  }

  async scanOverdueAcrossCompanies(limitCompanies = 50): Promise<number> {
    const rows = await this.ledgerRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.companyId', 'companyId')
      .where('t.status = :status', { status: TipLedgerStatus.ACCRUED })
      .andWhere('t.dueAt IS NOT NULL')
      .andWhere('t.dueAt <= :now', { now: new Date() })
      .andWhere('t.amount > t.amountPaid')
      .limit(limitCompanies)
      .getRawMany<{ companyId: string }>();

    for (const row of rows) {
      const overdue = await this.listOverdue(row.companyId);
      if (overdue.overdueCount > 0) {
        this.logger.warn(
          `Tips overdue company=${row.companyId} count=${overdue.overdueCount} total=${overdue.overdueTotal}`,
        );
      }
    }
    return rows.length;
  }

  requireCompanyId(): string {
    const id = TenantContext.getCompanyId();
    if (!id) throw new Error('Company context required');
    return id;
  }
}
