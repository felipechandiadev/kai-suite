import {
  computeSubmitBackoffMs,
  hasPrintableBoleta,
  isSiiSubmissionComplete,
} from '../../application/fiscal-emission-status.util';
import { FiscalDteEmissionStatus } from '../../domain/fiscal.enums';
import type { FiscalDteEmission } from '../../domain/fiscal-dte-emission.entity';

describe('fiscal-emission-status.util', () => {
  it('hasPrintableBoleta returns true when tedXml is present', () => {
    expect(hasPrintableBoleta({ tedXml: '<TED/>' } as FiscalDteEmission)).toBe(true);
    expect(hasPrintableBoleta({ tedXml: '' } as FiscalDteEmission)).toBe(false);
    expect(hasPrintableBoleta(null)).toBe(false);
  });

  it('isSiiSubmissionComplete covers SENT and EPR only', () => {
    expect(isSiiSubmissionComplete(FiscalDteEmissionStatus.SENT)).toBe(true);
    expect(isSiiSubmissionComplete(FiscalDteEmissionStatus.EPR)).toBe(true);
    expect(isSiiSubmissionComplete(FiscalDteEmissionStatus.PENDING)).toBe(false);
  });

  it('computeSubmitBackoffMs grows exponentially with cap', () => {
    expect(computeSubmitBackoffMs(0, 5000)).toBe(5000);
    expect(computeSubmitBackoffMs(1, 5000)).toBe(10000);
    expect(computeSubmitBackoffMs(8, 5000)).toBe(5000 * 256);
    expect(computeSubmitBackoffMs(20, 5000)).toBe(computeSubmitBackoffMs(8, 5000));
  });
});
