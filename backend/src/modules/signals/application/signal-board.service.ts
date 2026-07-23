import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  SIGNAL_SEVERITY_RANK,
  type SignalCardDto,
  type SignalEvalContext,
  type SignalsBoardResponse,
  unavailableSignal,
} from '../domain/signal.types';
import type { SignalEvidenceDto } from '../domain/signal-evidence.types';
import {
  SIGNAL_PROVIDERS,
  type SignalProvider,
} from './providers/signal-provider';

/** Orden de registro = desempate tras severidad (plan F1–F3). */
export const SIGNAL_REGISTRY_ORDER = [
  'sales-weekday-pace',
  'reorder-queue',
  'void-rate',
  'payment-fee-drag',
  'dead-stock-capital',
  'stock-days-cover',
  'buy-now',
] as const;

@Injectable()
export class SignalBoardService {
  private readonly logger = new Logger(SignalBoardService.name);

  constructor(
    @Inject(SIGNAL_PROVIDERS)
    private readonly providers: SignalProvider[],
  ) {}

  async getBoard(
    companyId: string,
    opts?: { branchId?: string },
  ): Promise<SignalsBoardResponse> {
    const now = new Date();
    const ctx: SignalEvalContext = {
      companyId,
      branchId: opts?.branchId,
      now,
    };

    const byId = new Map(this.providers.map((p) => [p.id, p]));
    const ordered = SIGNAL_REGISTRY_ORDER.map((id) => byId.get(id)).filter(
      (p): p is SignalProvider => Boolean(p),
    );
    for (const p of this.providers) {
      if (
        !SIGNAL_REGISTRY_ORDER.includes(
          p.id as (typeof SIGNAL_REGISTRY_ORDER)[number],
        )
      ) {
        ordered.push(p);
      }
    }

    const settled = await Promise.allSettled(
      ordered.map((p) => p.evaluate(ctx)),
    );

    const signals: SignalCardDto[] = settled.map((result, i) => {
      const provider = ordered[i]!;
      if (result.status === 'fulfilled') {
        return result.value;
      }
      this.logger.warn(
        `Signal provider ${provider.id} failed: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`,
      );
      return unavailableSignal(provider.id, provider.id, now, undefined);
    });

    const titles: Record<string, string> = {
      'sales-weekday-pace': 'Ritmo de venta del día',
      'reorder-queue': 'Cola de reorden',
      'void-rate': 'Tasa de anulaciones',
      'payment-fee-drag': 'Peso de comisiones',
      'dead-stock-capital': 'Capital en huesos',
      'stock-days-cover': 'Días de cobertura',
      'buy-now': 'Comprar ahora',
    };
    for (const s of signals) {
      if (s.insight === 'No disponible ahora' && titles[s.id]) {
        s.title = titles[s.id]!;
      }
    }

    signals.sort((a, b) => {
      const rank =
        SIGNAL_SEVERITY_RANK[a.severity] - SIGNAL_SEVERITY_RANK[b.severity];
      if (rank !== 0) return rank;
      const ia = SIGNAL_REGISTRY_ORDER.indexOf(
        a.id as (typeof SIGNAL_REGISTRY_ORDER)[number],
      );
      const ib = SIGNAL_REGISTRY_ORDER.indexOf(
        b.id as (typeof SIGNAL_REGISTRY_ORDER)[number],
      );
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return {
      signals,
      computedAt: now.toISOString(),
    };
  }

  async getEvidence(
    companyId: string,
    signalId: string,
    opts?: { branchId?: string },
  ): Promise<SignalEvidenceDto> {
    const provider = this.providers.find((p) => p.id === signalId);
    if (!provider) {
      throw new NotFoundException(`Señal no encontrada: ${signalId}`);
    }
    const ctx: SignalEvalContext = {
      companyId,
      branchId: opts?.branchId,
      now: new Date(),
    };
    return provider.evidence(ctx);
  }
}
