import { FiscalDteEmissionStatus } from '../domain/fiscal.enums';
import {
  extractEstadoFromEnvioStatusResponse,
  extractRechazoFromEnvioStatusResponse,
} from '../infrastructure/fiscal-xml.util';

export type PollEnvioStatusOptions = {
  maxAttempts?: number;
  delayMs?: number;
  initialDelayMs?: number;
};

export type ResolvedSiiEnvioStatus = {
  envioStatus: FiscalDteEmissionStatus;
  estado: string;
  rejectionMessage: string | null;
};

const REJECTED_ESTADOS = new Set([
  'RCH',
  'RSC',
  'RFR',
  'RCO',
  'RPT',
  'RCT',
  'VOF',
]);

const PROCESSING_ESTADOS = new Set(['REC', 'PRD', 'CRT', 'FOK', 'SOK']);

export function mapSiiEstadoToEnvioStatus(estado: string): FiscalDteEmissionStatus | null {
  const normalized = estado.trim().toUpperCase();
  if (normalized === 'EPR' || normalized === 'RPR') {
    return FiscalDteEmissionStatus.EPR;
  }
  if (REJECTED_ESTADOS.has(normalized) || normalized === 'RCH') {
    return FiscalDteEmissionStatus.RCH;
  }
  if (PROCESSING_ESTADOS.has(normalized)) {
    return null;
  }
  return null;
}

export function buildSiiRejectionMessage(raw: string, estado: string): string | null {
  const rechazo = extractRechazoFromEnvioStatusResponse(raw);
  if (rechazo?.errors.length) {
    return `SII rechazó el envío (${estado}): ${rechazo.errors.join('; ').slice(0, 400)}`;
  }
  if (rechazo?.descripcion) {
    return `SII rechazó el envío (${estado}): ${rechazo.descripcion}`.slice(0, 400);
  }
  if (REJECTED_ESTADOS.has(estado.trim().toUpperCase())) {
    return `SII rechazó el envío: estado ${estado}`.slice(0, 400);
  }
  return null;
}

export function resolveSiiEnvioStatus(raw: string): ResolvedSiiEnvioStatus {
  const estado = extractEstadoFromEnvioStatusResponse(raw);
  const mapped = mapSiiEstadoToEnvioStatus(estado);
  if (mapped === FiscalDteEmissionStatus.EPR) {
    return { envioStatus: mapped, estado, rejectionMessage: null };
  }
  if (mapped === FiscalDteEmissionStatus.RCH) {
    return {
      envioStatus: mapped,
      estado,
      rejectionMessage: buildSiiRejectionMessage(raw, estado),
    };
  }
  return { envioStatus: FiscalDteEmissionStatus.SENT, estado, rejectionMessage: null };
}

export function isTerminalEnvioStatus(status: FiscalDteEmissionStatus): boolean {
  return (
    status === FiscalDteEmissionStatus.EPR ||
    status === FiscalDteEmissionStatus.RCH ||
    status === FiscalDteEmissionStatus.FAILED
  );
}

export function isSuccessfulEnvioStatus(status: FiscalDteEmissionStatus): boolean {
  return (
    status === FiscalDteEmissionStatus.SENT ||
    status === FiscalDteEmissionStatus.EPR
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfterMs(retryAfter?: string): number {
  if (!retryAfter?.trim()) return 0;
  const seconds = Number(retryAfter.trim());
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.round(seconds * 1000);
}

export function resolveInitialPollDelayMs(retryAfter?: string, minDelayMs = 2500): number {
  return Math.max(parseRetryAfterMs(retryAfter), minDelayMs);
}

export async function pollEnvioStatus(
  fetchStatus: () => Promise<{ estado: string; raw: string }>,
  options: PollEnvioStatusOptions = {},
): Promise<{ envioStatus: FiscalDteEmissionStatus; raw: string; rejectionMessage: string | null }> {
  const maxAttempts = options.maxAttempts ?? 5;
  const delayMs = options.delayMs ?? 2500;
  const initialDelayMs = options.initialDelayMs ?? delayMs;
  let lastRaw = '';
  let lastResolved: ResolvedSiiEnvioStatus | null = null;

  if (initialDelayMs > 0) {
    await sleep(initialDelayMs);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { raw } = await fetchStatus();
    lastRaw = raw;
    lastResolved = resolveSiiEnvioStatus(raw);
    if (
      lastResolved.envioStatus === FiscalDteEmissionStatus.EPR ||
      lastResolved.envioStatus === FiscalDteEmissionStatus.RCH
    ) {
      return {
        envioStatus: lastResolved.envioStatus,
        raw,
        rejectionMessage: lastResolved.rejectionMessage,
      };
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    envioStatus: lastResolved?.envioStatus ?? FiscalDteEmissionStatus.SENT,
    raw: lastRaw,
    rejectionMessage: lastResolved?.rejectionMessage ?? null,
  };
}
