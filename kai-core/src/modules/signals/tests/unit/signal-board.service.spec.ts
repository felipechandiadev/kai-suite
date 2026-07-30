import { SignalBoardService } from '../../application/signal-board.service';
import type { SignalProvider } from '../../application/providers/signal-provider';
import type { SignalCardDto } from '../../domain/signal.types';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';
import { NotFoundException } from '@nestjs/common';

function card(
  partial: Partial<SignalCardDto> & Pick<SignalCardDto, 'id' | 'severity'>,
): SignalCardDto {
  return {
    title: partial.title ?? partial.id,
    headline: partial.headline ?? 'h',
    context: partial.context ?? 'c',
    insight: partial.insight ?? 'i',
    computedAt: partial.computedAt ?? '2026-07-22T12:00:00.000Z',
    ...partial,
  };
}

function stubEvidence(
  id: string,
  kind: SignalEvidenceDto['kind'],
): SignalEvidenceDto {
  return {
    signalId: id,
    title: id,
    severity: 'OK',
    headline: 'h',
    methodology: 'm',
    kind,
    computedAt: '2026-07-22T12:00:00.000Z',
  };
}

function provider(
  id: string,
  evaluate: SignalProvider['evaluate'],
  evidenceKind: SignalEvidenceDto['kind'] = 'comparison',
): SignalProvider {
  return {
    id,
    evaluate,
    evidence: async () => stubEvidence(id, evidenceKind),
  };
}

describe('SignalBoardService', () => {
  it('orders by severity then registry order; failed providers become INFO', async () => {
    const okPace = provider('sales-weekday-pace', async () =>
      card({ id: 'sales-weekday-pace', severity: 'OK', title: 'Pace' }),
    );
    const criticalReorder = provider('reorder-queue', async () =>
      card({
        id: 'reorder-queue',
        severity: 'CRITICAL',
        title: 'Reorden',
      }),
    );
    const failingVoid: SignalProvider = {
      id: 'void-rate',
      evaluate: async () => {
        throw new Error('db down');
      },
      evidence: async () => stubEvidence('void-rate', 'comparison'),
    };
    const watchFee = provider('payment-fee-drag', async () =>
      card({ id: 'payment-fee-drag', severity: 'WATCH', title: 'Fees' }),
    );

    const service = new SignalBoardService([
      okPace,
      criticalReorder,
      failingVoid,
      watchFee,
    ] as SignalProvider[]);

    const board = await service.getBoard('co-1');
    expect(board.signals.map((s) => s.id)).toEqual([
      'reorder-queue',
      'payment-fee-drag',
      'void-rate',
      'sales-weekday-pace',
    ]);
    expect(board.signals[0]!.severity).toBe('CRITICAL');
    expect(board.signals[1]!.severity).toBe('WATCH');
    expect(board.signals[2]!.severity).toBe('INFO');
    expect(board.signals[2]!.insight).toBe('No disponible ahora');
    expect(board.signals[2]!.title).toBe('Tasa de anulaciones');
    expect(board.signals[3]!.severity).toBe('OK');
  });

  it('getEvidence returns provider evidence', async () => {
    const pace = provider(
      'sales-weekday-pace',
      async () =>
        card({ id: 'sales-weekday-pace', severity: 'OK', title: 'Pace' }),
      'timeseries',
    );
    const service = new SignalBoardService([pace] as SignalProvider[]);
    const ev = await service.getEvidence('co-1', 'sales-weekday-pace');
    expect(ev.signalId).toBe('sales-weekday-pace');
    expect(ev.kind).toBe('timeseries');
  });

  it('getEvidence throws NotFound for unknown id', async () => {
    const service = new SignalBoardService([] as SignalProvider[]);
    await expect(service.getEvidence('co-1', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
