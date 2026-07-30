import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { AdjustStockCommand, AdjustStockCommandResult } from '../../commands/adjust-stock.command';

@Injectable()
@CommandHandler(AdjustStockCommand)
export class AdjustStockCommandHandler implements ICommandHandler<AdjustStockCommand> {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
  ) {}

  async execute(command: AdjustStockCommand): Promise<AdjustStockCommandResult> {
    const { productVariantId, storageId, adjustment } = command;

    let stockLevel = await this.stockLevelRepository.findOne({
      where: { productVariantId, storageId },
    });

    if (!stockLevel) {
      stockLevel = this.stockLevelRepository.create({
        productVariantId,
        storageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
      });
    }

    stockLevel.physicalStock += adjustment;
    stockLevel.availableStock = stockLevel.physicalStock - stockLevel.committedStock;

    await this.stockLevelRepository.save(stockLevel);

    return {
      success: true,
      stockLevel: {
        id: stockLevel.id,
        physicalStock: stockLevel.physicalStock,
        availableStock: stockLevel.availableStock,
      },
    };
  }
}