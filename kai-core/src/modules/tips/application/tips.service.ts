import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { TenantContext } from '@common/tenant/tenant.context';
import {
  TipCaptureStatus,
  TipLedgerEntry,
  TipLedgerStatus,
} from '../domain/tip-ledger-entry.entity';

export type TipFromSaleInput = {
  companyId: string;
  branchId?: string | null;
  saleTransactionId: string;
  diningOrderId?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentMethod?: string | null;
};

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
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

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);

  constructor(
    @InjectRepository(TipLedgerEntry)
    private readonly ledgerRepo: Repository<TipLedgerEntry>,
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

    const row = this.ledgerRepo.create({
      companyId: input.companyId,
      branchId: input.branchId ?? null,
      saleTransactionId: input.saleTransactionId,
      diningOrderId: input.diningOrderId ?? null,
      amount: money(tipAmount),
      status: TipLedgerStatus.ACCRUED,
      tipStatus:
        tipStatus === TipCaptureStatus.NONE
          ? TipCaptureStatus.ACCEPTED
          : tipStatus,
      suggestPercent: money(suggestPercent),
      suggestedAmount: suggestedAmount > 0 ? money(suggestedAmount) : null,
      paymentMethod: input.paymentMethod ?? null,
      employeeId: null,
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

  async listEntries(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
    status?: TipLedgerStatus;
    limit?: number;
  }): Promise<TipLedgerEntry[]> {
    const take = Math.min(Math.max(params.limit ?? 200, 1), 500);
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId: params.companyId })
      .orderBy('t.createdAt', 'DESC')
      .take(take);

    if (params.status) {
      qb.andWhere('t.status = :status', { status: params.status });
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
    return qb.getMany();
  }

  async summary(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    accruedTotal: number;
    accruedCount: number;
    byDay: Array<{ date: string; total: number; count: number }>;
  }> {
    const entries = await this.listEntries({
      ...params,
      status: TipLedgerStatus.ACCRUED,
      limit: 500,
    });
    let accruedTotal = 0;
    const dayMap = new Map<string, { total: number; count: number }>();
    for (const e of entries) {
      const amt = parseMoney(e.amount);
      accruedTotal += amt;
      const day = e.createdAt.toISOString().slice(0, 10);
      const cur = dayMap.get(day) ?? { total: 0, count: 0 };
      cur.total += amt;
      cur.count += 1;
      dayMap.set(day, cur);
    }
    const byDay = [...dayMap.entries()]
      .map(([date, v]) => ({ date, total: v.total, count: v.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      accruedTotal: Math.round(accruedTotal * 100) / 100,
      accruedCount: entries.length,
      byDay,
    };
  }

  requireCompanyId(): string {
    const id = TenantContext.getCompanyId();
    if (!id) throw new Error('Company context required');
    return id;
  }
}
