import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { recipeInputQuantityForOutput } from '@modules/recipes/application/recipe-consumption.util';

export class CompleteProductionBatchCommand {
  constructor(public readonly productionBatchId: string) {}
}

function resolvePmp(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

@Injectable()
@CommandHandler(CompleteProductionBatchCommand)
export class CompleteProductionBatchUseCase
  implements ICommandHandler<CompleteProductionBatchCommand>
{
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly txLineRepo: Repository<TransactionLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    private readonly recipesService: RecipesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async execute(command: CompleteProductionBatchCommand): Promise<{
    productionBatchId: string;
    stockOutInputsTransactionId?: string | null;
    stockInOutputTransactionId?: string | null;
    unitCost?: number;
    totalCost?: number;
  }> {
    const batch = await this.txRepo.findOne({ where: { id: command.productionBatchId } });
    if (!batch) throw new NotFoundException('Production batch not found');
    if (batch.transactionType !== TransactionType.PRODUCTION_BATCH) {
      throw new BadRequestException('Transaction is not PRODUCTION_BATCH');
    }
    if (batch.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('La producción ya está completada');
    }
    if (batch.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException('No se puede completar una producción cancelada');
    }

    const lines = await this.txLineRepo.find({ where: { transactionId: batch.id } });
    if (lines.length === 0) {
      throw new BadRequestException('PRODUCTION_BATCH must include at least one output line');
    }

    const outputVariantId = lines[0].productVariantId;
    const outputQty = Number(lines[0].quantity ?? 0) || 0;
    if (!outputVariantId || outputQty <= 0) {
      throw new BadRequestException(
        'PRODUCTION_BATCH first line must have productVariantId and quantity > 0',
      );
    }

    const storageId = batch.storageId;
    if (!storageId) {
      throw new BadRequestException(
        'PRODUCTION_BATCH must have storageId (almacén de insumos/salida)',
      );
    }

    const recipes = await this.recipesService.list(outputVariantId);
    const recipe = recipes.find((r) => r.isActive && r.type === RecipeType.PRODUCTION);
    if (!recipe) {
      throw new BadRequestException('No active PRODUCTION recipe for outputVariantId');
    }

    const recipeLines = [...recipe.lines].sort(
      (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
    );
    if (recipeLines.length === 0) {
      throw new BadRequestException('PRODUCTION recipe has no input lines');
    }

    const inputVariantIds = [...new Set(recipeLines.map((rl) => rl.inputVariantId))];
    const variants = await this.variantRepo.find({
      where: { id: In(inputVariantIds) },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const stockLevels = await this.stockLevelRepo.find({
      where: {
        storageId,
        productVariantId: In(inputVariantIds),
      },
    });
    const stockByVariant = new Map(
      stockLevels.map((s) => [s.productVariantId, Number(s.availableStock ?? s.physicalStock ?? 0)]),
    );

    const consumption: Array<{
      inputVariantId: string;
      qty: number;
      pmp: number;
      lineCost: number;
    }> = [];

    const missingPmp: string[] = [];
    const insufficientStock: string[] = [];

    for (const rl of recipeLines) {
      const qty = recipeInputQuantityForOutput(
        Number(rl.qtyPerOutputUnit ?? 0),
        Number(rl.wasteFactor ?? 0),
        outputQty,
      );
      if (qty <= 0) continue;

      const variant = variantById.get(rl.inputVariantId);
      const pmp = resolvePmp(variant?.pmp);
      if (pmp == null) {
        missingPmp.push(variant?.sku ?? rl.inputVariantId);
        continue;
      }

      const available = stockByVariant.get(rl.inputVariantId) ?? 0;
      if (available + 1e-9 < qty) {
        insufficientStock.push(
          `${variant?.sku ?? rl.inputVariantId}: disponible ${available}, requerido ${qty}`,
        );
      }

      consumption.push({
        inputVariantId: rl.inputVariantId,
        qty,
        pmp,
        lineCost: Number((qty * pmp).toFixed(6)),
      });
    }

    if (missingPmp.length > 0) {
      throw new BadRequestException(
        `No se puede completar: insumos sin PMP (recepcionar con costo). Variantes: ${missingPmp.join(', ')}`,
      );
    }
    if (insufficientStock.length > 0) {
      throw new BadRequestException(
        `Stock insuficiente de insumos en el almacén: ${insufficientStock.join('; ')}`,
      );
    }
    if (consumption.length === 0) {
      throw new BadRequestException('No hay consumo de insumos calculable para esta producción');
    }

    const totalCost = Number(
      consumption.reduce((sum, c) => sum + c.lineCost, 0).toFixed(6),
    );
    const unitCost = Number((totalCost / outputQty).toFixed(6));

    const inputLines: CreateTransactionLineDto[] = consumption.map((c) => {
      const variant = variantById.get(c.inputVariantId);
      return {
        productName: variant?.sku ? `Insumo ${variant.sku}` : `Input ${c.inputVariantId}`,
        productVariantId: c.inputVariantId,
        quantity: c.qty,
        unitPrice: c.pmp,
        subtotal: c.lineCost,
        total: c.lineCost,
        notes: 'Derived from recipe (production consumption)',
      } as CreateTransactionLineDto;
    });

    const inputsDto = new CreateTransactionDto();
    inputsDto.transactionType = TransactionType.ADJUSTMENT_OUT;
    inputsDto.branchId = batch.branchId as any;
    inputsDto.userId = batch.userId as any;
    inputsDto.storageId = batch.storageId as any;
    inputsDto.subtotal = totalCost;
    inputsDto.taxAmount = 0;
    inputsDto.discountAmount = 0;
    inputsDto.total = totalCost;
    inputsDto.lines = inputLines;
    inputsDto.relatedTransactionId = batch.id;
    inputsDto.metadata = {
      origin: 'PRODUCTION_CONSUMPTION',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
      },
    } as any;

    const stockOut = await this.transactionsService.createTransaction(inputsDto);

    const outLine: CreateTransactionLineDto = {
      productName: lines[0].productName || `Output ${outputVariantId}`,
      productVariantId: outputVariantId,
      quantity: outputQty,
      unitPrice: unitCost,
      subtotal: totalCost,
      total: totalCost,
      notes: 'Derived from recipe (production output)',
    } as CreateTransactionLineDto;

    const outputDto = new CreateTransactionDto();
    outputDto.transactionType = TransactionType.ADJUSTMENT_IN;
    outputDto.branchId = batch.branchId as any;
    outputDto.userId = batch.userId as any;
    outputDto.storageId = batch.storageId as any;
    outputDto.subtotal = totalCost;
    outputDto.taxAmount = 0;
    outputDto.discountAmount = 0;
    outputDto.total = totalCost;
    outputDto.lines = [outLine];
    outputDto.relatedTransactionId = batch.id;
    outputDto.metadata = {
      origin: 'PRODUCTION_OUTPUT',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
        unitCost,
        totalCost,
      },
    } as any;

    const stockIn = await this.transactionsService.createTransaction(outputDto);

    batch.status = TransactionStatus.COMPLETED;
    await this.txRepo.save(batch);

    return {
      productionBatchId: batch.id,
      stockOutInputsTransactionId: stockOut.id,
      stockInOutputTransactionId: stockIn.id,
      unitCost,
      totalCost,
    };
  }
}
