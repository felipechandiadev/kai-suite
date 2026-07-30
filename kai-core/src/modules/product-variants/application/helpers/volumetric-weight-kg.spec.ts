import {
  DEFAULT_VOLUMETRIC_DIVISOR_K,
  effectiveVolumetricDivisorK,
  volumetricWeightKgFromPackageCm,
} from './volumetric-weight-kg';

describe('volumetric-weight-kg', () => {
  it('effectiveVolumetricDivisorK uses default when null/undefined', () => {
    expect(effectiveVolumetricDivisorK(null)).toBe(DEFAULT_VOLUMETRIC_DIVISOR_K);
    expect(effectiveVolumetricDivisorK(undefined)).toBe(
      DEFAULT_VOLUMETRIC_DIVISOR_K,
    );
    expect(effectiveVolumetricDivisorK(0)).toBe(DEFAULT_VOLUMETRIC_DIVISOR_K);
  });

  it('effectiveVolumetricDivisorK respects explicit K', () => {
    expect(effectiveVolumetricDivisorK(4000)).toBe(4000);
  });

  it('volumetricWeightKgFromPackageCm: 40×30×20 / 5000 = 4.8 kg', () => {
    expect(
      volumetricWeightKgFromPackageCm({
        packageLengthCm: 40,
        packageWidthCm: 30,
        packageHeightCm: 20,
        volumetricDivisorK: 5000,
      }),
    ).toBeCloseTo(4.8, 6);
  });

  it('returns null if a dimension is missing', () => {
    expect(
      volumetricWeightKgFromPackageCm({
        packageLengthCm: 10,
        packageWidthCm: 10,
        packageHeightCm: undefined,
      }),
    ).toBeNull();
  });
});
