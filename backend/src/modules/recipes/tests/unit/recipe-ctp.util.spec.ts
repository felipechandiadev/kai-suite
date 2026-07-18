import {
  buildCtpDetailLines,
  producibleQtyFromLines,
} from '../../application/recipe-ctp.util';

describe('producibleQtyFromLines', () => {
  it('A+B ON → min capacity 1', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: true,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: true,
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(qty).toBe(1);
  });

  it('A OFF → only B → 1', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: false,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: true,
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(qty).toBe(1);
  });

  it('B OFF → only A → 4', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: true,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: false,
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(qty).toBe(4);
  });

  it('includes waste in consumption', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0.1,
          limitsProjectedStock: true,
        },
      ],
      new Map([['a', 2]]),
    );
    // floor(2 / 0.6) = 3
    expect(qty).toBe(3);
  });

  it('returns null when no limiting lines', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: false,
        },
      ],
      new Map([['a', 2]]),
    );
    expect(qty).toBeNull();
  });

  it('ignores non-tracked inventory lines', () => {
    const qty = producibleQtyFromLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: true,
          trackInventory: false,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: true,
          trackInventory: true,
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(qty).toBe(1);
  });
});

describe('buildCtpDetailLines', () => {
  it('marks bottleneck on limiting line with min capacity', () => {
    const { producibleQty, lines } = buildCtpDetailLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: true,
          inputProductName: 'A',
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: true,
          inputProductName: 'B',
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(producibleQty).toBe(1);
    const a = lines.find((l) => l.inputVariantId === 'a');
    const b = lines.find((l) => l.inputVariantId === 'b');
    expect(a?.lineCapacity).toBe(4);
    expect(b?.lineCapacity).toBe(1);
    expect(b?.isBottleneck).toBe(true);
    expect(a?.isBottleneck).toBe(false);
  });

  it('sets lineCapacity null for non-limiting lines', () => {
    const { lines } = buildCtpDetailLines(
      [
        {
          inputVariantId: 'a',
          qtyPerOutputUnit: 0.5,
          wasteFactor: 0,
          limitsProjectedStock: false,
        },
        {
          inputVariantId: 'b',
          qtyPerOutputUnit: 1,
          wasteFactor: 0,
          limitsProjectedStock: true,
        },
      ],
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
    expect(lines.find((l) => l.inputVariantId === 'a')?.lineCapacity).toBeNull();
    expect(lines.find((l) => l.inputVariantId === 'b')?.lineCapacity).toBe(1);
  });
});
