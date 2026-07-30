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
import { CreateInventoryReservationsDto } from '../dto/inventory.dto';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';

export class CreateInventoryReservationsCommand {
  constructor(
    public readonly dto: CreateInventoryReservationsDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryReservationsCommand)
export class CreateInventoryReservationsUseCase
  implements ICommandHandler<CreateInventoryReservationsCommand>
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

  async execute(command: CreateInventoryReservationsCommand): Promise<string> {
    const { dto, userId } = command;

    if (!dto.lines?.length) {
      throw new BadRequestException('Se requiere al menos una línea de reserva');
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

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      const documentNumber = `IR${Date.now()}`;
      let companyId: string | undefined;

      const txRepo = manager.getRepository(Transaction);
      const savedTransaction = await txRepo.save(
        txRepo.create({
          companyId: branch.companyId ?? '',
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

      const lines: TransactionLine[] = [];
      for (let i = 0; i < dto.lines.length; i++) {
        const l = dto.lines[i];
        if (!l.variantId?.trim()) {
          throw new BadRequestException(
            `Línea ${i + 1}: variantId es requerido para reservar stock`,
          );
        }

        const product = await this.productRepository.findOne({
          where: { id: l.productId },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${l.productId} not found`,
          );
        }

        const variant = await this.productVariantRepository.findOne({
          where: { id: l.variantId, product: { id: l.productId } },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant with ID ${l.variantId} not found for product ${l.productId}`,
          );
        }

        const qty = Number(l.quantity) || 0;
        if (qty <= 0) {
          throw new BadRequestException(
            `Línea ${i + 1}: cantidad debe ser mayor que cero`,
          );
        }

        const lineCompanyId =
          variant.companyId || branch.companyId || product.companyId;
        if (!lineCompanyId) {
          throw new BadRequestException(
            `Línea ${i + 1}: no se pudo determinar companyId`,
          );
        }
        companyId = lineCompanyId;

        const line = manager.getRepository(TransactionLine).create({
          transactionId: savedTransaction.id,
          productId: l.productId,
          productVariantId: l.variantId,
          productName: product.name,
          variantName: variant.sku ?? undefined,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          notes: dto.orderReference ? `Reserved for ${dto.orderReference}` : 'Reserved',
          lineNumber: i + 1,
        } as Partial<TransactionLine>);
        await manager.getRepository(TransactionLine).save(line);
        lines.push(line as TransactionLine);

        await this.stockCommitment.reserve(manager, {
          companyId: lineCompanyId,
          variantId: l.variantId,
          storageId: dto.storageId,
          qty,
          lastTransactionId: savedTransaction.id,
        });
      }

      if (companyId) {
        await manager.getRepository(Transaction).update(savedTransaction.id, {
          companyId,
        });
      }

      for (const tl of lines) {
        this.eventBus.publish(
          new InventoryReservationCreatedEvent(
            savedTransaction.id,
            tl.productId as string,
            tl.productVariantId as string,
            Number(tl.quantity ?? 0),
            dto.customerId,
            dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          ),
        );
      }

      return savedTransaction.id;
    });
  }
}
