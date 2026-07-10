import {
  buildDbRequiresDteMap,
  parsePosLineRequiresDteSnapshot,
  resolveEffectiveLineRequiresDteMap,
} from '../../domain/resolve-effective-line-requires-dte';

describe('resolve-effective-line-requires-dte', () => {
  const dbMap = new Map([
    ['v-dte', true],
    ['v-no', false],
    ['v-lucky', true],
  ]);

  it('BD=true + POS=false → no tributario (caso Lucky)', () => {
    const effective = resolveEffectiveLineRequiresDteMap(
      ['v-lucky'],
      dbMap,
      { 'v-lucky': false },
    );
    expect(effective.get('v-lucky')).toBe(false);
  });

  it('BD=false + POS=true → no tributario', () => {
    const effective = resolveEffectiveLineRequiresDteMap(
      ['v-no'],
      dbMap,
      { 'v-no': true },
    );
    expect(effective.get('v-no')).toBe(false);
  });

  it('ambos true → tributario', () => {
    const effective = resolveEffectiveLineRequiresDteMap(
      ['v-dte'],
      dbMap,
      { 'v-dte': true },
    );
    expect(effective.get('v-dte')).toBe(true);
  });

  it('sin snapshot POS usa solo BD', () => {
    const effective = resolveEffectiveLineRequiresDteMap(['v-dte', 'v-no'], dbMap, null);
    expect(effective.get('v-dte')).toBe(true);
    expect(effective.get('v-no')).toBe(false);
  });

  it('parsePosLineRequiresDteSnapshot lee metadata', () => {
    const parsed = parsePosLineRequiresDteSnapshot({
      lineRequiresDte: { v1: false, v2: true },
    });
    expect(parsed).toEqual({ v1: false, v2: true });
  });

  it('buildDbRequiresDteMap respeta columna', () => {
    const map = buildDbRequiresDteMap([
      { id: 'a', requiresDte: true, taxCategory: 'TAX_STANDARD' },
      { id: 'b', requiresDte: false, taxCategory: 'TAX_STANDARD' },
    ]);
    expect(map.get('a')).toBe(true);
    expect(map.get('b')).toBe(false);
  });

  it('buildDbRequiresDteMap TAX_OUT_OF_SCOPE fuerza false aunque requiresDte true', () => {
    const map = buildDbRequiresDteMap([
      {
        id: 'v-lucky',
        requiresDte: true,
        taxCategory: 'TAX_OUT_OF_SCOPE',
      },
    ]);
    expect(map.get('v-lucky')).toBe(false);
  });

  it('variante ausente en dbMap → no tributario', () => {
    const effective = resolveEffectiveLineRequiresDteMap(
      ['v-missing'],
      new Map(),
      null,
    );
    expect(effective.get('v-missing')).toBe(false);
  });
});
