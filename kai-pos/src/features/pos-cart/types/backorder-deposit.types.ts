/** Abono / anticipo de encargo (backorder) asociado al carrito antes del pago. */
export type BackorderDepositConfig = {
  /** Porcentaje acordado (entero, p. ej. 30). */
  percent: number;
  /** Monto en CLP (entero, sin decimales); puede diferir del % redondeado. */
  amount: number;
};
