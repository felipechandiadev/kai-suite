export type PosSaleForReturnLine = {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  /** Cantidad aún devolvable (tope por variante). */
  returnableQuantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
};

export type PosSaleForReturn = {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  lineMaxReturnableQtyByVariantId: Record<string, number>;
  lines: PosSaleForReturnLine[];
};
