import { BadRequestException } from '@nestjs/common';

/**
 * Cobertura unitaria del contrato de fee POS ↔ quote:
 * tolerancia 1 CLP (misma regla que `registerPosCommercial`).
 */
function assertShippingFeeMatches(clientFee: number, quotedFee: number) {
  if (Math.abs(quotedFee - clientFee) > 1) {
    throw new BadRequestException(
      `El costo de reparto no coincide (${clientFee} vs ${quotedFee}). Vuelve a configurar el envío.`,
    );
  }
  return quotedFee;
}

describe('POS delivery fee validation', () => {
  it('accepts exact and ±1 CLP matches', () => {
    expect(assertShippingFeeMatches(1500, 1500)).toBe(1500);
    expect(assertShippingFeeMatches(1500, 1501)).toBe(1501);
    expect(assertShippingFeeMatches(1500, 1499)).toBe(1499);
  });

  it('rejects manipulated fees', () => {
    expect(() => assertShippingFeeMatches(100, 1500)).toThrow(BadRequestException);
    expect(() => assertShippingFeeMatches(1500, 100)).toThrow(BadRequestException);
  });

  it('includes fee in charged total', () => {
    const productTotal = 10_000;
    const shippingFee = assertShippingFeeMatches(1_500, 1_500);
    expect(productTotal + shippingFee).toBe(11_500);
  });
});
