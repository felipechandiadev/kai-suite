import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import {
  DiningOrderKind,
  DiningOrderStatus,
} from '@modules/dining/domain/dining.enums';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TipLedgerEntry, TipLedgerStatus } from '@modules/tips/domain/tip-ledger-entry.entity';
import {
  DiningOrderKindFilter,
  ReportGranularity,
} from '../domain/dining-report.types';

export type DateRange = {
  from: Date;
  to: Date;
  dateFrom: string;
  dateTo: string;
};

export type DiningFilter = {
  branchId?: string;
  diningRoomId?: string;
  orderKind?: DiningOrderKindFilter;
};

/** TZ por defecto Chile (reportes por hora). */
export const DINING_REPORT_TZ = 'America/Santiago';

@Injectable()
export class DiningReportsQueryService {
  constructor(
    @InjectRepository(DiningOrder)
    private readonly orderRepo: Repository<DiningOrder>,
  ) {}

  parseDateRange(params: Record<string, unknown>): DateRange {
    const fromRaw = params.dateFrom ?? params.from;
    const toRaw = params.dateTo ?? params.to;
    if (typeof fromRaw !== 'string' || !fromRaw.trim()) {
      throw new BadRequestException('dateFrom es requerido (YYYY-MM-DD)');
    }
    if (typeof toRaw !== 'string' || !toRaw.trim()) {
      throw new BadRequestException('dateTo es requerido (YYYY-MM-DD)');
    }
    const fromStr = fromRaw.trim().slice(0, 10);
    const toStr = toRaw.trim().slice(0, 10);
    const from = new Date(`${fromStr}T00:00:00.000`);
    const to = new Date(`${toStr}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Rango de fechas inválido');
    }
    if (from > to) {
      throw new BadRequestException('dateFrom no puede ser posterior a dateTo');
    }
    return { from, to, dateFrom: fromStr, dateTo: toStr };
  }

  optionalUuid(params: Record<string, unknown>, key: string): string | undefined {
    const v = params[key];
    if (v == null || v === '') return undefined;
    if (typeof v !== 'string') {
      throw new BadRequestException(`${key} debe ser un UUID`);
    }
    return v;
  }

  optionalOrderKind(
    params: Record<string, unknown>,
  ): DiningOrderKindFilter | undefined {
    const v = params.orderKind;
    if (v == null || v === '') return undefined;
    if (v === 'TABLE' || v === 'COUNTER' || v === 'TAKEAWAY') return v;
    throw new BadRequestException('orderKind inválido');
  }

  baseClosedOrdersQb(
    companyId: string,
    range: DateRange,
    filter?: DiningFilter,
  ): SelectQueryBuilder<DiningOrder> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoin(
        Transaction,
        't',
        't.id = o.linkedTransactionId AND t.companyId = o.companyId',
      )
      .leftJoin(
        TipLedgerEntry,
        'tip',
        `tip.diningOrderId = o.id AND tip.status != :tipVoid`,
        { tipVoid: TipLedgerStatus.VOID },
      )
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status = :closed', { closed: DiningOrderStatus.CLOSED })
      .andWhere('o.closedAt IS NOT NULL')
      .andWhere('o.closedAt >= :from', { from: range.from })
      .andWhere('o.closedAt <= :to', { to: range.to });

    if (filter?.branchId) {
      qb.andWhere('o.branchId = :branchId', { branchId: filter.branchId });
    }
    if (filter?.diningRoomId) {
      qb.andWhere('o.diningRoomId = :diningRoomId', {
        diningRoomId: filter.diningRoomId,
      });
    }
    if (filter?.orderKind) {
      qb.andWhere('o.kind = :orderKind', {
        orderKind: filter.orderKind as DiningOrderKind,
      });
    }
    return qb;
  }

  async salonSummary(
    companyId: string,
    range: DateRange,
    filter?: DiningFilter,
  ): Promise<{
    accountCount: number;
    totalSales: number;
    avgTicket: number;
    avgDwellMinutes: number;
    tipTotal: number;
    tipPct: number;
  }> {
    const raw = await this.baseClosedOrdersQb(companyId, range, filter)
      .select('COUNT(o.id)', 'accountCount')
      .addSelect('COALESCE(SUM(t.total), 0)', 'totalSales')
      .addSelect(
        `COALESCE(AVG(EXTRACT(EPOCH FROM (o.closedAt - o.openedAt)) / 60.0), 0)`,
        'avgDwellMinutes',
      )
      .addSelect('COALESCE(SUM(tip.amount::numeric), 0)', 'tipTotal')
      .getRawOne<{
        accountCount: string;
        totalSales: string;
        avgDwellMinutes: string;
        tipTotal: string;
      }>();

    const accountCount = Number(raw?.accountCount) || 0;
    const totalSales = Number(raw?.totalSales) || 0;
    const tipTotal = Number(raw?.tipTotal) || 0;
    const avgDwellMinutes = Number(raw?.avgDwellMinutes) || 0;
    const avgTicket = accountCount > 0 ? totalSales / accountCount : 0;
    const tipPct = totalSales > 0 ? (tipTotal / totalSales) * 100 : 0;
    return {
      accountCount,
      totalSales,
      avgTicket,
      avgDwellMinutes,
      tipTotal,
      tipPct,
    };
  }

  async salonByBucket(
    companyId: string,
    range: DateRange,
    filter: DiningFilter | undefined,
    grain: ReportGranularity,
  ): Promise<
    Array<{
      day: string;
      count: number;
      total: number;
      avgTicket: number;
      avgDwellMinutes: number;
    }>
  > {
    let truncExpr: string;
    if (grain === 'month') {
      truncExpr = `to_char(date_trunc('month', o.closedAt), 'YYYY-MM')`;
    } else if (grain === 'week') {
      truncExpr = `to_char(date_trunc('week', o.closedAt), 'IYYY-"W"IW')`;
    } else {
      truncExpr = `to_char(o.closedAt, 'YYYY-MM-DD')`;
    }

    const rows = await this.baseClosedOrdersQb(companyId, range, filter)
      .select(truncExpr, 'day')
      .addSelect('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect(
        `COALESCE(AVG(EXTRACT(EPOCH FROM (o.closedAt - o.openedAt)) / 60.0), 0)`,
        'avgDwellMinutes',
      )
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{
        day: string;
        count: string;
        total: string;
        avgDwellMinutes: string;
      }>();

    return rows.map((r) => {
      const count = Number(r.count) || 0;
      const total = Number(r.total) || 0;
      return {
        day: r.day,
        count,
        total,
        avgTicket: count > 0 ? total / count : 0,
        avgDwellMinutes: Number(r.avgDwellMinutes) || 0,
      };
    });
  }

  async salonByHour(
    companyId: string,
    range: DateRange,
    filter?: DiningFilter,
  ): Promise<Array<{ hour: number; count: number; total: number }>> {
    const rows = await this.baseClosedOrdersQb(companyId, range, filter)
      .select(
        `EXTRACT(HOUR FROM (o.closedAt AT TIME ZONE :tz))::int`,
        'hour',
      )
      .addSelect('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .setParameter('tz', DINING_REPORT_TZ)
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany<{ hour: string; count: string; total: string }>();

    const byHour = new Map(
      rows.map((r) => [
        Number(r.hour),
        { count: Number(r.count) || 0, total: Number(r.total) || 0 },
      ]),
    );
    const out: Array<{ hour: number; count: number; total: number }> = [];
    for (let h = 0; h < 24; h++) {
      const hit = byHour.get(h);
      out.push({
        hour: h,
        count: hit?.count ?? 0,
        total: hit?.total ?? 0,
      });
    }
    return out;
  }

  async salonByTable(
    companyId: string,
    range: DateRange,
    filter?: DiningFilter,
  ): Promise<
    Array<{
      tableId: string | null;
      tableLabel: string;
      roomName: string;
      turns: number;
      total: number;
      avgTicket: number;
      avgDwellMinutes: number;
    }>
  > {
    const rows = await this.baseClosedOrdersQb(companyId, range, filter)
      .leftJoin('o.diningTable', 'tbl')
      .leftJoin('o.diningRoom', 'room')
      .select('o.diningTableId', 'tableId')
      .addSelect(
        `COALESCE(NULLIF(TRIM(tbl.label), ''), NULLIF(TRIM(tbl.code), ''), o.displayLabel, 'Sin mesa')`,
        'tableLabel',
      )
      .addSelect(`COALESCE(room.name, 'Sin salón')`, 'roomName')
      .addSelect('COUNT(o.id)', 'turns')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect(
        `COALESCE(AVG(EXTRACT(EPOCH FROM (o.closedAt - o.openedAt)) / 60.0), 0)`,
        'avgDwellMinutes',
      )
      .groupBy('o.diningTableId')
      .addGroupBy('tbl.label')
      .addGroupBy('tbl.code')
      .addGroupBy('o.displayLabel')
      .addGroupBy('room.name')
      .orderBy('total', 'DESC')
      .getRawMany<{
        tableId: string | null;
        tableLabel: string;
        roomName: string;
        turns: string;
        total: string;
        avgDwellMinutes: string;
      }>();

    return rows.map((r) => {
      const turns = Number(r.turns) || 0;
      const total = Number(r.total) || 0;
      return {
        tableId: r.tableId,
        tableLabel: r.tableLabel || 'Sin mesa',
        roomName: r.roomName || 'Sin salón',
        turns,
        total,
        avgTicket: turns > 0 ? total / turns : 0,
        avgDwellMinutes: Number(r.avgDwellMinutes) || 0,
      };
    });
  }
}
