import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CompleteTransactionCommand } from '@modules/transactions/application/commands/transaction-commands';
import {
  Transaction,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { EventStore } from '@modules/transactions/infrastructure/event-store/event-store.service';
import {
  TransactionStatusChangedEvent,
  TransactionPaymentCompletedEvent,
} from '@modules/transactions/domain/events';
import { CacheService } from '@shared/cache/cache.service';

@CommandHandler(CompleteTransactionCommand)
export class CompleteTransactionCommandHandler implements ICommandHandler<CompleteTransactionCommand> {
  private readonly logger = new Logger(CompleteTransactionCommandHandler.name);

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBus,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: CompleteTransactionCommand): Promise<Transaction> {
    this.logger.debug(`Completing transaction: ${command.transactionId}`);

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

      // Validate transaction can be completed
      if (transaction.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException('Transaction is already completed');
      }

      if (transaction.status === TransactionStatus.VOIDED) {
        throw new BadRequestException('Cannot complete a voided transaction');
      }

      // Calculate total paid
      const totalPaid = transactionEntity.amountPaid;

      // Validate payment is sufficient
      if (totalPaid < transaction.total) {
        throw new BadRequestException(
          `Cannot complete transaction: insufficient payment. Required: ${transaction.total}, Paid: ${totalPaid}`,
        );
      }

      const previousStatus = transaction.status;

      // Update transaction status
      transactionEntity.status = TransactionStatus.COMPLETED;
      transactionEntity.completedAt = new Date();
      transactionEntity.updatedAt = new Date();

      await queryRunner.manager.save(transactionEntity);

      // Create domain events
      const events = [
        new TransactionStatusChangedEvent(
          command.transactionId,
          previousStatus,
          TransactionStatus.COMPLETED,
          command.completedBy,
        ),
        new TransactionPaymentCompletedEvent(
          command.transactionId,
          transaction.paymentMethod || 'UNKNOWN',
          totalPaid,
          command.completedBy,
        ),
      ];

      // Save to event store
      await this.eventStore.saveMultiple(
        events,
        command.transactionId,
        'Transaction',
      );

      // Publish events
      for (const event of events) {
        this.eventBus.publish(event);
      }

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
        `Transaction ${command.transactionId} completed successfully`,
      );
      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to complete transaction ${command.transactionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
