import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { recipeInputQuantityForOutput } from '@modules/recipes/application/recipe-consumption.util';
import { DiningOrder } from '../domain/dining-order.entity';
import { KitchenItemStatus } from '../domain/dining.enums';

@Injectable()
export class DiningBackflushService {
  private readonly logger = new Logger(DiningBackflushService.name);

  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly recipesService: RecipesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Backflush insumos PREPARADO al cerrar cuenta con venta SALE vinculada.
   * Idempotente por diningOrderId + saleTransactionId en metadata.
   */
  async backflushForClosedOrder(
    order: DiningOrder,
    saleTransactionId: string,
    userId: string,
  ): Promise<void> {
    if (!saleTransactionId?.trim()) {
      return;
    }

    const lines = (order.lines ?? []).filter(
      (l) =>
        l.kitchenStatus !== KitchenItemStatus.CANCELLED &&
        Number(l.quantity) > 0,
    );
    if (lines.length === 0) {
      return;
    }

    const variantIds = [...new Set(lines.map((l) => l.productVariantId))];
    const variants = await this.variantRepo.find({
      where: variantIds.map((id) => ({ id })),
      relations: ['product'],
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const adjLines: CreateTransactionLineDto[] = [];
    const recipeLinks: Array<{
      variantId: string;
      recipeId: string;
      recipeVersion: number;
      qty: number;
    }> = [];

    for (const line of lines) {
      const variant = variantMap.get(line.productVariantId);
      if (!variant?.product) continue;
      if (variant.product.productType !== ProductType.PREPARADO) continue;

      const recipes = await this.recipesService.list(variant.id);
      const recipe = recipes.find(
        (r) => r.isActive && r.type === RecipeType.PRODUCTION,
      );
      if (!recipe) {
        this.logger.warn(
          `Sin receta PRODUCTION activa para variante ${variant.id} en cuenta ${order.id}`,
        );
        continue;
      }

      const outputQty = Number(line.quantity) || 0;
      for (const rl of recipe.lines.sort(
        (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
      )) {
        const qty = recipeInputQuantityForOutput(
          Number(rl.qtyPerOutputUnit ?? 0),
          Number(rl.wasteFactor ?? 0),
          outputQty,
        );
        if (qty <= 0) continue;
        adjLines.push({
          productName: `Input ${rl.inputVariantId}`,
          productVariantId: rl.inputVariantId,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          notes: 'Backflush dining PREPARADO',
        } as CreateTransactionLineDto);
      }
      recipeLinks.push({
        variantId: variant.id,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
        qty: outputQty,
      });
    }

    if (adjLines.length === 0) {
      return;
    }

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.ADJUSTMENT_OUT;
    dto.branchId = order.branchId as any;
    dto.userId = userId as any;
    dto.subtotal = 0;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = 0;
    dto.lines = adjLines;
    dto.relatedTransactionId = saleTransactionId;
    dto.metadata = {
      origin: 'DINING_BACKFLUSH',
      links: {
        diningOrderId: order.id,
        saleTransactionId,
        recipeLinks,
      },
    } as any;

    await this.transactionsService.createTransaction(dto);
  }
}
