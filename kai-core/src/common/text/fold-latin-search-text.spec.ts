import {
  foldLatinSearchText,
  toLatinSearchPattern,
} from './fold-latin-search-text';

describe('foldLatinSearchText', () => {
  it('folds accents and case for café variants', () => {
    const variants = ['cafe', 'Cafe', 'café', 'Café', 'CAFE', 'CAFÉ'];
    const expected = foldLatinSearchText('cafe');
    for (const v of variants) {
      expect(foldLatinSearchText(v)).toBe(expected);
    }
  });

  it('builds ilike pattern', () => {
    expect(toLatinSearchPattern('Café')).toBe('%cafe%');
  });
});
