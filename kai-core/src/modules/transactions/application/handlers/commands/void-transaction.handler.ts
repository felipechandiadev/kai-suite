import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { VoidTransactionCommand } from '@modules/transactions/application/commands/transaction-commands';
import {
  Transaction,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { EventStore } from '@modules/transactions/infrastructure/event-store/event-store.service';
import { TransactionVoidedEvent } from '@modules/transactions/domain/events';
import { CacheService } from '@shared/cache/cache.service';

@CommandHandler(VoidTransactionCommand)
export class VoidTransactionCommandHandler implements ICommandHandler<VoidTransactionCommand> {
  private readonly logger = new Logger(VoidTransactionCommandHandler.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBus,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: VoidTransactionCommand): Promise<Transaction> {
    this.logger.debug(
      `Voiding transaction: ${command.transactionId}, reason: ${command.voidReason}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find transaction
      const transactionEntity = await queryRunner.manager.findOne(
        TransactionOrmEntity,
        {
          where: { id: command.transactionId },
          relations: ['customer', 'branch', 'user', 'lines', 'payments'],
        },
      );

      if (!transactionEntity) {
        throw new NotFoundException(
          `Transaction ${command.transactionId} not found`,
        );
      }

      // Convert to domain entity
      const transaction = Transaction.fromOrmEntity(transactionEntity);

      // Validate transaction can be voided
      if (transaction.status === TransactionStatus.VOIDED) {
        throw new BadRequestException('Transaction is already voided');
      }

      if (transaction.status === TransactionStatus.COMPLETED) {
        // Additional validation for completed transactions
        // Could check if payments were made, inventory was adjusted, etc.
      }

      // Update transaction status
      transactionEntity.status = TransactionStatus.VOIDED;
      transactionEntity.updatedAt = new Date();
      transactionEntity.notes = transactionEntity.notes
        ? `${transactionEntity.notes}\nVOIDED: ${command.voidReason} (by ${command.voidedBy})`
        : `VOIDED: ${command.voidReason} (by ${command.voidedBy})`;

      await queryRunner.manager.save(transactionEntity);

      // Create domain event
      const voidedEvent = new TransactionVoidedEvent(
        command.transactionId,
        transaction,
        command.voidReason,
        command.voidedBy,
      );

      // Save to event store
      await this.eventStore.save(
        voidedEvent,
        command.transactionId,
        'Transaction',
      );

      // Publish event
      this.eventBus.publish(voidedEvent);

      // Invalidate cache
      await this.cacheService.invalidateTransactionDetails(
        command.transactionId,
      );
      if (transaction.customerId) {
        await this.cacheService.invalidateCustomerCache(transaction.customerId);
      }

      await queryRunner.commitTransaction();

      // Convert back to domain entity
      const updatedTransaction = Transaction.fromOrmEntity(transactionEntity);

      this.logger.debug(
        `Transaction ${command.transactionId} voided successfully`,
      );
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to void transaction ${command.transactionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
