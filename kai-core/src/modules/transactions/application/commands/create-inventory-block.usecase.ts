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
import { InventoryBlockCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryBlockDto } from '../dto/inventory.dto';

export class CreateInventoryBlockCommand {
  constructor(
    public readonly dto: CreateInventoryBlockDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryBlockCommand)
export class CreateInventoryBlockUseCase implements ICommandHandler<CreateInventoryBlockCommand> {
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

  async execute(command: CreateInventoryBlockCommand): Promise<string> {
    const { dto, userId } = command;

    // Validate branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    // Validate storage exists and belongs to branch
    const storage = await this.storageRepository.findOne({
      where: { id: dto.storageId, branch: { id: dto.branchId } },
    });
    if (!storage) {
      throw new NotFoundException(
        `Storage with ID ${dto.storageId} not found in branch ${dto.branchId}`,
      );
    }

    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Validate variant if provided
    let variant: any = null;
    if (dto.variantId) {
      variant = await this.productVariantRepository.findOne({
        where: { id: dto.variantId, product: { id: dto.productId } },
      });
      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${dto.variantId} not found for product ${dto.productId}`,
        );
      }
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

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check available stock (this would need integration with inventory service)
    // For now, we'll assume the block is valid

    // Generate document number
    const documentNumber = `IB${Date.now()}`;

    // Create inventory block transaction
    const transaction = this.transactionRepository.create({
      documentNumber,
      transactionType: TransactionType.INVENTORY_BLOCK,
      status: TransactionStatus.COMPLETED,
      branchId: dto.branchId,
      storageId: dto.storageId,
      userId: userId,
      total: 0, // Blocks don't have monetary value
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Create transaction line for the block
    const transactionLine = this.transactionLineRepository.create({
      transactionId: savedTransaction.id,
      productId: dto.productId,
      productVariantId: dto.variantId,
      productName: product.name,
      variantName: variant?.name,
      quantity: dto.quantity,
      unitPrice: 0, // No monetary value
      total: 0,
      notes: `Blocked: ${dto.quantity} units - Reason: ${dto.reason}${dto.reasonDetails ? ` - ${dto.reasonDetails}` : ''}${responsibleUser ? ` - Responsible: ${responsibleUser.userName}` : ''}`,
    });

    await this.transactionLineRepository.save(transactionLine);

    // Publish domain event
    this.eventBus.publish(
      new InventoryBlockCreatedEvent(
        savedTransaction.id,
        dto.productId,
        dto.variantId,
        dto.quantity,
        dto.reason,
        dto.storageId,
      ),
    );

    return savedTransaction.id;
  }
}
