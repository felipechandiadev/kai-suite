/** Monto CLP entero desde `TextField` `type="currency"` (solo dígitos). */
export function parseClpCurrencyInput(raw: string): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export type UnitGrossPriceParts = {
  unitPrice: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
};

/** Separa precio unitario bruto (con IVA) en neto + impuesto según tasa de la línea. */
export function splitUnitGrossPrice(
  unitPriceWithTax: number,
  unitTaxRate: number,
): UnitGrossPriceParts {
  const gross = Math.round(Math.max(0, unitPriceWithTax));
  const rate = Number(unitTaxRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { unitPrice: gross, unitTaxAmount: 0, unitPriceWithTax: gross };
  }
  const unitPrice = Math.round(gross / (1 + rate / 100));
  const unitTaxAmount = gross - unitPrice;
  return { unitPrice, unitTaxAmount, unitPriceWithTax: gross };
}

export function applyUnitGrossPriceToCartLine<
  T extends { unitTaxRate: number; unitPrice: number; unitTaxAmount: number; unitPriceWithTax: number },
>(line: T, unitPriceWithTax: number): T {
  const parts = splitUnitGrossPrice(unitPriceWithTax, line.unitTaxRate);
  return { ...line, ...parts };
}
