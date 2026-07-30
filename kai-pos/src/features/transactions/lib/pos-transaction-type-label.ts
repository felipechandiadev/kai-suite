/**
 * Etiquetas en español para `TransactionType` (y filas virtuales del POS).
 * Mantener alineado con `kai-admin/.../transaction-types.ts`.
 */
export const POS_TRANSACTION_TYPE_LABEL: Record<string, string> = {
  SALE: "Venta",
  SALE_RETURN: "Devolución de venta",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito cliente",
  CUSTOMER_CREDIT_NOTE_PAYOUT: "Devolución saldo NC",
  PURCHASE: "Compra",
  PURCHASE_ORDER: "Orden de compra",
  PURCHASE_RETURN: "Devolución a proveedor",
  SUPPLIER_CREDIT_NOTE: "Nota de crédito proveedor",
  SUPPLIER_INVOICE: "Factura de proveedor",
  SUPPLIER_RECEIPT: "Boleta de proveedor",
  SUPPLIER_HONORARIUM_RECEIPT: "Boleta de honorarios proveedor",
  SUPPLIER_GUIDE: "Guía de despacho proveedor",
  CUSTOMER_ORDER: "Pedido de cliente",
  QUOTATION: "Cotización",
  BACKORDER: "Encargo",
  SERVICE_ORDER: "Orden de servicio",
  PRODUCTION_BATCH: "Lote de producción",
  TRANSFER_OUT: "Transferencia (salida)",
  TRANSFER_IN: "Transferencia (entrada)",
  ADJUSTMENT_IN: "Ajuste inventario (+)",
  ADJUSTMENT_OUT: "Ajuste inventario (-)",
  INVENTORY_COUNT: "Conteo de inventario",
  INVENTORY_RESERVATION: "Reserva de inventario",
  INVENTORY_BLOCK: "Bloqueo de inventario",
  INVENTORY_UNBLOCK: "Desbloqueo de inventario",
  PAYMENT_IN: "Cobro a cliente",
  BANK_TO_CASH_TRANSFER: "Giro banco a centro de efectivo",
  PAYROLL_PAYMENT: "Pago de remuneraciones",
  SUPPLIER_PAYMENT: "Pago a proveedor",
  EXPENSE_PAYMENT: "Pago de gasto operativo",
  PAYROLL: "Nómina",
  PAYMENT_EXECUTION: "Ejecución de pago (nómina)",
  VOID_ADJUSTMENT: "Anulación / ajuste",
  CASH_DEPOSIT: "Depósito de efectivo (centro → banco)",
  OPERATING_EXPENSE: "Gasto operativo",
  CASH_SESSION_OPENING: "Apertura de caja",
  CASH_SESSION_CLOSING: "Cierre de caja",
  CASH_SESSION_WITHDRAWAL: "Retiro de caja",
  CASH_SESSION_DEPOSIT: "Ingreso a caja",
  CASH_SESSION_TO_HUB_TRANSFER: "Traslado caja → centro de acopio",
  CAPITAL_CONTRIBUTION: "Aporte de capital",
  BANK_WITHDRAWAL_TO_SHAREHOLDER: "Retiro a accionista",
  CASH_WITHDRAWAL_TO_PETTY_CASH: "Giro banco → caja chica",
  /** Fila virtual en movimientos de sesión (vuelto). */
  CASH_CHANGE: "Vuelto en efectivo",
};

export function posTransactionTypeLabel(type: string | null | undefined): string {
  const key = type?.trim();
  if (!key) return "—";
  return POS_TRANSACTION_TYPE_LABEL[key] ?? key;
}
