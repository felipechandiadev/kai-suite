import { recipeInputQuantityForOutput } from '../../application/recipe-consumption.util';

describe('recipeInputQuantityForOutput', () => {
  it('sums base and waste per output unit', () => {
    expect(recipeInputQuantityForOutput(2, 0.5, 10)).toBe(25);
  });

  it('ignores waste when zero', () => {
    expect(recipeInputQuantityForOutput(2, 0, 3)).toBe(6);
  });
});
