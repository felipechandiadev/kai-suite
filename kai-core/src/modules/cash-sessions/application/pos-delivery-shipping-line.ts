/**
 * Línea de fee de reparto local para ventas POS.
 * Sin productVariantId → no mueve stock; cuadra sum(lines.total) con cabecera.
 */
export const POS_DELIVERY_SHIPPING_LINE_NOTES = 'pos_delivery_shipping';

export type PosDeliveryShippingLine = {
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  notes: string;
};

export function buildPosDeliveryShippingLine(input: {
  shippingFee: number;
  zoneName?: string | null;
}): PosDeliveryShippingLine {
  const fee = Math.max(0, Math.round(Number(input.shippingFee) || 0));
  const zone = String(input.zoneName ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const productName = zone ? `Reparto · ${zone}` : 'Reparto local';

  return {
    productName,
    quantity: 1,
    unitPrice: fee,
    unitCost: 0,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    subtotal: fee,
    total: fee,
    notes: POS_DELIVERY_SHIPPING_LINE_NOTES,
  };
}
