/**
 * Contrato de `Transaction.metadata.backorder` cuando
 * `transactionType === BACKORDER`.
 *
 * Modela una **reserva / backorder** de mercadería sin stock: el cliente puede
 * dejar **anticipo** (`depositAmount`, también `0` si es solo reserva) que luego
 * se imputa como medio de pago al concretar la venta. El detalle comercial va en
 * `transaction_lines`
 * (misma forma que venta o cotización); la cabecera lleva `customerId` y montos
 * de documento (`subtotal`, `taxAmount`, `total`, `amountPaid`, etc.).
 */
export type BackorderReservationStatus =
  | 'OPEN'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface TransactionBackorderCustomerSnapshot {
  name?: string | null;
  document?: string | null;
  phone?: string | null;
}

/**
 * Bloque persistido en `transactions.metadata` bajo la clave `backorder`.
 */
export interface TransactionBackorderMetadata {
  /**
   * Ciclo de vida comercial de la reserva.
   * Por defecto se asume `OPEN` al crear si no se envía.
   */
  reservationStatus?: BackorderReservationStatus;

  /**
   * Monto de anticipo acordado o cobrado (misma moneda que la transacción;
   * hoy el sistema usa montos numéricos en la cabecera sin columna ISO).
   */
  depositAmount: number;

  /** Porcentaje de abono acordado (entero, p. ej. 30), solo informativo en POS. */
  depositPercent?: number;

  /**
   * Anticipo ya consumido como medio de pago en ventas u otras transacciones
   * (suma acumulada; se actualiza al imputar).
   */
  depositConsumedAmount?: number;

  /**
   * Transacción que liquida la reserva (p. ej. `SALE`) cuando `reservationStatus`
   * pasa a `FULFILLED`.
   */
  fulfilledByTransactionId?: string | null;

  /** Folio legible de la transacción que cumplió la reserva (denormalizado UX). */
  fulfilledByDocumentNumber?: string | null;

  /** Vigencia opcional de la reserva (ISO 8601). */
  validUntil?: string | null;

  /** Términos / condiciones comerciales (texto libre). */
  terms?: string | null;

  /** Lista de precios usada al cotizar la reserva (opcional). */
  priceListId?: string | null;

  /** Snapshot del cliente al emitir (útil en POS si no hay `customerId` temporal). */
  customerSnapshot?: TransactionBackorderCustomerSnapshot;

  /** Nota operativa (p. ej. fecha estimada de reposición). */
  expectedAvailabilityNote?: string | null;

  /**
   * Cuando el anticipo se registró vía `PAYMENT_IN` u otra transacción hija,
   * referencia opcional para conciliación.
   */
  depositPaymentTransactionId?: string | null;

  /** NC emitida al anular el encargo (saldo de abono no consumido). */
  creditNoteTransactionId?: string | null;

  /** ISO 8601 — momento de anulación comercial. */
  cancelledAt?: string | null;

  /** Motivo opcional registrado desde admin. */
  cancelReason?: string | null;
}
