import { Injectable } from '@nestjs/common';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { formatProductDisplayName } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ver alertas de stock',
  href: '/inventory/stock?stock-alerts=true',
};

@Injectable()
export class ReorderQueueProvider implements SignalProvider {
  readonly id = 'reorder-queue';

  constructor(private readonly queries: SignalsQueryService) {}

  private async compute(ctx: SignalEvalContext) {
    const alerts = await this.queries.listThresholdAlerts(ctx.companyId);
    const count = alerts.length;
    const outOfStock = alerts.filter((a) => a.outOfStock).length;
    const { watchMinSkus, criticalMinSkus } = SIGNAL_THRESHOLDS.reorder;

    let severity: SignalCardDto['severity'] = 'OK';
    if (count >= criticalMinSkus || outOfStock > 0) {
      severity = 'CRITICAL';
    } else if (count >= watchMinSkus) {
      severity = 'WATCH';
    }

    const headline =
      count === 0
        ? 'Sin cola de reorden'
        : `${count} producto${count === 1 ? '' : 's'} bajo mínimo`;

    const context =
      outOfStock > 0
        ? `${outOfStock} en quiebre · crítico desde ${criticalMinSkus} productos o quiebre`
        : count === 0
          ? 'Todos los umbrales en rango'
          : `Vigilancia desde ${watchMinSkus} · crítico desde ${criticalMinSkus}`;

    const insight =
      severity === 'CRITICAL'
        ? outOfStock > 0
          ? 'Hay quiebres o una cola grande: prioriza compra o traslado.'
          : 'Cola de reorden elevada: atiende antes de que haya quiebre.'
        : severity === 'WATCH'
          ? 'Hay productos bajo mínimo; revisa la cola de alertas.'
          : 'Inventario por umbrales bajo control.';

    const top = alerts[0];

    const card: SignalCardDto = {
      id: this.id,
      title: 'Cola de reorden',
      severity,
      headline,
      context,
      insight,
      cta: CTA,
      computedAt: ctx.now.toISOString(),
      subject: top
        ? {
            name: top.productName,
            attributes: top.attributesLabel || null,
            sku: top.sku,
          }
        : undefined,
      meta: {
        count,
        outOfStock,
        sample: alerts.slice(0, 5).map((a) => ({
          sku: a.sku,
          productName: a.productName,
          attributesLabel: a.attributesLabel,
        })),
      },
    };

    return { card, alerts, watchMinSkus, criticalMinSkus };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const { card, alerts, watchMinSkus, criticalMinSkus } =
      await this.compute(ctx);
    const top = alerts.slice(0, 12);
    return {
      signalId: this.id,
      title: card.title,
      severity: card.severity,
      headline: card.headline,
      methodology: `Productos con stock disponible bajo el mínimo o en quiebre. Vigilar desde ${watchMinSkus} SKU; crítico desde ${criticalMinSkus} o cualquier quiebre. El valor del ranking es el stock disponible.`,
      kind: 'ranking',
      ranking: {
        rows: top.map((a) => ({
          label: formatProductDisplayName(a.productName, a.attributesLabel),
          sublabel: a.sku,
          value: a.availableStock,
          valueLabel: a.outOfStock
            ? 'Quiebre'
            : `${a.availableStock} / mín. ${a.minimumStock}`,
        })),
      },
      thresholds: {
        watch: watchMinSkus,
        critical: criticalMinSkus,
        unit: 'SKU bajo mínimo',
      },
      cta: CTA,
      computedAt: card.computedAt,
    };
  }
}
