import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { LedgerEntriesService } from '@modules/ledger-entries/application/ledger-entries.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

/**
 * LISTENER: Reacciona a evento TransactionCreated
 *
 * Responsabilidad: Ejecutar motor contable automáticamente
 * cuando se crea una transacción.
 *
 * Desacoplamiento: El servicio de transacciones NO llama directamente
 * al motor contable. Solo emite evento. El listener escucha y reacciona.
 *
 * Flujo de transacción:
 * 1. TransactionsService.createTransaction() → crea Transaction
 * 2. Emite: EventEmitter.emit('transaction.created', event)
 * 3. AccountingEngineListener escucha (@OnEvent)
 * 4. Llama: LedgerEntriesService.generateEntriesForTransaction()
 * 5. Crea: asientos contables en BD
 *
 * Importantes:
 * - El listener crea su propia transacción DB para aislar la lógica contable
 * - Si falla motor contable, la transacción ya existe en BD
 * - Logging completo para debugging
 */
@Injectable()
export class AccountingEngineListener {
  private logger = new Logger(AccountingEngineListener.name);

  constructor(
    private readonly ledgerService: LedgerEntriesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Listener: Ejecuta cuando se emite evento 'transaction.created'
   */
  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionCreatedEvent) {
    try {
      this.logger.log(
        `[ACCOUNTING ENGINE] Transaction created event detected. ` +
          `TransactionId: ${event.transaction.id}, ` +
          `Type: ${event.transaction.transactionType}`,
      );

      // Crear nueva transacción DB para generar asientos
      // Esto aísla la lógica contable del flujo de creación de transacción
      await this.dataSource.transaction(async (manager: EntityManager) => {
        // Aquí podría haber validaciones adicionales específicas del motor contable
        // Por ahora, delegamos directamente a LedgerEntriesService

        const ledgerResponse =
          await this.ledgerService.generateEntriesForTransaction(
            event.transaction,
            event.companyId,
            manager,
          );

        if (ledgerResponse.status === 'REJECTED') {
          this.logger.error(
            `[ACCOUNTING ENGINE] FAILED to generate entries for transaction ${event.transaction.id}. ` +
              `Error: ${ledgerResponse.errors[0]?.message || 'Unknown error'}`,
          );
          // Nota: Si el motor contable falla, la transacción ya existe en BD (fue creada antes del evento)
          // Esta es una decisión de diseño: transacciones son creadas independientemente del motor contable
          // Posibles mejoras futuras:
          // - Reintento automático con backoff exponencial
          // - Alertas/notificaciones para casos manuales
          throw new Error(
            `Accounting engine rejected transaction ${event.transaction.id}: ${ledgerResponse.errors[0]?.message}`,
          );
        }

        this.logger.log(
          `[ACCOUNTING ENGINE] Successfully generated ${ledgerResponse.entriesGenerated} entries ` +
            `for transaction ${event.transaction.id}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `[ACCOUNTING ENGINE] ERROR processing transaction ${event.transaction.id}: ` +
          `${(error as Error).message}`,
      );
      // En desarrollo, esparcir el error. En producción, podría loguear para revisión manual
      throw error;
    }
  }
}
