import type { SignalCardDto, SignalEvalContext } from '../../domain/signal.types';
import type { SignalEvidenceDto } from '../../domain/signal-evidence.types';

export interface SignalProvider {
  readonly id: string;
  evaluate(ctx: SignalEvalContext): Promise<SignalCardDto>;
  evidence(ctx: SignalEvalContext): Promise<SignalEvidenceDto>;
}

export const SIGNAL_PROVIDERS = Symbol('SIGNAL_PROVIDERS');
