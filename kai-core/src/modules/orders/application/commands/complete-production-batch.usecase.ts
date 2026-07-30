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
import { ProductionUnitCostingService } from '@modules/production-units/application/production-unit-costing.service';
import {
  readProductionOrderMetadata,
  type ProductionOrderLotSnapshot,
} from '../production-order.metadata';

export class CompleteProductionBatchCommand {
  constructor(public readonly productionBatchId: string) {}
}

function resolvePmp(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type OutputLot = {
  productVariantId: string;
  quantity: number;
  productName: string;
  materialsCost: number;
  laborCost: number;
  lineCost: number;
  unitCost: number;
  recipeId: string;
  recipeVersion: number;
};

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
    private readonly costingService: ProductionUnitCostingService,
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

    const companyId = batch.companyId?.trim();
    if (!companyId) {
      throw new BadRequestException('PRODUCTION_BATCH sin companyId');
    }

    const lines = await this.txLineRepo.find({
      where: { transactionId: batch.id },
      order: { lineNumber: 'ASC', createdAt: 'ASC' },
    });
    if (lines.length === 0) {
      throw new BadRequestException('PRODUCTION_BATCH must include at least one output line');
    }

    const inputStorageId = batch.storageId;
    if (!inputStorageId) {
      throw new BadRequestException(
        'PRODUCTION_BATCH must have storageId (almacén de insumos)',
      );
    }
    const links = (batch.metadata?.links ?? {}) as Record<string, unknown>;
    const outputStorageId =
      (typeof links.outputStorageId === 'string' && links.outputStorageId.trim()) ||
      inputStorageId;

    const existingOrder = readProductionOrderMetadata(
      batch.metadata as Record<string, unknown> | undefined,
    );
    const productionUnitId =
      existingOrder?.productionUnitId ||
      (typeof links.productionUnitId === 'string' ? links.productionUnitId : '');
    const laborSummary = productionUnitId
      ? await this.costingService.summarizeLaborCost(productionUnitId, companyId)
      : null;
    const laborPerPieceByVariant = new Map<string, number>();

    const consumptionByInput = new Map<
      string,
      { qty: number; pmp: number; lineCost: number }
    >();
    const outputLots: OutputLot[] = [];
    const missingPmp: string[] = [];
    const recipeCache = new Map<string, Awaited<ReturnType<RecipesService['list']>>[number]>();

    for (const line of lines) {
      const outputVariantId = line.productVariantId?.trim();
      const outputQty = Number(line.quantity ?? 0) || 0;
      if (!outputVariantId || outputQty <= 0) {
        throw new BadRequestException(
          'Cada línea de PRODUCTION_BATCH debe tener productVariantId y quantity > 0',
        );
      }

      if (!laborPerPieceByVariant.has(outputVariantId)) {
        if (!productionUnitId) {
          laborPerPieceByVariant.set(outputVariantId, 0);
        } else {
          const resolved = await this.costingService.resolveLaborPerPiece({
            productionUnitId,
            variantId: outputVariantId,
            companyId,
            unitLabor: laborSummary,
          });
          laborPerPieceByVariant.set(outputVariantId, resolved.laborPerPiece);
        }
      }
      const laborPerPiece = laborPerPieceByVariant.get(outputVariantId) ?? 0;

      let recipe = recipeCache.get(outputVariantId);
      if (!recipe) {
        const recipes = await this.recipesService.list(companyId, outputVariantId);
        recipe = recipes.find((r) => r.isActive && r.type === RecipeType.PRODUCTION);
        if (!recipe) {
          throw new BadRequestException(
            `No active PRODUCTION recipe for outputVariantId ${outputVariantId}`,
          );
        }
        recipeCache.set(outputVariantId, recipe);
      }

      const recipeLines = [...recipe.lines].sort(
        (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
      );
      if (recipeLines.length === 0) {
        throw new BadRequestException(
          `PRODUCTION recipe has no input lines (${outputVariantId})`,
        );
      }

      const inputVariantIds = [...new Set(recipeLines.map((rl) => rl.inputVariantId))];
      const variants = await this.variantRepo.find({
        where: { id: In(inputVariantIds) },
      });
      const variantById = new Map(variants.map((v) => [v.id, v]));

      let lotCost = 0;
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

        const lineCost = Number((qty * pmp).toFixed(6));
        lotCost = Number((lotCost + lineCost).toFixed(6));

        const prev = consumptionByInput.get(rl.inputVariantId);
        if (prev) {
          const nextQty = Number((prev.qty + qty).toFixed(6));
          const nextCost = Number((prev.lineCost + lineCost).toFixed(6));
          consumptionByInput.set(rl.inputVariantId, {
            qty: nextQty,
            pmp,
            lineCost: nextCost,
          });
        } else {
          consumptionByInput.set(rl.inputVariantId, {
            qty,
            pmp,
            lineCost,
          });
        }
      }

      const materialsCost = lotCost;
      const laborCost = Number((laborPerPiece * outputQty).toFixed(6));
      const lineCost = Number((materialsCost + laborCost).toFixed(6));

      outputLots.push({
        productVariantId: outputVariantId,
        quantity: outputQty,
        productName: line.productName || `Output ${outputVariantId}`,
        materialsCost,
        laborCost,
        lineCost,
        unitCost: outputQty > 0 ? Number((lineCost / outputQty).toFixed(6)) : 0,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
      });
    }

    if (missingPmp.length > 0) {
      throw new BadRequestException(
        `No se puede completar: insumos sin PMP (recepcionar con costo). Variantes: ${[
          ...new Set(missingPmp),
        ].join(', ')}`,
      );
    }
    if (consumptionByInput.size === 0) {
      throw new BadRequestException('No hay consumo de insumos calculable para esta producción');
    }

    const allInputIds = [...consumptionByInput.keys()];
    const stockLevels = await this.stockLevelRepo.find({
      where: {
        storageId: inputStorageId,
        productVariantId: In(allInputIds),
      },
    });
    const stockByVariant = new Map(
      stockLevels.map((s) => [s.productVariantId, Number(s.availableStock ?? s.physicalStock ?? 0)]),
    );
    const inputVariants = await this.variantRepo.find({
      where: { id: In(allInputIds) },
    });
    const inputVariantById = new Map(inputVariants.map((v) => [v.id, v]));

    const insufficientStock: string[] = [];
    for (const [inputVariantId, c] of consumptionByInput) {
      const available = stockByVariant.get(inputVariantId) ?? 0;
      if (available + 1e-9 < c.qty) {
        const sku = inputVariantById.get(inputVariantId)?.sku ?? inputVariantId;
        insufficientStock.push(`${sku}: disponible ${available}, requerido ${c.qty}`);
      }
    }
    if (insufficientStock.length > 0) {
      throw new BadRequestException(
        `Stock insuficiente de insumos en el almacén: ${insufficientStock.join('; ')}`,
      );
    }

    const materialsCostTotal = Number(
      [...consumptionByInput.values()]
        .reduce((sum, c) => sum + c.lineCost, 0)
        .toFixed(6),
    );
    const laborCostTotal = Number(
      outputLots.reduce((sum, l) => sum + l.laborCost, 0).toFixed(6),
    );
    const totalCost = Number((materialsCostTotal + laborCostTotal).toFixed(6));
    const totalOutputQty = outputLots.reduce((sum, l) => sum + l.quantity, 0);
    const unitCost =
      totalOutputQty > 0 ? Number((totalCost / totalOutputQty).toFixed(6)) : 0;

    const inputLines: CreateTransactionLineDto[] = [...consumptionByInput.entries()].map(
      ([inputVariantId, c]) => {
        const variant = inputVariantById.get(inputVariantId);
        return {
          productName: variant?.sku ? `Insumo ${variant.sku}` : `Input ${inputVariantId}`,
          productVariantId: inputVariantId,
          quantity: c.qty,
          unitPrice: c.pmp,
          subtotal: c.lineCost,
          total: c.lineCost,
          notes: 'Derived from recipe (production consumption)',
        } as CreateTransactionLineDto;
      },
    );

    const inputsDto = new CreateTransactionDto();
    inputsDto.transactionType = TransactionType.ADJUSTMENT_OUT;
    inputsDto.branchId = batch.branchId as any;
    inputsDto.userId = batch.userId as any;
    inputsDto.storageId = inputStorageId as any;
    inputsDto.subtotal = materialsCostTotal;
    inputsDto.taxAmount = 0;
    inputsDto.discountAmount = 0;
    inputsDto.total = materialsCostTotal;
    inputsDto.lines = inputLines;
    inputsDto.relatedTransactionId = batch.id;
    inputsDto.metadata = {
      origin: 'PRODUCTION_CONSUMPTION',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
      },
    } as any;

    const stockOut = await this.transactionsService.createTransaction(inputsDto);

    const outputLines: CreateTransactionLineDto[] = outputLots.map(
      (lot) =>
        ({
          productName: lot.productName,
          productVariantId: lot.productVariantId,
          quantity: lot.quantity,
          unitPrice: lot.unitCost,
          subtotal: lot.lineCost,
          total: lot.lineCost,
          notes: 'Derived from recipe + labor (production output)',
        }) as CreateTransactionLineDto,
    );

    const outputDto = new CreateTransactionDto();
    outputDto.transactionType = TransactionType.ADJUSTMENT_IN;
    outputDto.branchId = batch.branchId as any;
    outputDto.userId = batch.userId as any;
    outputDto.storageId = outputStorageId as any;
    outputDto.subtotal = totalCost;
    outputDto.taxAmount = 0;
    outputDto.discountAmount = 0;
    outputDto.total = totalCost;
    outputDto.lines = outputLines;
    outputDto.relatedTransactionId = batch.id;
    outputDto.metadata = {
      origin: 'PRODUCTION_OUTPUT',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
        unitCost,
        totalCost,
        materialsCost: materialsCostTotal,
        laborCost: laborCostTotal,
      },
    } as any;

    const stockIn = await this.transactionsService.createTransaction(outputDto);

    const updatedLots: ProductionOrderLotSnapshot[] = (existingOrder?.lots ?? []).map(
      (lot, idx) => {
        const computed = outputLots[idx];
        if (!computed || computed.productVariantId !== lot.productVariantId) {
          return lot;
        }
        return {
          ...lot,
          lineCost: computed.lineCost,
          unitCost: computed.unitCost,
        };
      },
    );
    const lotsForMeta =
      updatedLots.length === outputLots.length
        ? updatedLots
        : outputLots.map((o, i) => ({
            lineKey: `legacy-${i}`,
            productVariantId: o.productVariantId,
            quantity: o.quantity,
            attributes: [],
            lineCost: o.lineCost,
            unitCost: o.unitCost,
          }));

    batch.status = TransactionStatus.COMPLETED;
    batch.completedAt = new Date();
    batch.metadata = {
      ...(batch.metadata ?? {}),
      links: {
        ...(batch.metadata?.links ?? {}),
        outputStorageId,
        unitCost,
        totalCost,
        materialsCost: materialsCostTotal,
        laborCost: laborCostTotal,
      },
      productionOrder: {
        productionUnitId:
          existingOrder?.productionUnitId || productionUnitId || '',
        capacity: existingOrder?.capacity ?? null,
        plannedStartAt: existingOrder?.plannedStartAt ?? null,
        plannedDeliveryAt: existingOrder?.plannedDeliveryAt ?? null,
        lots: lotsForMeta,
      },
    };
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
