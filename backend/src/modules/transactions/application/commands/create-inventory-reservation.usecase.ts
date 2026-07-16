import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { Customer } from '../../../customers/domain/customer.entity';
import { InventoryReservationCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryReservationDto } from '../dto/inventory.dto';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';

export class CreateInventoryReservationCommand {
  constructor(
    public readonly dto: CreateInventoryReservationDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryReservationCommand)
export class CreateInventoryReservationUseCase
  implements ICommandHandler<CreateInventoryReservationCommand>
{
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
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly stockCommitment: StockCommitmentService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateInventoryReservationCommand): Promise<string> {
    const { dto, userId } = command;

    if (!dto.variantId?.trim()) {
      throw new BadRequestException(
        'variantId es requerido para reservar stock en almacén',
      );
    }

    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    const storage = await this.storageRepository.findOne({
      where: { id: dto.storageId, branch: { id: dto.branchId } },
    });
    if (!storage) {
      throw new NotFoundException(
        `Storage with ID ${dto.storageId} not found in branch ${dto.branchId}`,
      );
    }

    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const variant = await this.productVariantRepository.findOne({
      where: { id: dto.variantId, product: { id: dto.productId } },
    });
    if (!variant) {
      throw new NotFoundException(
        `Variant with ID ${dto.variantId} not found for product ${dto.productId}`,
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const companyId =
      variant.companyId || branch.companyId || product.companyId;
    if (!companyId) {
      throw new BadRequestException(
        'No se pudo determinar companyId para la reserva',
      );
    }

    const qty = Number(dto.quantity) || 0;
    if (qty <= 0) {
      throw new BadRequestException('La cantidad reservada debe ser mayor que cero');
    }

    return this.dataSource.transaction(async (manager) => {
      const documentNumber = `IR${Date.now()}`;

      const txRepo = manager.getRepository(Transaction);
      const savedTransaction = await txRepo.save(
        txRepo.create({
          companyId,
          documentNumber,
          transactionType: TransactionType.INVENTORY_RESERVATION,
          status: TransactionStatus.COMPLETED,
          branchId: dto.branchId,
          storageId: dto.storageId,
          customerId: dto.customerId,
          userId,
          total: 0,
          relatedTransactionId: dto.relatedTransactionId ?? undefined,
          externalReference: dto.orderReference || null,
          notes: dto.notes || null,
          metadata: {
            expiresAt: dto.expiresAt ?? null,
          },
        } as Partial<Transaction>),
      );

      await manager.getRepository(TransactionLine).save(
        manager.getRepository(TransactionLine).create({
          transactionId: savedTransaction.id,
          productId: dto.productId,
          productVariantId: dto.variantId,
          productName: product.name,
          variantName: variant.sku ?? undefined,
          quantity: qty,
          unitPrice: 0,
          total: 0,
          notes: `Reserved for customer ${(customer as { person?: { firstName?: string; lastName?: string } }).person?.firstName || 'Unknown'} ${(customer as { person?: { lastName?: string } }).person?.lastName || ''}${dto.expiresAt ? ` - Expires: ${dto.expiresAt}` : ''}${dto.notes ? ` - ${dto.notes}` : ''}`,
        }),
      );

      await this.stockCommitment.reserve(manager, {
        companyId,
        variantId: dto.variantId!,
        storageId: dto.storageId,
        qty,
        lastTransactionId: savedTransaction.id,
      });

      this.eventBus.publish(
        new InventoryReservationCreatedEvent(
          savedTransaction.id,
          dto.productId,
          dto.variantId,
          qty,
          dto.customerId,
          dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        ),
      );

      return savedTransaction.id;
    });
  }
}
