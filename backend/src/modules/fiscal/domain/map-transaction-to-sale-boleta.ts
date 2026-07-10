import type { Person } from '@modules/persons/domain/person.entity';
import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import type { VariantTaxCategory } from '@modules/product-variants/domain/variant-tax-category';
import { resolveLineBoletaExempt } from './resolve-line-boleta-exempt';
import type { SaleBoletaDocument, SaleBoletaLine, SaleBoletaReceptor } from './sale-boleta.types';

export const GENERIC_BOLETA_RECEPTOR: SaleBoletaReceptor = {
  rut: '66666666-6',
  name: 'Cliente',
};

function chileanDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return '0';
  if (rest === 10) return 'K';
  return String(rest);
}

export function formatChileanRut(raw: string): string | null {
  const cleaned = raw.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (/^\d{7,8}-[\dK]$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/[^0-9K]/g, '');
  if (digits.length < 8) return null;
  const dv = digits.slice(-1);
  const body = digits.slice(0, -1);
  if (body.length < 7) return null;
  return `${body}-${dv}`;
}

function personDisplayName(person: Person): string {
  const business = person.businessName?.trim();
  if (business) return business.slice(0, 100);
  const parts = [person.firstName, person.lastName].map((s) => s?.trim()).filter(Boolean);
  return (parts.join(' ') || 'Cliente').slice(0, 100);
}

export function resolveReceptorFromPerson(person: Person | null | undefined): SaleBoletaReceptor {
  if (!person) return { ...GENERIC_BOLETA_RECEPTOR };
  const docType = String(person.documentType ?? '').toUpperCase();
  if (docType !== 'RUN' && docType !== 'RUT') {
    return { ...GENERIC_BOLETA_RECEPTOR };
  }
  const formatted = formatChileanRut(person.documentNumber ?? '');
  if (!formatted) return { ...GENERIC_BOLETA_RECEPTOR };
  return {
    rut: formatted,
    name: personDisplayName(person),
  };
}

export function mapTransactionLineToBoletaLine(
  line: TransactionLine,
  variantTaxCategory?: VariantTaxCategory,
): SaleBoletaLine {
  const qty = Number(line.quantity) || 0;
  const total = Math.round(Number(line.total) || 0);
  const taxRate = Number(line.taxRate) || 0;
  const taxAmount = Math.round(Number(line.taxAmount) || 0);
  const unitPriceWithIva = qty > 0 ? Math.round(total / qty) : 0;
  const name =
    line.productName?.trim() ||
    line.variantName?.trim() ||
    line.productSku?.trim() ||
    'Item';
  const unitMeasure = line.unitOfMeasure?.trim() || 'UN';
  return {
    name: name.slice(0, 80),
    quantity: qty,
    unitPriceWithIva,
    exempt: resolveLineBoletaExempt({
      taxCategory: variantTaxCategory,
      taxRate,
      taxAmount,
    }),
    unitMeasure: unitMeasure.slice(0, 4) || 'UN',
  };
}

export function mapTransactionToSaleBoleta(
  lines: TransactionLine[],
  person?: Person | null,
  variantTaxCategoryByVariantId?: ReadonlyMap<string, VariantTaxCategory>,
): SaleBoletaDocument {
  if (!lines.length) {
    throw new Error('La venta no tiene líneas para boleta');
  }
  return {
    lines: lines.map((line) => {
      const variantId = line.productVariantId?.trim() ?? '';
      const taxCategory =
        variantId && variantTaxCategoryByVariantId
          ? variantTaxCategoryByVariantId.get(variantId)
          : undefined;
      return mapTransactionLineToBoletaLine(line, taxCategory);
    }),
    receptor: resolveReceptorFromPerson(person),
  };
}
