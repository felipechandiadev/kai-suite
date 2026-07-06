import type { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import { FiscalDteEmissionStatus } from '../domain/fiscal.enums';

/** Boleta imprimible si tiene TED firmado localmente (independiente del estado SII). */
export function hasPrintableBoleta(
  emission: Pick<FiscalDteEmission, 'tedXml'> | null | undefined,
): boolean {
  return Boolean(emission?.tedXml?.trim());
}

/** Envío al SII completado (recibido o procesado OK). */
export function isSiiSubmissionComplete(status: FiscalDteEmissionStatus): boolean {
  return (
    status === FiscalDteEmissionStatus.SENT ||
    status === FiscalDteEmissionStatus.EPR
  );
}

/** Estados en los que el worker puede intentar envío o poll. */
export function isWorkerSubmittableStatus(status: FiscalDteEmissionStatus): boolean {
  return (
    status === FiscalDteEmissionStatus.PENDING ||
    status === FiscalDteEmissionStatus.FAILED ||
    status === FiscalDteEmissionStatus.SENT
  );
}

export function computeSubmitBackoffMs(
  attempt: number,
  baseMs: number,
): number {
  const safeAttempt = Math.max(0, attempt);
  const capped = Math.min(safeAttempt, 8);
  return baseMs * Math.pow(2, capped);
}
