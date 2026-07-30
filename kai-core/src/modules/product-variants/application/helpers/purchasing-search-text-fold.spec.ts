import { foldPurchasingSearchText } from './purchasing-search-text-fold';

describe('foldPurchasingSearchText', () => {
  it('pasa a minúsculas y quita tildes mapeadas (español)', () => {
    expect(foldPurchasingSearchText('Café')).toBe('cafe');
    expect(foldPurchasingSearchText('  Ñoño  ')).toBe('nono');
  });
});
