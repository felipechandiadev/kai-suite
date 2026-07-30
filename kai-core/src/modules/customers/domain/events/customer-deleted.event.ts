/**
 * EVENTO DE DOMINIO: CustomerDeleted
 *
 * Se emite cuando un cliente es eliminado (soft delete).
 * Suscriptores (listeners) pueden reaccionar automáticamente:
 * - Auditoría: registrar eliminación
 * - Integraciones: marcar como inactivo en sistemas externos
 * - Transacciones: bloquear nuevas operaciones
 *
 * Propósito: Desacoplar lógica de eliminación de efectos secundarios
 */
export class CustomerDeletedEvent {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
  ) {}
}
