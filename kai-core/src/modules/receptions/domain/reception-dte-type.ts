/** Tipo de documento tributario asociado a la recepción (metadata en transacción de ingreso). */
export const RECEPTION_DTE_TYPES = ['invoice', 'receipt', 'guide', 'other'] as const;
export type ReceptionDteType = (typeof RECEPTION_DTE_TYPES)[number];
