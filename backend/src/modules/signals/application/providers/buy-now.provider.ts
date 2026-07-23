import { Injectable } from '@nestjs/common';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { formatProductDisplayName } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ir a compras',
  href: '/purchasing/transactions/receptions',
};

@Injectable()
export class BuyNowProvider implements SignalProvider {
  readonly id = 'buy-now';

  constructor(private readonly queries: SignalsQueryService) {}

  private async compute(ctx: SignalEvalContext) {
    const { topN } = SIGNAL_THRESHOLDS.buyNow;
    const items = await this.queries.listBuyNowCandidates(ctx.companyId, topN);
    const totalQty = items.reduce((s, i) => s + i.suggestedQty, 0);

    let severity: SignalCardDto['severity'] = 'OK';
    if (items.some((i) => i.reason.includes('Quiebre'))) severity = 'CRITICAL';
    else if (items.length >= 5) severity = 'CRITICAL';
    else if (items.length >= 1) severity = 'WATCH';

    const top = items[0];
    const headline =
      items.length === 0
        ? 'Nada urgente por comprar'
        : top
          ? `${items.length} producto${items.length === 1 ? '' : 's'} · sugerido ×${top.suggestedQty}`
          : `${items.length} productos a reponer`;

    const context =
      items.length === 0
        ? 'Sin sugerencias (punto de reorden − disponible ≤ 0)'
        : `Cantidad sugerida total ${totalQty} · priorizando los ${Math.min(items.length, topN)} con mayor brecha`;

    const insight =
      severity === 'CRITICAL'
        ? 'Hay reposición prescrita con quiebre o cola grande: genera orden de compra o recepción.'
        : severity === 'WATCH'
          ? 'Hay productos con cantidad sugerida de compra; prioriza los de mayor brecha.'
          : 'No hay brecha de reorden pendiente según umbrales actuales.';

    const card: SignalCardDto = {
      id: this.id,
      title: 'Comprar ahora',
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
        items: items.map((i) => ({
          sku: i.sku,
          productName: i.productName,
          attributesLabel: i.attributesLabel,
          suggestedQty: i.suggestedQty,
          onHand: i.onHand,
          reorderPoint: i.reorderPoint,
          reason: i.reason,
        })),
      },
    };

    return { card, items, topN };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const { card, items, topN } = await this.compute(ctx);
    return {
      signalId: this.id,
      title: card.title,
      severity: card.severity,
      headline: card.headline,
      methodology: `Sugerencia = max(0, punto de reorden − disponible). Se listan hasta ${topN} productos con mayor brecha. Crítico si hay quiebre o ≥ 5 SKU; vigilar con ≥ 1 SKU.`,
      kind: 'ranking',
      ranking: {
        rows: items.map((i) => ({
          label: formatProductDisplayName(i.productName, i.attributesLabel),
          sublabel: `${i.sku} · ${i.reason}`,
          value: i.suggestedQty,
          valueLabel: `×${i.suggestedQty}`,
        })),
      },
      thresholds: {
        watch: 1,
        critical: 5,
        unit: 'SKU con sugerencia',
      },
      cta: CTA,
      computedAt: card.computedAt,
    };
  }
}
