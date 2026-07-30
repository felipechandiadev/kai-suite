import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * EVENTO DE DOMINIO: TransactionCreated
 *
 * Se emite cuando una transacción es creada exitosamente.
 * Suscriptores (listeners) pueden reaccionar automáticamente:
 * - Motor contable: generar asientos automáticamente
 * - Auditoría: registrar evento
 * - Webhooks: notificar sistemas externos
 *
 * Propósito: Desacoplar lógica de transacciones de efectos secundarios
 */
export class TransactionCreatedEvent {
  constructor(
    public readonly transaction: Transaction,
    public readonly companyId: string,
  ) {}
}
