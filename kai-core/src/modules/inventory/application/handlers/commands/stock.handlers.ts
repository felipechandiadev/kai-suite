import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import {
  CreateAdjustmentCommand,
  CreateTransferCommand,
  RecalculateValuationCommand,
} from '@modules/inventory/application/commands/stock.commands';
import {
  STOCK_LEVELS_REPOSITORY,
  StockLevelsRepositoryPort,
} from '@modules/inventory/application/ports/stock-levels.repository.port';
import {
  StockAdjustedEvent,
  StockTransferredEvent,
  PMPRecalculatedEvent,
} from '@modules/inventory/domain/events/stock-adjusted.event';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { Repository } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { StockLevelOrmEntity } from '@modules/stock-levels/infrastructure/orm-mappers/stock-level.orm-entity';
import { StorageOrmEntity } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';

@CommandHandler(CreateAdjustmentCommand)
export class CreateAdjustmentCommandHandler implements ICommandHandler<CreateAdjustmentCommand> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
    private readonly transactionsService: TransactionsService,
    private readonly eventBus: EventBus,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(
    command: CreateAdjustmentCommand,
  ): Promise<{ success: boolean; message: string; documentNumbers: string[] }> {
    const { variantId, storageId, currentQuantity, targetQuantity, note } =
      command.adjustmentData;
    const diff = targetQuantity - currentQuantity;

    // Find the stock level to get branch info
    const stockLevel = await this.stockRepository.findByVariantAndStorage(
      variantId,
      storageId,
    );
    if (!stockLevel) {
      throw new NotFoundException(
        `Stock no encontrado para variante ${variantId} en almacén ${storageId}`,
      );
    }

    const storageEntity = await this.dataSource
      .getRepository(StorageOrmEntity)
      .findOne({
        where: { id: storageId },
        select: ['id', 'branchId'],
      });
    if (!storageEntity) {
      throw new NotFoundException(`Almacén ${storageId} no encontrado`);
    }
    let branchId: string | undefined =
      storageEntity.branchId && String(storageEntity.branchId).length > 0
        ? storageEntity.branchId
        : undefined;

    if (!branchId) {
      const fallbackBranches = await this.dataSource
        .getRepository(BranchOrmEntity)
        .find({
          where: { deletedAt: IsNull() },
          order: { createdAt: 'ASC' },
          take: 1,
        });
      branchId = fallbackBranches[0]?.id;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal del ajuste: el almacén no tiene sucursal y no hay sucursales en el sistema.',
      );
    }

    // Get fallback user
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id;
    if (!userId) {
      throw new BadRequestException(
        'No hay usuario activo para registrar el ajuste. Cree o active al menos un usuario en el sistema.',
      );
    }

    // Create transaction
    const txDto = new CreateTransactionDto();
    txDto.transactionType =
      diff >= 0
        ? TransactionType.ADJUSTMENT_IN
        : TransactionType.ADJUSTMENT_OUT;
    txDto.branchId = branchId || '';
    txDto.userId = userId;
    txDto.storageId = storageId;
    txDto.subtotal = Math.abs(diff);
    txDto.total = Math.abs(diff);
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = Math.abs(diff);
    txDto.notes = note || undefined;

    const tx = await this.transactionsService.createTransaction(txDto);

    // Emit event
    const event = new StockAdjustedEvent(
      variantId,
      storageId,
      currentQuantity,
      targetQuantity,
      diff,
      diff >= 0 ? 'IN' : 'OUT',
      note,
    );
    this.eventBus.publish(event);

    return {
      success: true,
      message: `Stock ajustado en ${diff}`,
      documentNumbers: [tx.documentNumber],
    };
  }
}

@CommandHandler(CreateTransferCommand)
export class CreateTransferCommandHandler implements ICommandHandler<CreateTransferCommand> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
    private readonly transactionsService: TransactionsService,
    private readonly eventBus: EventBus,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(
    command: CreateTransferCommand,
  ): Promise<{ success: boolean; message: string; documentNumbers: string[] }> {
    const { variantId, sourceStorageId, targetStorageId, quantity, note } =
      command.transferData;

    // Validate source stock exists and has sufficient quantity
    const sourceStock = await this.stockRepository.findByVariantAndStorage(
      variantId,
      sourceStorageId,
    );
    if (!sourceStock) {
      throw new NotFoundException(`Stock no encontrado en almacén origen`);
    }
    if (sourceStock.physicalStock < quantity) {
      throw new BadRequestException(
        `Stock insuficiente en almacén origen: ${sourceStock.physicalStock}`,
      );
    }

    // Determine branch ID (try source first, then target)
    let branchId: string | undefined;
    const rawSource = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoin('sl.storage', 's')
      .where('sl.storageId = :sid', { sid: sourceStorageId })
      .select('s.branchId', 'branchId')
      .getRawOne();
    branchId = rawSource?.branchId || undefined;
    if (branchId === '') branchId = undefined;

    if (!branchId) {
      const rawTarget = await this.dataSource
        .getRepository(StockLevelOrmEntity)
        .createQueryBuilder('sl')
        .leftJoin('sl.storage', 's')
        .where('sl.storageId = :tid', { tid: targetStorageId })
        .select('s.branchId', 'branchId')
        .getRawOne();
      branchId = rawTarget?.branchId || undefined;
      if (branchId === '') branchId = undefined;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal, asociada a los almacenes involucrados.',
      );
    }

    // Get fallback user
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id || '';

    // Create TRANSFER_OUT transaction
    const txOut = new CreateTransactionDto();
    txOut.transactionType = TransactionType.TRANSFER_OUT;
    txOut.branchId = branchId || '';
    txOut.userId = userId;
    txOut.storageId = sourceStorageId;
    txOut.targetStorageId = targetStorageId;
    txOut.subtotal = quantity;
    txOut.total = quantity;
    txOut.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txOut.amountPaid = quantity;
    txOut.notes = note || undefined;

    const out = await this.transactionsService.createTransaction(txOut);

    // Create TRANSFER_IN transaction
    const txIn = new CreateTransactionDto();
    txIn.transactionType = TransactionType.TRANSFER_IN;
    txIn.branchId = branchId || '';
    txIn.userId = userId;
    txIn.storageId = targetStorageId;
    txIn.targetStorageId = sourceStorageId;
    txIn.subtotal = quantity;
    txIn.total = quantity;
    txIn.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txIn.amountPaid = quantity;
    txIn.notes = note || undefined;

    const inn = await this.transactionsService.createTransaction(txIn);

    // Emit event
    const event = new StockTransferredEvent(
      variantId,
      sourceStorageId,
      targetStorageId,
      quantity,
      [out.documentNumber, inn.documentNumber],
    );
    this.eventBus.publish(event);

    return {
      success: true,
      message: 'Transferencia registrada',
      documentNumbers: [out.documentNumber, inn.documentNumber],
    };
  }
}

@CommandHandler(RecalculateValuationCommand)
export class RecalculateValuationCommandHandler implements ICommandHandler<RecalculateValuationCommand> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: RecalculateValuationCommand,
  ): Promise<{ success: boolean; message: string }> {
    // This is a simplified implementation. Full PMP calculation happens in the inventory stock action handler.
    // For now, we emit an event to signal that valuation should be recalculated.
    const event = new PMPRecalculatedEvent(
      command.data.variantId || 'all',
      command.data.storageId || 'all',
      0, // previous PMP would come from DB
      0, // new PMP would come from calculation
    );
    this.eventBus.publish(event);

    return {
      success: true,
      message: 'Valoración planificada para recálculo',
    };
  }
}
