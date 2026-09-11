import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import {
  isPackProductType,
  isValidPackComponentType,
} from '@modules/products/application/helpers/product-type-policy.util';
import { Recipe } from '../domain/recipe.entity';
import { RecipeLine } from '../domain/recipe-line.entity';
import { RecipeType } from '../domain/recipe-type.enum';
import {
  computePackPmpSum,
  computePackProducibleQty,
  expandPackComponentNeeds,
  mergeVariantQtyMaps,
} from './pack-ctp.util';

export type UpsertPackLineDto = {
  inputVariantId: string;
  qtyPerOutputUnit: number;
  sortOrder?: number;
};

export type PackLineView = RecipeLine & {
  inputProductName?: string | null;
  inputSku?: string | null;
};

export type PackCompositionView = Recipe & {
  lines: PackLineView[];
};

@Injectable()
export class PackService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeLine)
    private readonly recipeLineRepo: Repository<RecipeLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
  ) {}

  async getActivePackRecipe(
    companyId: string,
    outputVariantId: string,
  ): Promise<(Recipe & { lines: RecipeLine[] }) | null> {
    const recipe = await this.recipeRepo.findOne({
      where: {
        companyId,
        outputVariantId,
        type: RecipeType.PACK,
        isActive: true,
      },
      relations: ['lines'],
      order: { updatedAt: 'DESC' },
    });
    return recipe;
  }

  /** Composición enriquecida para UI (nombre de producto + SKU de variante). */
  async getPackCompositionView(
    companyId: string,
    outputVariantId: string,
  ): Promise<PackCompositionView | { lines: PackLineView[] }> {
    const recipe = await this.getActivePackRecipe(companyId, outputVariantId);
    if (!recipe) {
      return { lines: [] };
    }
    return {
      ...recipe,
      lines: await this.enrichLines(companyId, recipe.lines ?? []),
    };
  }

  async upsertPackComposition(
    companyId: string,
    outputVariantId: string,
    lines: UpsertPackLineDto[],
  ): Promise<PackCompositionView> {
    const variant = await this.variantRepo.findOne({
      where: { id: outputVariantId, companyId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new NotFoundException('Variante pack no encontrada.');
    }
    if (!isPackProductType(variant.product.productType)) {
      throw new BadRequestException(
        'Solo variantes de productos tipo PACK pueden tener composición de kit.',
      );
    }
    if (!lines.length) {
      throw new BadRequestException('Agregue al menos un componente al pack.');
    }

    const inputIds = lines.map((l) => l.inputVariantId.trim());
    const inputs = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
      relations: ['product'],
    });
    const inputById = new Map(inputs.map((v) => [v.id, v]));
    for (const line of lines) {
      const input = inputById.get(line.inputVariantId.trim());
      if (!input?.product) {
        throw new BadRequestException(
          `Componente ${line.inputVariantId} no encontrado.`,
        );
      }
      if (!isValidPackComponentType(input.product.productType)) {
        throw new BadRequestException(
          `El componente ${input.sku ?? input.id} no es válido para un pack.`,
        );
      }
      if (input.product.productType === ProductType.PACK) {
        throw new BadRequestException('Un pack no puede contener otro pack.');
      }
    }

    let recipe = await this.recipeRepo.findOne({
      where: {
        companyId,
        outputVariantId,
        type: RecipeType.PACK,
        isActive: true,
      },
    });
    if (!recipe) {
      recipe = await this.recipeRepo.save(
        this.recipeRepo.create({
          companyId,
          outputVariantId,
          type: RecipeType.PACK,
          version: 1,
          isActive: true,
          metadata: {},
        }),
      );
    }

    await this.recipeLineRepo.delete({ recipeId: recipe.id } as any);
    await this.recipeLineRepo.save(
      lines.map((l, idx) =>
        this.recipeLineRepo.create({
          companyId,
          recipeId: recipe!.id,
          inputVariantId: l.inputVariantId.trim(),
          qtyPerOutputUnit: l.qtyPerOutputUnit,
          wasteFactor: 0,
          limitsProjectedStock: true,
          sortOrder: l.sortOrder ?? idx + 1,
        }),
      ),
    );

    const saved = await this.recipeRepo.findOne({
      where: { id: recipe.id },
      relations: ['lines'],
    });
    if (!saved) {
      throw new NotFoundException('Receta pack no encontrada tras guardar.');
    }
    return {
      ...saved,
      lines: await this.enrichLines(companyId, saved.lines ?? []),
    };
  }

  private async enrichLines(
    companyId: string,
    lines: RecipeLine[],
  ): Promise<PackLineView[]> {
    if (lines.length === 0) {
      return [];
    }
    const inputIds = [...new Set(lines.map((line) => line.inputVariantId))];
    const variants = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
      relations: ['product'],
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    return lines.map((line) => {
      const input = byId.get(line.inputVariantId);
      return {
        ...line,
        inputProductName: input?.product?.name ?? null,
        inputSku: input?.sku?.trim() ? input.sku : null,
      };
    });
  }

  async computeProducibleQty(
    companyId: string,
    outputVariantId: string,
    storageId: string,
  ): Promise<{ producibleQty: number | null; reason?: string }> {
    const recipe = await this.getActivePackRecipe(companyId, outputVariantId);
    if (!recipe?.lines?.length) {
      return { producibleQty: null, reason: 'NO_PACK_COMPOSITION' };
    }

    const inputIds = recipe.lines.map((l) => l.inputVariantId);
    const variants = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
      relations: ['product'],
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const levels = await this.stockLevelRepo.find({
      where: {
        storageId,
        productVariantId: In(inputIds),
      },
    });
    const availById: Record<string, number> = {};
    for (const sl of levels) {
      availById[sl.productVariantId] = Number(sl.availableStock ?? 0);
    }

    const packLines = recipe.lines.map((l) => ({
      inputVariantId: l.inputVariantId,
      qtyPerOutputUnit: Number(l.qtyPerOutputUnit),
      inputProductType: variantById.get(l.inputVariantId)?.product?.productType,
    }));

    return {
      producibleQty: computePackProducibleQty(packLines, availById),
    };
  }

  async computePmpSummary(
    companyId: string,
    outputVariantId: string,
  ): Promise<{ packPmp: number; lineCount: number }> {
    const recipe = await this.getActivePackRecipe(companyId, outputVariantId);
    if (!recipe?.lines?.length) {
      return { packPmp: 0, lineCount: 0 };
    }
    const inputIds = recipe.lines.map((l) => l.inputVariantId);
    const variants = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
    });
    const costById: Record<string, number> = {};
    for (const v of variants) {
      costById[v.id] = Number(v.baseCost ?? 0);
    }
    return {
      packPmp: computePackPmpSum(recipe.lines, costById),
      lineCount: recipe.lines.length,
    };
  }

  /** Expande necesidades de stock de líneas de venta que incluyen PACK. */
  async expandPackLinesForStockCheck(
    companyId: string,
    qtyByVariant: Map<string, number>,
    variantProductTypeById: Map<string, string | undefined>,
  ): Promise<Map<string, number>> {
    const expanded = new Map<string, number>();
    for (const [variantId, qty] of qtyByVariant) {
      const pt = variantProductTypeById.get(variantId);
      if (!isPackProductType(pt)) {
        expanded.set(variantId, (expanded.get(variantId) ?? 0) + qty);
        continue;
      }
      const recipe = await this.getActivePackRecipe(companyId, variantId);
      if (!recipe?.lines?.length) {
        expanded.set(variantId, (expanded.get(variantId) ?? 0) + qty);
        continue;
      }
      mergeVariantQtyMaps(
        expanded,
        expandPackComponentNeeds(variantId, qty, recipe.lines),
      );
    }
    return expanded;
  }
}
