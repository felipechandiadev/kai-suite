import {
  computePeNet,
  computeSuggestedNet,
  computeTargetNet,
  resolvePricingAlert,
} from '@modules/pricing/application/pricing-calculation.util';

describe('pricing-calculation.util', () => {
  it('computes PE and suggested price', () => {
    const floor = 853.33;
    const unitQuota = 750;
    const pe = computePeNet(floor, unitQuota);
    expect(pe).toBe(1603.33);
    const target = computeTargetNet(floor, 35);
    expect(target).toBe(1312.82);
    expect(computeSuggestedNet(target, pe)).toBe(1603.33);
  });

  it('resolves alerts', () => {
    expect(resolvePricingAlert(0, 1000, 1200)).toBe('INSUFFICIENT_DATA');
    expect(resolvePricingAlert(100, 80, 150)).toBe('BELOW_FLOOR');
    expect(resolvePricingAlert(100, 110, 150)).toBe('BELOW_PE');
    expect(resolvePricingAlert(100, 160, 150)).toBe('OK');
  });
});
