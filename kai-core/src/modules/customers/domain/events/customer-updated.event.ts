/**
 * EVENTO DE DOMINIO: CustomerUpdated
 *
 * Se emite cuando un cliente es actualizado.
 * Suscriptores (listeners) pueden reaccionar automáticamente:
 * - Auditoría: registrar cambios
 * - Validaciones: verificar límites de crédito
 * - Notificaciones: alertar sobre cambios importantes
 *
 * Propósito: Desacoplar lógica de actualización de efectos secundarios
 */
export class CustomerUpdatedEvent {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
  ) {}
}
