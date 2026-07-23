import { Injectable } from '@nestjs/common';
import { SIGNAL_THRESHOLDS } from '../../domain/signal.thresholds';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import { formatProductDisplayName } from '../../domain/signal.types';
import { SignalsQueryService } from '../signals-query.service';
import type { SignalProvider } from './signal-provider';

const CTA = {
  label: 'Ver inventario',
  href: '/inventory/stock',
};

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

@Injectable()
export class DeadStockCapitalProvider implements SignalProvider {
  readonly id = 'dead-stock-capital';

  constructor(private readonly queries: SignalsQueryService) {}

  private async compute(ctx: SignalEvalContext) {
    const { idleDays, watchCapitalClp } = SIGNAL_THRESHOLDS.deadStock;
    const criticalCapital = watchCapitalClp * 2;
    const rows = await this.queries.listDeadStock(ctx.companyId, idleDays);
    const capital = rows.reduce((s, r) => s + r.capital, 0);
    const productCount = rows.length;

    let severity: SignalCardDto['severity'] = 'OK';
    if (capital >= criticalCapital) severity = 'CRITICAL';
    else if (capital >= watchCapitalClp) severity = 'WATCH';

    const headline =
      capital <= 0
        ? 'Sin capital inmovilizado detectado'
        : `${fmtMoney(capital)} en huesos`;

    const context =
      productCount === 0
        ? `Sin venta en ${idleDays} días con stock disponible (y costo conocido)`
        : `${productCount} producto${productCount === 1 ? '' : 's'} · umbral ${fmtMoney(watchCapitalClp)} / crítico ${fmtMoney(criticalCapital)}`;

    const insight =
      severity === 'CRITICAL'
        ? 'Capital importante atado a stock sin rotación: liquida, promociona o deja de reponer.'
        : severity === 'WATCH'
          ? 'Hay capital en productos sin venta reciente; revisa si conviene acción comercial.'
          : 'No se detecta un monto relevante de stock dormido con costo.';

    const top = rows[0];

    const card: SignalCardDto = {
      id: this.id,
      title: 'Capital en huesos',
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
        capital,
        productCount,
        idleDays,
        top: rows.slice(0, 5).map((r) => ({
          sku: r.sku,
          productName: r.productName,
          attributesLabel: r.attributesLabel,
          capital: r.capital,
          onHand: r.onHand,
        })),
      },
    };

    return { card, rows, idleDays, watchCapitalClp, criticalCapital };
  }

  async evaluate(ctx: SignalEvalContext): Promise<SignalCardDto> {
    return (await this.compute(ctx)).card;
  }

  async evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto> {
    const { card, rows, idleDays, watchCapitalClp, criticalCapital } =
      await this.compute(ctx);
    return {
      signalId: this.id,
      title: card.title,
      severity: card.severity,
      headline: card.headline,
      methodology: `Suma el costo × stock de variantes sin venta en los últimos ${idleDays} días. Vigilar desde ${fmtMoney(watchCapitalClp)}; crítico desde ${fmtMoney(criticalCapital)}.`,
      kind: 'ranking',
      ranking: {
        rows: rows.slice(0, 12).map((r) => ({
          label: formatProductDisplayName(r.productName, r.attributesLabel),
          sublabel: r.sku,
          value: Math.round(r.capital),
          valueLabel: fmtMoney(r.capital),
        })),
      },
      thresholds: {
        watch: watchCapitalClp,
        critical: criticalCapital,
        unit: 'CLP capital inmovilizado',
      },
      cta: CTA,
      computedAt: card.computedAt,
    };
  }
}
