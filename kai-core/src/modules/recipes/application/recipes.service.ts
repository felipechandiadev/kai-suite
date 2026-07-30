import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { CatalogRealtimePublisher } from '@modules/catalog-realtime/catalog-realtime.publisher';
import { Recipe } from '../domain/recipe.entity';
import { RecipeLine } from '../domain/recipe-line.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

const RECIPE_ALLOWED_PRODUCT_TYPES = new Set([
  'SERVICE',
  'MANUFACTURADO',
  'PREPARADO',
  'ELABORADO',
]);

export type RecipeLineView = RecipeLine & {
  inputProductName?: string | null;
  inputSku?: string | null;
  inputStockBaseUnitLabel?: string | null;
};

export type RecipeView = Recipe & {
  lines: RecipeLineView[];
};

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeLine)
    private readonly recipeLineRepo: Repository<RecipeLine>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @Optional() private readonly catalogRealtime?: CatalogRealtimePublisher,
  ) {}

  async list(companyId: string, outputVariantId?: string): Promise<RecipeView[]> {
    const qb = this.recipeRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'lines')
      .where('r.companyId = :companyId', { companyId });
    if (outputVariantId) {
      qb.andWhere('r.outputVariantId = :outputVariantId', { outputVariantId });
    }
    qb.orderBy('r.updatedAt', 'DESC');
    const recipes = await qb.getMany();
    return Promise.all(recipes.map((recipe) => this.toRecipeView(recipe)));
  }

  async findById(id: string) {
    const recipe = await this.recipeRepo.findOne({ where: { id }, relations: ['lines'] });
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return this.toRecipeView(recipe);
  }

  async create(companyId: string, dto: CreateRecipeDto) {
    const outputId = dto.outputVariantId?.trim();
    if (!outputId) {
      throw new BadRequestException('outputVariantId es obligatorio.');
    }
    const variant = await this.variantRepo.findOne({
      where: { id: outputId, companyId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new BadRequestException(
        'Variante de salida no encontrada o sin producto asociado.',
      );
    }
    const pt = String(variant.product?.productType ?? 'PHYSICAL')
      .trim()
      .toUpperCase();
    if (!RECIPE_ALLOWED_PRODUCT_TYPES.has(pt)) {
      throw new BadRequestException(
        'Solo productos tipo servicio, manufacturado, preparado o elaborado pueden tener receta.',
      );
    }

    if (!dto.lines?.length) {
      throw new BadRequestException('Agregue al menos una línea de insumo.');
    }

    const recipe = this.recipeRepo.create({
      companyId,
      outputVariantId: dto.outputVariantId,
      type: dto.type,
      version: dto.version ?? 1,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? {},
    });
    const saved = await this.recipeRepo.save(recipe);

    const lines = (dto.lines ?? []).map((l) =>
      this.recipeLineRepo.create({
        companyId,
        recipeId: saved.id,
        inputVariantId: l.inputVariantId,
        qtyPerOutputUnit: l.qtyPerOutputUnit,
        wasteFactor: l.wasteFactor ?? 0,
        limitsProjectedStock: l.limitsProjectedStock !== false,
        sortOrder: l.sortOrder ?? 1,
      }),
    );
    if (lines.length) {
      await this.recipeLineRepo.save(lines);
    }

    this.emitRecipeInvalidation(companyId, saved.id, saved.outputVariantId);
    return this.findById(saved.id);
  }

  async update(companyId: string, id: string, dto: UpdateRecipeDto) {
    const current = await this.recipeRepo.findOne({
      where: { id, companyId },
      relations: ['lines'],
    });
    if (!current) {
      throw new NotFoundException('Recipe not found');
    }

    if (dto.outputVariantId != null) current.outputVariantId = dto.outputVariantId as any;
    if (dto.type != null) current.type = dto.type as any;
    if (dto.version != null) current.version = dto.version as any;
    if (dto.isActive != null) current.isActive = dto.isActive as any;
    if (dto.metadata != null) current.metadata = dto.metadata as any;

    await this.recipeRepo.save(current);

    if (dto.lines) {
      await this.recipeLineRepo.delete({ recipeId: id } as any);
      const lines = dto.lines.map((l) =>
        this.recipeLineRepo.create({
          companyId: current.companyId,
          recipeId: id,
          inputVariantId: (l as any).inputVariantId,
          qtyPerOutputUnit: Number((l as any).qtyPerOutputUnit ?? 0),
          wasteFactor: Number((l as any).wasteFactor ?? 0),
          limitsProjectedStock: (l as any).limitsProjectedStock !== false,
          sortOrder: Number((l as any).sortOrder ?? 1),
        }),
      );
      await this.recipeLineRepo.save(lines);
    }

    this.emitRecipeInvalidation(companyId, id, current.outputVariantId);
    return this.findById(id);
  }

  private emitRecipeInvalidation(
    companyId: string,
    recipeId: string,
    outputVariantId: string,
  ) {
    try {
      this.catalogRealtime?.emitInvalidated({
        companyId,
        kinds: ['RECIPE'],
        recipeId,
        variantIds: [outputVariantId],
        at: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(
        `Catalog RECIPE invalidate failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async toRecipeView(recipe: Recipe): Promise<RecipeView> {
    const lines = [...(recipe.lines ?? [])].sort(
      (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
    );
    const enriched = await this.enrichLines(lines);
    return { ...recipe, lines: enriched };
  }

  private async enrichLines(lines: RecipeLine[]): Promise<RecipeLineView[]> {
    if (lines.length === 0) {
      return [];
    }
    const inputIds = [...new Set(lines.map((line) => line.inputVariantId))];
    const variants = await this.variantRepo.find({
      where: { id: In(inputIds) },
      relations: ['product', 'stockBaseUnit'],
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    return lines.map((line) => {
      const input = byId.get(line.inputVariantId);
      const stockBaseUnit = (input as { stockBaseUnit?: { symbol?: string; name?: string } })
        ?.stockBaseUnit;
      return {
        ...line,
        inputProductName: input?.product?.name ?? null,
        inputSku: input?.sku ?? null,
        inputStockBaseUnitLabel:
          stockBaseUnit?.symbol?.trim() || stockBaseUnit?.name?.trim() || null,
      };
    });
  }
}
