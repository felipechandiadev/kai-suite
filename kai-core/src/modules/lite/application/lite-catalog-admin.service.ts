import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Product,
  ProductType,
} from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import {
  Storage,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { LiteStockService } from './lite-stock.service';
import {
  LiteAdminProductType,
  LiteBulkCreateProductsDto,
  LiteCreateProductDto,
  LiteCreateVariantDto,
  LitePatchProductDto,
  LitePatchVariantDto,
} from './dto/lite-product-admin.dto';
import { LiteUpsertPackDto } from './dto/lite-pack.dto';
import { LiteCreateUnitDto, LitePatchUnitDto } from './dto/lite-unit.dto';
import {
  LiteCreateStorageDto,
  LitePatchStorageDto,
} from './dto/lite-storage.dto';
import {
  LiteCreateAttributeDto,
  LiteCreateCategoryDto,
  LitePatchAttributeDto,
  LitePatchCategoryDto,
} from './dto/lite-taxonomy.dto';

const LITE_PRODUCT_TYPES = new Set<string>([
  LiteAdminProductType.PHYSICAL,
  LiteAdminProductType.SERVICE,
  LiteAdminProductType.PACK,
  LiteAdminProductType.INSUMO,
]);

@Injectable()
export class LiteCatalogAdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeLine)
    private readonly recipeLineRepo: Repository<RecipeLine>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    private readonly stock: LiteStockService,
  ) {}

  async listProducts(companyId: string) {
    const variants = await this.variantRepo.find({
      where: { companyId },
      relations: ['product'],
      order: { sku: 'ASC' },
    });

    const attrById = await this.loadAttributeMap(companyId);

    type VariantRow = {
      variantId: string;
      productId: string;
      sku: string;
      barcode: string | null;
      basePrice: number;
      isActive: boolean;
      attributeValues: Record<string, string> | null;
      attributesLabel: string | null;
      physicalStock?: number;
    };

    type ProductRow = {
      id: string;
      productId: string;
      name: string;
      productType: ProductType;
      isActive: boolean;
      variantCount: number;
      variants: VariantRow[];
    };

    const byProduct = new Map<string, ProductRow>();

    for (const v of variants) {
      const product = v.product;
      if (!product || product.deletedAt || v.deletedAt) continue;

      let row = byProduct.get(product.id);
      if (!row) {
        row = {
          id: product.id,
          productId: product.id,
          name: product.name,
          productType: product.productType,
          isActive: Boolean(product.isActive),
          variantCount: 0,
          variants: [],
        };
        byProduct.set(product.id, row);
      }

      const attributeValues = this.parseAttributeValues(v.attributeValues);
      const variantRow: VariantRow = {
        variantId: v.id,
        productId: product.id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        basePrice: Number(v.basePrice ?? 0),
        isActive: Boolean(v.isActive),
        attributeValues,
        attributesLabel: this.formatAttributesLabel(attributeValues, attrById),
      };
      if (
        product.productType === ProductType.PHYSICAL ||
        product.productType === ProductType.INSUMO
      ) {
        variantRow.physicalStock = await this.stock.getPhysicalStock(
          companyId,
          v.id,
        );
      }
      row.variants.push(variantRow);
      row.variantCount = row.variants.length;
    }

    const items = Array.from(byProduct.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );

    return { items };
  }

  async createProduct(companyId: string, dto: LiteCreateProductDto) {
    const productType = dto.productType as unknown as ProductType;
    if (!LITE_PRODUCT_TYPES.has(dto.productType)) {
      throw new BadRequestException(
        'productType debe ser PHYSICAL|SERVICE|PACK|INSUMO',
      );
    }

    const unitId = await this.resolveUnitId(companyId, dto.unitId);
    const sku =
      dto.sku?.trim() ||
      `SKU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

    const existingSku = await this.variantRepo.findOne({
      where: { companyId, sku },
    });
    if (existingSku) {
      throw new BadRequestException(`SKU ya existe: ${sku}`);
    }

    const barcode = dto.barcode?.trim() || undefined;
    if (barcode) {
      const existingBc = await this.variantRepo.findOne({
        where: { companyId, barcode },
      });
      if (existingBc) {
        throw new BadRequestException(`Código de barras ya existe: ${barcode}`);
      }
    }

    if (dto.categoryId) {
      await this.assertProductCategoryExists(companyId, dto.categoryId);
    }

    const isActive = dto.isActive !== false;

    const product = await this.productRepo.save(
      this.productRepo.create({
        companyId,
        name: dto.name.trim(),
        productType,
        baseUnitId: unitId,
        categoryId: dto.categoryId || undefined,
        isActive,
        visibleInEShop: false,
        onMenu: false,
      }),
    );

    const trackInventory =
      productType === ProductType.PHYSICAL ||
      productType === ProductType.INSUMO;

    const variant = await this.variantRepo.save(
      this.variantRepo.create({
        companyId,
        productId: product.id,
        sku,
        barcode,
        basePrice: Number(dto.basePrice ?? 0),
        baseCost: 0,
        unitId,
        stockBaseUnitId: unitId,
        saleUnitId: unitId,
        purchaseUnitId: unitId,
        trackInventory,
        allowNegativeStock: false,
        isActive,
        visibleInEShop: false,
      }),
    );

    return {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      productType: product.productType,
      sku: variant.sku,
      barcode: variant.barcode ?? null,
      basePrice: Number(variant.basePrice ?? 0),
      isActive: product.isActive,
    };
  }

  async bulkCreateProducts(
    companyId: string,
    dto: LiteBulkCreateProductsDto,
  ): Promise<{
    items: Array<{
      sku: string;
      name: string;
      ok: boolean;
      message: string;
      productId?: string;
      variantId?: string;
    }>;
  }> {
    const lines = dto.lines ?? [];
    if (lines.length === 0) {
      throw new BadRequestException('No hay filas para importar');
    }

    const skuSeen = new Map<string, number>();
    const bcSeen = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const skuKey = lines[i]!.sku.trim().toLowerCase();
      if (skuKey) {
        if (skuSeen.has(skuKey)) {
          // marked later per-row
        } else {
          skuSeen.set(skuKey, i);
        }
      }
      const bc = lines[i]!.barcode?.trim().toLowerCase();
      if (bc) {
        if (!bcSeen.has(bc)) bcSeen.set(bc, i);
      }
    }

    const categories = await this.categoryRepo.find({
      where: { companyId, isActive: true },
    });
    const categoryByName = new Map(
      categories
        .filter((c) => !c.deletedAt)
        .map((c) => [c.name.trim().toLowerCase(), c]),
    );

    const items: Array<{
      sku: string;
      name: string;
      ok: boolean;
      message: string;
      productId?: string;
      variantId?: string;
    }> = [];

    const skuFirstIndex = new Map<string, number>();
    const bcFirstIndex = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const name = line.name.trim();
      const sku = line.sku.trim();
      const barcode = line.barcode?.trim() || undefined;
      const skuKey = sku.toLowerCase();
      const bcKey = barcode?.toLowerCase();

      if (!name) {
        items.push({ sku, name, ok: false, message: 'Nombre obligatorio' });
        continue;
      }
      if (!sku) {
        items.push({ sku, name, ok: false, message: 'SKU obligatorio' });
        continue;
      }

      if (skuFirstIndex.has(skuKey)) {
        items.push({
          sku,
          name,
          ok: false,
          message: `SKU duplicado en el archivo (también fila ${skuFirstIndex.get(skuKey)! + 1})`,
        });
        continue;
      }
      skuFirstIndex.set(skuKey, i);

      if (bcKey) {
        if (bcFirstIndex.has(bcKey)) {
          items.push({
            sku,
            name,
            ok: false,
            message: `Código de barras duplicado en el archivo (también fila ${bcFirstIndex.get(bcKey)! + 1})`,
          });
          continue;
        }
        bcFirstIndex.set(bcKey, i);
      }

      let categoryId: string | undefined;
      const catName = line.categoryName?.trim();
      if (catName) {
        const cat = categoryByName.get(catName.toLowerCase());
        if (!cat) {
          items.push({
            sku,
            name,
            ok: false,
            message: `Categoría no encontrada: ${catName}`,
          });
          continue;
        }
        categoryId = cat.id;
      }

      const productType =
        line.productType ?? LiteAdminProductType.PHYSICAL;

      try {
        const created = await this.createProduct(companyId, {
          name,
          sku,
          barcode,
          productType,
          basePrice: line.basePrice ?? 0,
          categoryId,
          isActive: line.isActive,
        });
        items.push({
          sku: created.sku,
          name: created.name,
          ok: true,
          message: 'Creado',
          productId: created.productId,
          variantId: created.variantId,
        });
      } catch (e: unknown) {
        let message = 'Error al crear';
        if (e instanceof BadRequestException || e instanceof NotFoundException) {
          const res = e.getResponse();
          message =
            typeof res === 'string'
              ? res
              : typeof res === 'object' &&
                  res &&
                  'message' in res
                ? Array.isArray((res as { message: unknown }).message)
                  ? String((res as { message: string[] }).message.join(', '))
                  : String((res as { message: string }).message)
                : e.message;
        } else if (e instanceof Error) {
          message = e.message;
        }
        items.push({ sku, name, ok: false, message });
      }
    }

    return { items };
  }

  async patchProduct(
    companyId: string,
    productId: string,
    dto: LitePatchProductDto,
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Producto no encontrado: ${productId}`);
    }

    if (dto.name != null) product.name = dto.name.trim();
    if (dto.productType != null) {
      if (!LITE_PRODUCT_TYPES.has(dto.productType)) {
        throw new BadRequestException(
          'productType debe ser PHYSICAL|SERVICE|PACK|INSUMO',
        );
      }
      product.productType = dto.productType as unknown as ProductType;
    }
    if (dto.isActive != null) product.isActive = dto.isActive;

    await this.productRepo.save(product);
    return {
      productId: product.id,
      name: product.name,
      productType: product.productType,
      isActive: product.isActive,
    };
  }

  async getVariant(companyId: string, variantId: string) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
      relations: ['product', 'unit'],
    });
    if (!variant || variant.deletedAt || !variant.product) {
      throw new NotFoundException(`Variante no encontrada: ${variantId}`);
    }

    const product = variant.product;
    const physicalStock = await this.stock.getPhysicalStock(
      companyId,
      variant.id,
    );
    const attributeValues = this.parseAttributeValues(variant.attributeValues);
    const attrById = await this.loadAttributeMap(companyId);

    return {
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      productType: product.productType,
      sku: variant.sku,
      barcode: variant.barcode ?? null,
      basePrice: Number(variant.basePrice ?? 0),
      baseCost: Number(variant.baseCost ?? 0),
      unitId: variant.unitId,
      unitSymbol: variant.unit?.symbol ?? null,
      isActive: Boolean(product.isActive && variant.isActive),
      productIsActive: product.isActive,
      variantIsActive: variant.isActive,
      trackInventory: variant.trackInventory,
      physicalStock,
      attributeValues,
      attributesLabel: this.formatAttributesLabel(attributeValues, attrById),
    };
  }

  async listProductVariants(companyId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Producto no encontrado: ${productId}`);
    }

    const variants = await this.variantRepo.find({
      where: { companyId, productId },
      order: { sku: 'ASC' },
    });
    const attrById = await this.loadAttributeMap(companyId);

    return {
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      items: variants
        .filter((v) => !v.deletedAt)
        .map((v) => {
          const attributeValues = this.parseAttributeValues(v.attributeValues);
          return {
            variantId: v.id,
            productId: product.id,
            sku: v.sku,
            barcode: v.barcode ?? null,
            basePrice: Number(v.basePrice ?? 0),
            isActive: Boolean(product.isActive && v.isActive),
            attributeValues,
            attributesLabel: this.formatAttributesLabel(
              attributeValues,
              attrById,
            ),
          };
        }),
    };
  }

  async createVariant(
    companyId: string,
    productId: string,
    dto: LiteCreateVariantDto,
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Producto no encontrado: ${productId}`);
    }

    const sibling = await this.variantRepo.findOne({
      where: { companyId, productId },
      order: { createdAt: 'ASC' },
    });
    const unitId =
      sibling?.unitId ??
      product.baseUnitId ??
      (await this.resolveUnitId(companyId));

    const sku =
      dto.sku?.trim() ||
      `SKU-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const existingSku = await this.variantRepo.findOne({
      where: { companyId, sku },
    });
    if (existingSku) {
      throw new BadRequestException(`SKU ya existe: ${sku}`);
    }

    const attributeValues = await this.normalizeAttributeValues(
      companyId,
      dto.attributeValues,
    );
    await this.assertUniqueAttributeSignature(
      productId,
      attributeValues,
      undefined,
    );

    const trackInventory =
      sibling?.trackInventory ??
      (product.productType === ProductType.PHYSICAL ||
        product.productType === ProductType.INSUMO);

    const variant = await this.variantRepo.save(
      this.variantRepo.create({
        companyId,
        productId: product.id,
        sku,
        barcode: dto.barcode?.trim() || undefined,
        basePrice: Number(dto.basePrice ?? sibling?.basePrice ?? 0),
        baseCost: 0,
        unitId,
        stockBaseUnitId: sibling?.stockBaseUnitId ?? unitId,
        saleUnitId: sibling?.saleUnitId ?? unitId,
        purchaseUnitId: sibling?.purchaseUnitId ?? unitId,
        trackInventory,
        allowNegativeStock: sibling?.allowNegativeStock ?? false,
        isActive: dto.isActive ?? true,
        visibleInEShop: false,
        attributeValues: attributeValues ?? undefined,
      }),
    );

    return this.getVariant(companyId, variant.id);
  }

  async patchVariant(
    companyId: string,
    variantId: string,
    dto: LitePatchVariantDto,
  ) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
    });
    if (!variant || variant.deletedAt) {
      throw new NotFoundException(`Variante no encontrada: ${variantId}`);
    }

    if (dto.sku != null) {
      const sku = dto.sku.trim();
      if (!sku) throw new BadRequestException('sku no puede estar vacío');
      const clash = await this.variantRepo.findOne({
        where: { companyId, sku },
      });
      if (clash && clash.id !== variant.id) {
        throw new BadRequestException(`SKU ya existe: ${sku}`);
      }
      variant.sku = sku;
    }
    if (dto.barcode !== undefined) {
      variant.barcode = dto.barcode?.trim() || undefined;
    }
    if (dto.basePrice != null) {
      variant.basePrice = Number(dto.basePrice);
    }
    if (dto.baseCost != null) {
      variant.baseCost = Number(dto.baseCost);
    }
    if (dto.isActive != null) {
      variant.isActive = dto.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'attributeValues')) {
      const attributeValues = await this.normalizeAttributeValues(
        companyId,
        dto.attributeValues,
      );
      const productId = variant.productId;
      if (!productId) {
        throw new BadRequestException('Variante sin productId');
      }
      await this.assertUniqueAttributeSignature(
        productId,
        attributeValues,
        variant.id,
      );
      variant.attributeValues = attributeValues ?? undefined;
    }

    await this.variantRepo.save(variant);
    return this.getVariant(companyId, variant.id);
  }

  async getPack(companyId: string, variantId: string) {
    await this.assertVariantExists(companyId, variantId);
    const recipe = await this.recipeRepo.findOne({
      where: {
        companyId,
        outputVariantId: variantId,
        type: RecipeType.PACK,
        isActive: true,
      },
      relations: ['lines'],
      order: { updatedAt: 'DESC' },
    });

    if (!recipe?.lines?.length) {
      return { lines: [] as Array<{
        componentVariantId: string;
        qty: number;
        name?: string;
        sku?: string;
      }> };
    }

    const inputIds = recipe.lines.map((l) => l.inputVariantId);
    const inputs = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
      relations: ['product'],
    });
    const byId = new Map(inputs.map((v) => [v.id, v]));

    const lines = [...recipe.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => {
        const input = byId.get(l.inputVariantId);
        return {
          componentVariantId: l.inputVariantId,
          qty: Number(l.qtyPerOutputUnit),
          name: input?.product?.name,
          sku: input?.sku,
        };
      });

    return { lines };
  }

  async upsertPack(
    companyId: string,
    variantId: string,
    dto: LiteUpsertPackDto,
  ) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
      relations: ['product'],
    });
    if (!variant?.product) {
      throw new NotFoundException(`Variante no encontrada: ${variantId}`);
    }
    if (variant.product.productType !== ProductType.PACK) {
      throw new BadRequestException(
        'Solo productos tipo PACK pueden tener composición',
      );
    }

    const inputIds = dto.lines.map((l) => l.componentVariantId);
    const inputs = await this.variantRepo.find({
      where: { id: In(inputIds), companyId },
      relations: ['product'],
    });
    const byId = new Map(inputs.map((v) => [v.id, v]));

    for (const line of dto.lines) {
      const input = byId.get(line.componentVariantId);
      if (!input?.product) {
        throw new BadRequestException(
          `Componente no encontrado: ${line.componentVariantId}`,
        );
      }
      if (input.product.productType === ProductType.PACK) {
        throw new BadRequestException('Un pack no puede contener otro pack');
      }
      if (line.componentVariantId === variantId) {
        throw new BadRequestException(
          'Un pack no puede contenerse a sí mismo',
        );
      }
    }

    let recipe = await this.recipeRepo.findOne({
      where: {
        companyId,
        outputVariantId: variantId,
        type: RecipeType.PACK,
        isActive: true,
      },
    });
    if (!recipe) {
      recipe = await this.recipeRepo.save(
        this.recipeRepo.create({
          companyId,
          outputVariantId: variantId,
          type: RecipeType.PACK,
          version: 1,
          isActive: true,
          metadata: {},
        }),
      );
    }

    await this.recipeLineRepo.delete({ recipeId: recipe.id } as any);
    await this.recipeLineRepo.save(
      dto.lines.map((l, idx) =>
        this.recipeLineRepo.create({
          companyId,
          recipeId: recipe!.id,
          inputVariantId: l.componentVariantId,
          qtyPerOutputUnit: Number(l.qty),
          wasteFactor: 0,
          limitsProjectedStock: true,
          sortOrder: idx + 1,
        }),
      ),
    );

    return this.getPack(companyId, variantId);
  }

  async listUnits(companyId: string) {
    const rows = await this.unitRepo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
    return {
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        symbol: u.symbol,
        dimension: u.dimension,
        conversionFactor: Number(u.conversionFactor),
        isDefault: u.isDefault,
        active: u.active,
      })),
    };
  }

  async createUnit(companyId: string, dto: LiteCreateUnitDto) {
    const unit = await this.unitRepo.save(
      this.unitRepo.create({
        companyId,
        name: dto.name.trim(),
        symbol: dto.symbol.trim(),
        dimension: dto.dimension,
        conversionFactor: Number(dto.conversionFactor),
        allowDecimals: dto.dimension !== UnitDimension.COUNT,
        isBase: true,
        active: true,
        isDefault: false,
      }),
    );
    return {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      dimension: unit.dimension,
      conversionFactor: Number(unit.conversionFactor),
    };
  }

  async patchUnit(companyId: string, unitId: string, dto: LitePatchUnitDto) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException(`Unidad no encontrada: ${unitId}`);
    }
    if (dto.name != null) unit.name = dto.name.trim();
    if (dto.symbol != null) unit.symbol = dto.symbol.trim();
    if (dto.dimension != null) unit.dimension = dto.dimension;
    if (dto.conversionFactor != null) {
      unit.conversionFactor = Number(dto.conversionFactor);
    }
    await this.unitRepo.save(unit);
    return {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      dimension: unit.dimension,
      conversionFactor: Number(unit.conversionFactor),
    };
  }

  async listStorages(companyId: string) {
    const rows = await this.storageRepo.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    return {
      items: rows.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        isDefault: s.isDefault,
        isActive: s.isActive,
      })),
    };
  }

  async createStorage(companyId: string, dto: LiteCreateStorageDto) {
    if (dto.isDefault) {
      await this.clearDefaultStorages(companyId);
    }
    const storage = await this.storageRepo.save(
      this.storageRepo.create({
        companyId,
        name: dto.name.trim(),
        type: dto.type ?? StorageType.WAREHOUSE,
        isDefault: Boolean(dto.isDefault),
        isActive: true,
      }),
    );
    return {
      id: storage.id,
      name: storage.name,
      type: storage.type,
      isDefault: storage.isDefault,
    };
  }

  async patchStorage(
    companyId: string,
    storageId: string,
    dto: LitePatchStorageDto,
  ) {
    const storage = await this.storageRepo.findOne({
      where: { id: storageId, companyId },
    });
    if (!storage) {
      throw new NotFoundException(`Almacén no encontrado: ${storageId}`);
    }
    if (dto.name != null) storage.name = dto.name.trim();
    if (dto.type != null) storage.type = dto.type;
    if (dto.isDefault === true) {
      await this.clearDefaultStorages(companyId);
      storage.isDefault = true;
    } else if (dto.isDefault === false) {
      storage.isDefault = false;
    }
    await this.storageRepo.save(storage);
    return {
      id: storage.id,
      name: storage.name,
      type: storage.type,
      isDefault: storage.isDefault,
    };
  }

  private async clearDefaultStorages(companyId: string) {
    const defaults = await this.storageRepo.find({
      where: { companyId, isDefault: true },
    });
    for (const row of defaults) {
      row.isDefault = false;
      await this.storageRepo.save(row);
    }
  }

  async listCategories(companyId: string) {
    const rows = await this.categoryRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    const productCounts = await this.productRepo
      .createQueryBuilder('p')
      .select('p.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.categoryId IS NOT NULL')
      .groupBy('p.categoryId')
      .getRawMany<{ categoryId: string; cnt: string }>();
    const productCountById = new Map(
      productCounts.map((r) => [r.categoryId, Number(r.cnt) || 0]),
    );
    const childCountById = new Map<string, number>();
    for (const row of rows) {
      if (!row.parentId) continue;
      childCountById.set(
        row.parentId,
        (childCountById.get(row.parentId) ?? 0) + 1,
      );
    }
    return {
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        parentId: c.parentId ?? null,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: productCountById.get(c.id) ?? 0,
        childCount: childCountById.get(c.id) ?? 0,
      })),
    };
  }

  async createCategory(companyId: string, dto: LiteCreateCategoryDto) {
    if (dto.parentId) {
      await this.assertCategoryExists(companyId, dto.parentId);
    }
    const category = await this.categoryRepo.save(
      this.categoryRepo.create({
        companyId,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        parentId: dto.parentId,
        sortOrder: 0,
        isActive: true,
      }),
    );
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? null,
      parentId: category.parentId ?? null,
      isActive: category.isActive,
    };
  }

  async patchCategory(
    companyId: string,
    categoryId: string,
    dto: LitePatchCategoryDto,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, companyId },
    });
    if (!category || category.deletedAt) {
      throw new NotFoundException(`Categoría no encontrada: ${categoryId}`);
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId === categoryId) {
        throw new BadRequestException(
          'Una categoría no puede ser padre de sí misma',
        );
      }
      if (dto.parentId) {
        await this.assertCategoryExists(companyId, dto.parentId);
        category.parentId = dto.parentId;
      } else {
        category.parentId = undefined;
      }
    }
    if (dto.name != null) category.name = dto.name.trim();
    if (dto.description !== undefined) {
      category.description = dto.description?.trim() || undefined;
    }
    await this.categoryRepo.save(category);
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? null,
      parentId: category.parentId ?? null,
      isActive: category.isActive,
    };
  }

  async deleteCategory(companyId: string, categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, companyId },
    });
    if (!category || category.deletedAt) {
      throw new NotFoundException(`Categoría no encontrada: ${categoryId}`);
    }
    const child = await this.categoryRepo.findOne({
      where: { companyId, parentId: categoryId },
    });
    if (child) {
      throw new BadRequestException(
        'No se puede eliminar: tiene subcategorías',
      );
    }
    const product = await this.productRepo.findOne({
      where: { companyId, categoryId },
    });
    if (product && !product.deletedAt) {
      throw new BadRequestException(
        'No se puede eliminar: tiene productos asociados',
      );
    }
    await this.categoryRepo.softRemove(category);
    return { ok: true };
  }

  async listAttributes(companyId: string) {
    const rows = await this.attributeRepo.find({
      where: { companyId },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return {
      items: rows.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description ?? null,
        options: Array.isArray(a.options) ? a.options : [],
        displayOrder: a.displayOrder,
        isActive: a.isActive,
      })),
    };
  }

  async createAttribute(companyId: string, dto: LiteCreateAttributeDto) {
    const options = (dto.options ?? [])
      .map((o) => o.trim())
      .filter(Boolean);
    const attribute = await this.attributeRepo.save(
      this.attributeRepo.create({
        companyId,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        options,
        displayOrder: 0,
        isActive: true,
      }),
    );
    return {
      id: attribute.id,
      name: attribute.name,
      description: attribute.description ?? null,
      options: attribute.options,
      isActive: attribute.isActive,
    };
  }

  async patchAttribute(
    companyId: string,
    attributeId: string,
    dto: LitePatchAttributeDto,
  ) {
    const attribute = await this.attributeRepo.findOne({
      where: { id: attributeId, companyId },
    });
    if (!attribute || attribute.deletedAt) {
      throw new NotFoundException(`Atributo no encontrado: ${attributeId}`);
    }
    if (dto.name != null) attribute.name = dto.name.trim();
    if (dto.description !== undefined) {
      attribute.description = dto.description?.trim() || undefined;
    }
    if (dto.options != null) {
      attribute.options = dto.options.map((o) => o.trim()).filter(Boolean);
    }
    if (dto.isActive != null) attribute.isActive = dto.isActive;
    await this.attributeRepo.save(attribute);
    return {
      id: attribute.id,
      name: attribute.name,
      description: attribute.description ?? null,
      options: attribute.options,
      isActive: attribute.isActive,
    };
  }

  async deleteAttribute(companyId: string, attributeId: string) {
    const attribute = await this.attributeRepo.findOne({
      where: { id: attributeId, companyId },
    });
    if (!attribute || attribute.deletedAt) {
      throw new NotFoundException(`Atributo no encontrado: ${attributeId}`);
    }
    await this.attributeRepo.softRemove(attribute);
    return { ok: true };
  }

  private async assertProductCategoryExists(
    companyId: string,
    categoryId: string,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, companyId },
    });
    if (!category || category.deletedAt) {
      throw new BadRequestException(
        `Categoría no encontrada: ${categoryId}`,
      );
    }
  }

  private async assertCategoryExists(companyId: string, categoryId: string) {
    const parent = await this.categoryRepo.findOne({
      where: { id: categoryId, companyId },
    });
    if (!parent || parent.deletedAt) {
      throw new BadRequestException(
        `Categoría padre no encontrada: ${categoryId}`,
      );
    }
  }

  private async resolveUnitId(
    companyId: string,
    unitId?: string,
  ): Promise<string> {
    if (unitId) {
      const unit = await this.unitRepo.findOne({
        where: { id: unitId, companyId },
      });
      if (!unit) {
        throw new BadRequestException(`Unidad no encontrada: ${unitId}`);
      }
      return unit.id;
    }

    const preferred =
      (await this.unitRepo.findOne({
        where: { companyId, isDefault: true },
        order: { createdAt: 'ASC' },
      })) ??
      (await this.unitRepo.findOne({
        where: { companyId },
        order: { createdAt: 'ASC' },
      }));

    if (!preferred) {
      throw new BadRequestException(
        'No hay unidades configuradas; cree una unidad primero',
      );
    }
    return preferred.id;
  }

  private async assertVariantExists(companyId: string, variantId: string) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
    });
    if (!variant || variant.deletedAt) {
      throw new NotFoundException(`Variante no encontrada: ${variantId}`);
    }
  }

  private parseAttributeValues(
    raw: unknown,
  ): Record<string, string> | null {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        if (typeof p === 'object' && p != null && !Array.isArray(p)) {
          return p as Record<string, string>;
        }
        return null;
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
  }

  private attributeValuesSignature(
    av: Record<string, string> | null | undefined,
  ): string | null {
    if (!av || Object.keys(av).length === 0) return null;
    const sortedKeys = Object.keys(av).sort();
    const norm: Record<string, string> = {};
    for (const k of sortedKeys) {
      norm[k] = String(av[k]).trim();
    }
    return JSON.stringify(norm);
  }

  private async loadAttributeMap(
    companyId: string,
  ): Promise<Map<string, Attribute>> {
    const rows = await this.attributeRepo.find({ where: { companyId } });
    return new Map(rows.map((a) => [a.id, a]));
  }

  private formatAttributesLabel(
    values: Record<string, string> | null,
    attrById: Map<string, Attribute>,
  ): string | null {
    if (!values || Object.keys(values).length === 0) return null;
    const parts: string[] = [];
    for (const [id, val] of Object.entries(values)) {
      const name = attrById.get(id)?.name ?? id.slice(0, 8);
      parts.push(`${name}: ${val}`);
    }
    return parts.length ? parts.join(' · ') : null;
  }

  private async normalizeAttributeValues(
    companyId: string,
    raw: Record<string, unknown> | null | undefined,
  ): Promise<Record<string, string> | null> {
    if (raw == null) return null;
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('attributeValues debe ser un objeto');
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = typeof k === 'string' ? k.trim() : '';
      if (!key) continue;
      const val = v == null ? '' : String(v).trim();
      if (val === '') continue;
      const attr = await this.attributeRepo.findOne({
        where: { id: key, companyId },
      });
      if (!attr || attr.deletedAt) {
        throw new BadRequestException(`Atributo no válido (${key}).`);
      }
      if (!attr.isActive) {
        throw new BadRequestException(
          `El atributo «${attr.name}» no está activo.`,
        );
      }
      const options = Array.isArray(attr.options) ? attr.options : [];
      if (!options.includes(val)) {
        throw new BadRequestException(
          `El valor «${val}» no es una opción válida para «${attr.name}».`,
        );
      }
      out[key] = val;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  private async assertUniqueAttributeSignature(
    productId: string,
    normalized: Record<string, string> | null,
    excludeVariantId?: string,
  ): Promise<void> {
    const sig = this.attributeValuesSignature(normalized);
    if (!sig) return;
    const siblings = await this.variantRepo.find({
      where: { productId },
    });
    for (const s of siblings) {
      if (s.deletedAt) continue;
      if (excludeVariantId && s.id === excludeVariantId) continue;
      const av = this.parseAttributeValues(s.attributeValues);
      if (this.attributeValuesSignature(av) === sig) {
        throw new BadRequestException(
          'Ya existe una variante de este producto con la misma combinación de atributos.',
        );
      }
    }
  }
}
