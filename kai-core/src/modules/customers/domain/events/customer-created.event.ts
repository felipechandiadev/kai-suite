/**
 * EVENTO DE DOMINIO: CustomerCreated
 *
 * Se emite cuando un cliente es creado exitosamente.
 * Suscriptores (listeners) pueden reaccionar automáticamente:
 * - Auditoría: registrar creación de cliente
 * - Webhooks: notificar sistemas externos
 * - Integraciones: sincronizar con otros sistemas
 *
 * Propósito: Desacoplar lógica de clientes de efectos secundarios
 */
export class CustomerCreatedEvent {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
  ) {}
}
