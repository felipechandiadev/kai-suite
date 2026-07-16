import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';
import { TransactionLine } from '../../../transaction-lines/domain/transaction-line.entity';
import { EventBus } from '@nestjs/cqrs';
import { InventoryCountCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryCountDto } from '../dto/inventory.dto';

export class CreateInventoryCountCommand {
  constructor(
    public readonly dto: CreateInventoryCountDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryCountCommand)
export class CreateInventoryCountUseCase implements ICommandHandler<CreateInventoryCountCommand> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateInventoryCountCommand): Promise<string> {
    const { dto, userId } = command;

    // Generate document number
    const documentNumber = `IC${Date.now()}`;

    // Create inventory count transaction
    const transaction = this.transactionRepository.create({
      documentNumber,
      transactionType: TransactionType.INVENTORY_COUNT,
      status: TransactionStatus.COMPLETED,
      branchId: dto.branchId,
      storageId: dto.storageId,
      userId: userId,
      total: 0,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Create transaction lines
    for (const line of dto.lines) {
      const transactionLine = this.transactionLineRepository.create({
        transactionId: savedTransaction.id,
        productId: line.productId,
        productName: 'Counted Product',
        quantity: line.physicalCount,
        unitPrice: 0,
        total: 0,
        notes: `Count: ${line.physicalCount}`,
      });
      await this.transactionLineRepository.save(transactionLine);
    }

    // Publish domain event
    this.eventBus.publish(
      new InventoryCountCreatedEvent(
        savedTransaction.id,
        dto.branchId,
        dto.storageId,
        dto.lines.length,
        0,
      ),
    );

    return savedTransaction.id;
  }
}
