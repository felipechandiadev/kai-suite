import { Injectable } from '@nestjs/common';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ver transacciones',
  href: '/sales/transactions/sales',
};

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type VoidComputed = {
  card: SignalCardDto;
  recentRate: number;
  baselineRate: number;
  recentDays: number;
  baselineDays: number;
  watchMultiplier: number;
  criticalMultiplier: number;
};

@Injectable()
export class VoidRateProvider implements SignalProvider {
  readonly id = 'void-rate';

  constructor(private readonly queries: SignalsQueryService) {}

  private async compute(ctx: SignalEvalContext): Promise<VoidComputed> {
    const { recentDays, baselineDays, watchMultiplier, criticalMultiplier } =
      SIGNAL_THRESHOLDS.voidRate;

    const recentTo = endOfDay(ctx.now);
    const recentFrom = startOfDay(ctx.now);
    recentFrom.setDate(recentFrom.getDate() - (recentDays - 1));

    const baselineTo = new Date(recentFrom);
    baselineTo.setMilliseconds(baselineTo.getMilliseconds() - 1);
    const baselineFrom = startOfDay(baselineTo);
    baselineFrom.setDate(baselineFrom.getDate() - (baselineDays - 1));

    const [recent, baseline] = await Promise.all([
      this.queries.countSalesAndVoids(
        ctx.companyId,
        recentFrom,
        recentTo,
        ctx.branchId,
      ),
      this.queries.countSalesAndVoids(
        ctx.companyId,
        baselineFrom,
        baselineTo,
        ctx.branchId,
      ),
    ]);

    const recentDenom = recent.salesCount + recent.voidCount;
    const baselineDenom = baseline.salesCount + baseline.voidCount;
    const recentRate = recentDenom > 0 ? recent.voidCount / recentDenom : 0;
    const baselineRate =
      baselineDenom > 0 ? baseline.voidCount / baselineDenom : 0;

    let severity: SignalCardDto['severity'] = 'OK';
    let multiplier = 0;
    if (baselineRate <= 0) {
      if (recent.voidCount === 0) severity = 'OK';
      else if (recentRate >= 0.05) severity = 'WATCH';
      else severity = 'INFO';
    } else {
      multiplier = recentRate / baselineRate;
      if (multiplier >= criticalMultiplier) severity = 'CRITICAL';
      else if (multiplier >= watchMultiplier) severity = 'WATCH';
    }

    const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

    const headline =
      recent.voidCount === 0
        ? 'Sin anulaciones recientes'
        : `${pct(recentRate)} de anulaciones`;

    const context =
      baselineRate > 0
        ? `Últimos ${recentDays} días ${pct(recentRate)} · referencia ${baselineDays} días ${pct(baselineRate)} (${multiplier.toFixed(1)}×)`
        : `Últimos ${recentDays} días: ${recent.voidCount} anulaciones / ${recent.salesCount} ventas`;

    const insight =
      severity === 'CRITICAL'
        ? 'Anulaciones muy por sobre la referencia histórica: revisa causa (error, fraude o proceso).'
        : severity === 'WATCH'
          ? 'Tasa de anulaciones elevada frente al histórico; conviene auditar transacciones.'
          : severity === 'INFO'
            ? 'Poco histórico de anulaciones para comparar; se reporta el dato reciente.'
            : 'Tasa de anulaciones dentro del rango esperado.';

    return {
      card: {
        id: this.id,
        title: 'Tasa de anulaciones',
        severity,
        headline,
        context,
        insight,
        cta: CTA,
        computedAt: ctx.now.toISOString(),
        meta: {
          recentRate,
          baselineRate,
          multiplier,
          recentVoidCount: recent.voidCount,
          recentSalesCount: recent.salesCount,
        },
      },
      recentRate,
      baselineRate,
      recentDays,
      baselineDays,
      watchMultiplier,
      criticalMultiplier,
    };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const c = await this.compute(ctx);
    const thresholdLines =
      c.baselineRate > 0
        ? [
            {
              label: `Vigilar (${c.watchMultiplier}×)`,
              y: Number((c.baselineRate * c.watchMultiplier * 100).toFixed(2)),
            },
            {
              label: `Crítico (${c.criticalMultiplier}×)`,
              y: Number(
                (c.baselineRate * c.criticalMultiplier * 100).toFixed(2),
              ),
            },
          ]
        : undefined;

    return {
      signalId: this.id,
      title: c.card.title,
      severity: c.card.severity,
      headline: c.card.headline,
      methodology: `Tasa = anulaciones / (ventas + anulaciones). Ventana reciente: ${c.recentDays} días vs referencia de ${c.baselineDays} días previos. Vigilar si la tasa reciente ≥ ${c.watchMultiplier}× la referencia; crítico si ≥ ${c.criticalMultiplier}×.`,
      kind: 'comparison',
      comparison: {
        bars: [
          {
            label: `Últimos ${c.recentDays} días`,
            value: Number((c.recentRate * 100).toFixed(2)),
          },
          {
            label: `Referencia ${c.baselineDays} días`,
            value: Number((c.baselineRate * 100).toFixed(2)),
          },
        ],
        thresholdLines,
      },
      thresholds: {
        watch: c.watchMultiplier,
        critical: c.criticalMultiplier,
        unit: '× tasa referencia',
      },
      cta: CTA,
      computedAt: c.card.computedAt,
    };
  }
}
