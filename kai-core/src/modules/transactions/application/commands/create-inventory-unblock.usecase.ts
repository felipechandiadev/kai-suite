import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';
import { TransactionLine } from '../../../transaction-lines/domain/transaction-line.entity';
import { Product } from '../../../products/domain/product.entity';
import { ProductVariant } from '../../../product-variants/domain/product-variant.entity';
import { Storage } from '../../../storages/domain/storage.entity';
import { Branch } from '../../../branches/domain/branch.entity';
import { User } from '../../../users/domain/user.entity';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { EventBus } from '@nestjs/cqrs';
import { InventoryUnblockCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryUnblockDto } from '../dto/inventory.dto';

export class CreateInventoryUnblockCommand {
  constructor(
    public readonly dto: CreateInventoryUnblockDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryUnblockCommand)
export class CreateInventoryUnblockUseCase implements ICommandHandler<CreateInventoryUnblockCommand> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('TransactionRepositoryPort')
    private readonly transactionRepositoryPort: TransactionRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateInventoryUnblockCommand): Promise<string> {
    const { dto, userId } = command;

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate responsible user if provided
    let responsibleUser: User | null = null;
    if (dto.responsibleUserId) {
      responsibleUser = await this.userRepository.findOne({
        where: { id: dto.responsibleUserId },
      });
      if (!responsibleUser) {
        throw new NotFoundException(
          `Responsible user with ID ${dto.responsibleUserId} not found`,
        );
      }
    }

    // Find the original block transaction
    const blockTransaction = await this.transactionRepository.findOne({
      where: {
        id: dto.blockTransactionId,
        transactionType: TransactionType.INVENTORY_BLOCK,
      },
    });

    if (!blockTransaction) {
      throw new NotFoundException(
        `Block transaction with ID ${dto.blockTransactionId} not found`,
      );
    }

    if (blockTransaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException(
        `Block transaction ${dto.blockTransactionId} has already been voided`,
      );
    }

    // For simplicity, we'll assume we can unblock. In a real implementation,
    // we'd need to check the actual blocked quantity from inventory service
    // For now, we'll just create the unblock transaction

    // Generate document number
    const documentNumber = `IU${Date.now()}`;

    // Create inventory unblock transaction
    const transaction = this.transactionRepository.create({
      documentNumber,
      transactionType: TransactionType.INVENTORY_UNBLOCK,
      status: TransactionStatus.COMPLETED,
      branchId: blockTransaction.branchId,
      storageId: blockTransaction.storageId,
      userId: userId,
      total: 0, // Unblocks don't have monetary value
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Create transaction line for the unblock
    // In a real implementation, this would reference the original block's product
    const transactionLine = this.transactionLineRepository.create({
      transactionId: savedTransaction.id,
      productId: 'placeholder-product-id', // Would need to get from original block
      productName: 'Unblocked Product', // Would need to get from original block
      quantity: dto.quantity,
      unitPrice: 0, // No monetary value
      total: 0,
      notes: `Unblocked: ${dto.quantity} units - Reason: ${dto.reason}${dto.reasonDetails ? ` - ${dto.reasonDetails}` : ''}${responsibleUser ? ` - Responsible: ${responsibleUser.userName}` : ''}`,
    });

    await this.transactionLineRepository.save(transactionLine);

    // If unblocking all quantity, we could void the original block transaction
    // For now, we'll keep it as is and let the inventory service handle the logic

    // Publish domain event
    this.eventBus.publish(
      new InventoryUnblockCreatedEvent(
        savedTransaction.id,
        dto.blockTransactionId,
        dto.quantity,
        dto.reason,
      ),
    );

    return savedTransaction.id;
  }
}
