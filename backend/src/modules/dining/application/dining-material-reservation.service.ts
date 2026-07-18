import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { recipeInputQuantityForOutput } from '@modules/recipes/application/recipe-consumption.util';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { ProductType } from '@modules/products/domain/product.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { DiningOrder } from '../domain/dining-order.entity';
import { DiningOrderLine } from '../domain/dining-order-line.entity';

type MaterialNeed = {
  inputVariantId: string;
  productId: string;
  productName: string;
  sku: string | null;
  qty: number;
};

@Injectable()
export class DiningMaterialReservationService {
  private readonly logger = new Logger(DiningMaterialReservationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly stockCommitment: StockCommitmentService,
    private readonly recipesService: RecipesService,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepo: Repository<ProductionUnit>,
    @InjectRepository(DiningOrderLine)
    private readonly diningOrderLineRepo: Repository<DiningOrderLine>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Reserva insumos BOM al fire (1 INVENTORY_RESERVATION por línea dining).
   * No bloquea el fire operativo si falta UP/receta/storage.
   */
  async reserveForFiredLines(
    order: DiningOrder,
    lines: DiningOrderLine[],
    userId: string,
  ): Promise<void> {
    for (const line of lines) {
      if (line.materialReservationTransactionId) {
        continue;
      }
      try {
        const txId = await this.reserveOneLine(order, line, userId);
        if (txId) {
          line.materialReservationTransactionId = txId;
          line.materialsReservedAt = new Date();
          await this.diningOrderLineRepo.save(line);
        }
      } catch (err) {
        this.logger.warn(
          `Reserva CTP omitida línea ${line.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  async releaseForLine(line: DiningOrderLine): Promise<void> {
    const txId = line.materialReservationTransactionId?.trim();
    if (!txId) {
      return;
    }
    await this.releaseReservationTransaction(txId);
    line.materialReservationTransactionId = null;
    line.materialsReservedAt = null;
    await this.diningOrderLineRepo.save(line);
  }

  /**
   * Libera todas las reservas de líneas cobradas (antes del backflush físico).
   */
  async releaseForOrderLines(lines: DiningOrderLine[]): Promise<void> {
    for (const line of lines) {
      if (!line.materialReservationTransactionId) continue;
      try {
        await this.releaseForLine(line);
      } catch (err) {
        this.logger.warn(
          `Release CTP falló línea ${line.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  /**
   * Agrupa necesidades de backflush por storage de la UP.
   */
  async resolveBackflushGroups(
    companyId: string,
    lines: DiningOrderLine[],
  ): Promise<
    Array<{
      storageId: string;
      adjLines: Array<{
        productVariantId: string;
        productName: string;
        quantity: number;
      }>;
      recipeLinks: Array<{
        variantId: string;
        recipeId: string;
        recipeVersion: number;
        qty: number;
      }>;
    }>
  > {
    const byStorage = new Map<
      string,
      {
        storageId: string;
        adjLines: Array<{
          productVariantId: string;
          productName: string;
          quantity: number;
        }>;
        recipeLinks: Array<{
          variantId: string;
          recipeId: string;
          recipeVersion: number;
          qty: number;
        }>;
      }
    >();

    for (const line of lines) {
      const needs = await this.computeMaterialNeeds(companyId, line);
      if (!needs) continue;
      const { storageId, materials, recipeId, recipeVersion, outputQty } = needs;
      let group = byStorage.get(storageId);
      if (!group) {
        group = { storageId, adjLines: [], recipeLinks: [] };
        byStorage.set(storageId, group);
      }
      for (const m of materials) {
        group.adjLines.push({
          productVariantId: m.inputVariantId,
          productName: m.productName,
          quantity: m.qty,
        });
      }
      group.recipeLinks.push({
        variantId: line.productVariantId,
        recipeId,
        recipeVersion,
        qty: outputQty,
      });
    }

    return [...byStorage.values()];
  }

  private async reserveOneLine(
    order: DiningOrder,
    line: DiningOrderLine,
    userId: string,
  ): Promise<string | null> {
    const needs = await this.computeMaterialNeeds(order.companyId, line);
    if (!needs || needs.materials.length === 0) {
      return null;
    }

    const { storageId, materials, recipeId } = needs;

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const savedTx = await txRepo.save(
        txRepo.create({
          companyId: order.companyId,
          documentNumber: `DKF${Date.now()}${line.id.slice(0, 6)}`,
          transactionType: TransactionType.INVENTORY_RESERVATION,
          status: TransactionStatus.COMPLETED,
          branchId: order.branchId,
          storageId,
          userId,
          total: 0,
          notes: `Dining kitchen fire ${order.id}`,
          metadata: {
            origin: 'DINING_KITCHEN_FIRE',
            diningOrderId: order.id,
            diningOrderLineId: line.id,
            productionUnitId: line.productionUnitId,
            recipeId,
          },
        } as Partial<Transaction>),
      );

      const lineRepo = manager.getRepository(TransactionLine);
      for (const m of materials) {
        await lineRepo.save(
          lineRepo.create({
            transactionId: savedTx.id,
            productId: m.productId,
            productVariantId: m.inputVariantId,
            productName: m.productName,
            variantName: m.sku ?? undefined,
            quantity: m.qty,
            unitPrice: 0,
            total: 0,
            notes: 'Dining material reserve',
          }),
        );
        await this.stockCommitment.reserve(manager, {
          companyId: order.companyId,
          variantId: m.inputVariantId,
          storageId,
          qty: m.qty,
          lastTransactionId: savedTx.id,
        });
      }

      return savedTx.id;
    });
  }

  private async releaseReservationTransaction(transactionId: string): Promise<void> {
    const tx = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });
    if (!tx) {
      this.logger.warn(`Reserva ${transactionId} no encontrada para release`);
      return;
    }
    if (tx.transactionType !== TransactionType.INVENTORY_RESERVATION) {
      return;
    }
    const storageId = tx.storageId;
    if (!storageId) {
      this.logger.warn(`Reserva ${transactionId} sin storageId`);
      return;
    }

    const lines = await this.dataSource.getRepository(TransactionLine).find({
      where: { transactionId },
    });

    await this.dataSource.transaction(async (manager) => {
      for (const tl of lines) {
        const qty = Number(tl.quantity) || 0;
        if (qty <= 0 || !tl.productVariantId) continue;
        await this.stockCommitment.release(manager, {
          companyId: tx.companyId,
          variantId: tl.productVariantId,
          storageId,
          qty,
          lastTransactionId: tx.id,
        });
      }
      const meta =
        tx.metadata && typeof tx.metadata === 'object'
          ? { ...(tx.metadata as Record<string, unknown>) }
          : {};
      meta.releasedAt = new Date().toISOString();
      meta.releasedOrigin = 'DINING_CTP';
      tx.metadata = meta;
      await manager.getRepository(Transaction).save(tx);
    });
  }

  private async computeMaterialNeeds(
    companyId: string,
    line: DiningOrderLine,
  ): Promise<{
    storageId: string;
    materials: MaterialNeed[];
    recipeId: string;
    recipeVersion: number;
    outputQty: number;
  } | null> {
    if (!line.productionUnitId) {
      return null;
    }
    const unit = await this.productionUnitRepo.findOne({
      where: { id: line.productionUnitId, companyId },
    });
    const storageId = unit?.defaultInputStorageId?.trim();
    if (!storageId) {
      return null;
    }

    const variant = await this.variantRepo.findOne({
      where: { id: line.productVariantId, companyId },
      relations: ['product'],
    });
    if (!variant?.product) {
      return null;
    }

    const expectedType =
      variant.product.productType === ProductType.SERVICE
        ? RecipeType.SERVICE
        : RecipeType.PRODUCTION;

    const recipes = await this.recipesService.list(companyId, variant.id);
    const recipe = recipes.find((r) => r.isActive && r.type === expectedType);
    if (!recipe?.lines?.length) {
      return null;
    }

    const outputQty = Number(line.quantity) || 0;
    if (outputQty <= 0) {
      return null;
    }

    const limitingLines = recipe.lines.filter(
      (rl) => rl.limitsProjectedStock !== false,
    );
    if (limitingLines.length === 0) {
      return null;
    }

    const inputIds = [...new Set(limitingLines.map((rl) => rl.inputVariantId))];
    const inputs = await this.variantRepo.find({
      where: inputIds.map((id) => ({ id, companyId })),
      relations: ['product'],
    });
    const inputById = new Map(inputs.map((v) => [v.id, v]));

    const materials: MaterialNeed[] = [];
    for (const rl of limitingLines) {
      const input = inputById.get(rl.inputVariantId);
      const productId = input?.productId ?? input?.product?.id;
      if (!input || !productId || input.trackInventory === false) {
        continue;
      }
      const qty = recipeInputQuantityForOutput(
        Number(rl.qtyPerOutputUnit ?? 0),
        Number(rl.wasteFactor ?? 0),
        outputQty,
      );
      if (qty <= 0) continue;
      materials.push({
        inputVariantId: input.id,
        productId,
        productName: input.product?.name ?? `Input ${input.id}`,
        sku: input.sku ?? null,
        qty,
      });
    }

    if (materials.length === 0) {
      return null;
    }

    return {
      storageId,
      materials,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      outputQty,
    };
  }
}
