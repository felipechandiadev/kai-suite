import {
  formatProductionUnitCode,
  nextProductionUnitCodeFromExisting,
  parseProductionUnitCodeSequence,
} from '../../application/production-unit-code.util';

describe('production-unit-code.util', () => {
  it('parseProductionUnitCodeSequence accepts UPR#####', () => {
    expect(parseProductionUnitCodeSequence('UPR00001')).toBe(1);
    expect(parseProductionUnitCodeSequence('UPR-00001')).toBeNull();
    expect(parseProductionUnitCodeSequence('COCINA')).toBeNull();
  });

  it('nextProductionUnitCodeFromExisting picks max+1', () => {
    expect(
      nextProductionUnitCodeFromExisting(['COCINA', 'UPR00002', 'UPR00001']),
    ).toBe('UPR00003');
    expect(nextProductionUnitCodeFromExisting([])).toBe('UPR00001');
  });

  it('formatProductionUnitCode pads and grows', () => {
    expect(formatProductionUnitCode(2)).toBe('UPR00002');
    expect(formatProductionUnitCode(100000)).toBe('UPR100000');
  });
});
