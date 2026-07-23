import { Injectable } from '@nestjs/common';
import { SalesReportsQueryService } from '@modules/sales-reports/application/sales-reports-query.service';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Medios de pago',
  href: '/settings/company',
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type FeeComputed = {
  card: SignalCardDto;
  byMethod: Array<{ method: string; total: number; fee: number }>;
  watchPctOfMargin: number;
  criticalPctOfMargin: number;
};

@Injectable()
export class PaymentFeeDragProvider implements SignalProvider {
  readonly id = 'payment-fee-drag';

  constructor(
    private readonly salesReports: SalesReportsQueryService,
    private readonly queries: SignalsQueryService,
  ) {}

  private async compute(ctx: SignalEvalContext): Promise<FeeComputed> {
    const { watchPctOfMargin, criticalPctOfMargin } =
      SIGNAL_THRESHOLDS.paymentFeeDrag;
    const from = startOfMonth(ctx.now);
    const to = endOfDay(ctx.now);
    const range = {
      from,
      to,
      dateFrom: ymd(from),
      dateTo: ymd(to),
    };

    const [mix, margin, feeMap] = await Promise.all([
      this.salesReports.paymentMix(ctx.companyId, range, {
        branchId: ctx.branchId,
      }),
      this.salesReports.marginForLines(ctx.companyId, range, {}),
      this.queries.feePercentByMethod(ctx.companyId),
    ]);

    let estimatedFees = 0;
    const byMethod: Array<{ method: string; total: number; fee: number }> = [];
    for (const row of mix) {
      const pct = feeMap.get(row.paymentMethod) ?? 0;
      const fee = (row.total * pct) / 100;
      estimatedFees += fee;
      if (fee > 0) {
        byMethod.push({ method: row.paymentMethod, total: row.total, fee });
      }
    }

    const grossMargin = margin.margin;
    const dragPct =
      grossMargin > 0 ? (estimatedFees / grossMargin) * 100 : 0;

    let severity: SignalCardDto['severity'] = 'OK';
    if (grossMargin <= 0 && estimatedFees > 0) {
      severity = 'WATCH';
    } else if (dragPct >= criticalPctOfMargin) {
      severity = 'CRITICAL';
    } else if (dragPct >= watchPctOfMargin) {
      severity = 'WATCH';
    } else if (feeMap.size === 0) {
      severity = 'INFO';
    }

    const headline =
      estimatedFees <= 0
        ? 'Sin comisión estimada'
        : `${fmtMoney(estimatedFees)} en comisiones del mes`;

    const context =
      grossMargin > 0
        ? `${dragPct.toFixed(1)}% del margen bruto · umbral ${watchPctOfMargin}% / ${criticalPctOfMargin}%`
        : feeMap.size === 0
          ? 'Configura la comisión (%) en medios de pago con tarjeta'
          : `Margen bruto del mes ${fmtMoney(grossMargin)} · comisiones estimadas con la tarifa actual`;

    const insight =
      severity === 'CRITICAL'
        ? 'Las comisiones de medios de pago se llevan una parte grande del margen: revisa mezcla y tarifas.'
        : severity === 'WATCH'
          ? 'El peso de comisiones es relevante respecto al margen del mes.'
          : severity === 'INFO'
            ? 'No hay comisiones configuradas; la estimación no aplica aún.'
            : 'Comisiones estimadas dentro de un rango razonable del margen.';

    return {
      card: {
        id: this.id,
        title: 'Peso de comisiones',
        severity,
        headline,
        context,
        insight,
        cta: CTA,
        computedAt: ctx.now.toISOString(),
        meta: {
          estimatedFees,
          grossMargin,
          dragPct,
          byMethod,
          note: 'Estimación con la comisión actual del medio × monto (no histórico por transacción).',
        },
      },
      byMethod,
      watchPctOfMargin,
      criticalPctOfMargin,
    };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const c = await this.compute(ctx);
    return {
      signalId: this.id,
      title: c.card.title,
      severity: c.card.severity,
      headline: c.card.headline,
      methodology: `Estimación del mes en curso: comisión (%) configurada del medio × monto vendido con ese medio. Se compara el total estimado con el margen bruto. Vigilar desde ${c.watchPctOfMargin}% del margen; crítico desde ${c.criticalPctOfMargin}%. No usa histórico por transacción.`,
      kind: 'breakdown',
      breakdown: {
        slices: c.byMethod.map((m) => ({
          label: m.method,
          value: Math.round(m.fee),
        })),
      },
      thresholds: {
        watch: c.watchPctOfMargin,
        critical: c.criticalPctOfMargin,
        unit: '% del margen bruto',
      },
      cta: CTA,
      computedAt: c.card.computedAt,
    };
  }
}
