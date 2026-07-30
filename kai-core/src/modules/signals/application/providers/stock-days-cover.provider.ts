import { Injectable } from '@nestjs/common';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { formatProductDisplayName } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ver stock',
  href: '/inventory/stock?stock-alerts=true',
};

@Injectable()
export class StockDaysCoverProvider implements SignalProvider {
  readonly id = 'stock-days-cover';

  constructor(private readonly queries: SignalsQueryService) {}

  private async compute(ctx: SignalEvalContext) {
    const { salesWindowDays, watchMaxDays, criticalMaxDays, topN } =
      SIGNAL_THRESHOLDS.stockDaysCover;
    const rows = await this.queries.listStockDaysCover(
      ctx.companyId,
      salesWindowDays,
      topN,
    );

    const criticalSkus = rows.filter(
      (r) => r.daysCover != null && r.daysCover <= criticalMaxDays,
    );
    const watchSkus = rows.filter(
      (r) =>
        r.daysCover != null &&
        r.daysCover > criticalMaxDays &&
        r.daysCover <= watchMaxDays,
    );

    let severity: SignalCardDto['severity'] = 'OK';
    if (criticalSkus.length > 0) severity = 'CRITICAL';
    else if (watchSkus.length > 0) severity = 'WATCH';
    else if (rows.length === 0) severity = 'INFO';

    const worst = rows[0];
    const headline =
      !worst || worst.daysCover == null
        ? 'Sin cobertura calculable'
        : `~${worst.daysCover.toFixed(1)} días de cobertura`;

    const context =
      rows.length === 0
        ? `Sin ventas en ${salesWindowDays} días para estimar cobertura`
        : `${criticalSkus.length} críticos (≤${criticalMaxDays} días) · ${watchSkus.length} vigilancia (≤${watchMaxDays} días)`;

    const insight =
      severity === 'CRITICAL'
        ? 'Hay productos con días de cobertura muy bajos frente a la venta reciente.'
        : severity === 'WATCH'
          ? 'Algunos productos se acercan a quiebre según el ritmo de venta de 30 días.'
          : severity === 'INFO'
            ? 'No hay suficiente historial de venta para estimar cobertura.'
            : 'Los productos con más rotación tienen cobertura razonable.';

    const card: SignalCardDto = {
      id: this.id,
      title: 'Días de cobertura',
      severity,
      headline,
      context,
      insight,
      cta: CTA,
      computedAt: ctx.now.toISOString(),
      subject: worst
        ? {
            name: worst.productName,
            attributes: worst.attributesLabel || null,
            sku: worst.sku,
          }
        : undefined,
      meta: {
        top: rows.map((r) => ({
          sku: r.sku,
          productName: r.productName,
          attributesLabel: r.attributesLabel,
          daysCover: r.daysCover,
          onHand: r.onHand,
          avgDailySales: r.avgDailySales,
        })),
      },
    };

    return {
      card,
      rows,
      salesWindowDays,
      watchMaxDays,
      criticalMaxDays,
    };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const { card, rows, salesWindowDays, watchMaxDays, criticalMaxDays } =
      await this.compute(ctx);
    return {
      signalId: this.id,
      title: card.title,
      severity: card.severity,
      headline: card.headline,
      methodology: `Cobertura ≈ stock / venta diaria promedio de los últimos ${salesWindowDays} días. Vigilar si ≤ ${watchMaxDays} días; crítico si ≤ ${criticalMaxDays} días. Se listan los productos con menor cobertura.`,
      kind: 'ranking',
      ranking: {
        rows: rows.map((r) => ({
          label: formatProductDisplayName(r.productName, r.attributesLabel),
          sublabel: r.sku,
          value: r.daysCover ?? 0,
          valueLabel:
            r.daysCover == null ? '—' : `${r.daysCover.toFixed(1)} días`,
        })),
      },
      thresholds: {
        watch: watchMaxDays,
        critical: criticalMaxDays,
        unit: 'días de cobertura',
      },
      cta: CTA,
      computedAt: card.computedAt,
    };
  }
}
