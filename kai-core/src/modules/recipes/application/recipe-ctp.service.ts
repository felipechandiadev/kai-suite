import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { Recipe } from '../domain/recipe.entity';
import { RecipeType } from '../domain/recipe-type.enum';
import {
  buildCtpDetailLines,
  CtpDetailReason,
  producibleQtyFromLines,
} from './recipe-ctp.util';

export type CtpBatchItem = {
  variantId: string;
  productionUnitId?: string;
};

export type CtpBatchResultItem = {
  variantId: string;
  productionUnitId: string | null;
  inputStorageId: string | null;
  producibleQty: number | null;
};

export type CtpDetailResult = {
  variantId: string;
  branchId: string;
  productionUnitId: string | null;
  productionUnitName: string | null;
  inputStorageId: string | null;
  inputStorageName: string | null;
  producibleQty: number | null;
  reason: CtpDetailReason | null;
  lines: ReturnType<typeof buildCtpDetailLines>['lines'];
};

export type CtpByStorageItem = {
  storageId: string;
  storageName: string | null;
  productionUnitNames: string[];
  producibleQty: number | null;
  reason: CtpDetailReason | null;
  lines: ReturnType<typeof buildCtpDetailLines>['lines'];
};

export type CtpByStorageResult = {
  variantId: string;
  reason: CtpDetailReason | null;
  storages: CtpByStorageItem[];
};

@Injectable()
export class RecipeCtpService {
  private readonly logger = new Logger(RecipeCtpService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductionUnit)
    private readonly productionUnitRepo: Repository<ProductionUnit>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(ProductVariantProductionUnit)
    private readonly variantProductionUnitRepo: Repository<ProductVariantProductionUnit>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
  ) {}

  async computeDetailForVariant(
    companyId: string,
    variantId: string,
    branchId: string,
  ): Promise<CtpDetailResult> {
    const emptyBase: CtpDetailResult = {
      variantId,
      branchId,
      productionUnitId: null,
      productionUnitName: null,
      inputStorageId: null,
      inputStorageName: null,
      producibleQty: null,
      reason: null,
      lines: [],
    };

    const mapping = await this.variantProductionUnitRepo.findOne({
      where: {
        companyId,
        branchId: branchId.trim(),
        productVariantId: variantId,
        isDefault: true,
      },
    });

    const productionUnitId = mapping?.productionUnitId ?? null;
    if (!productionUnitId) {
      return { ...emptyBase, reason: 'NO_ROUTING' };
    }

    const [variant, unit] = await Promise.all([
      this.variantRepo.findOne({
        where: { id: variantId, companyId },
        relations: ['product'],
      }),
      this.productionUnitRepo.findOne({
        where: { id: productionUnitId, companyId },
      }),
    ]);

    if (!variant) {
      return { ...emptyBase, productionUnitId, reason: 'NO_RECIPE' };
    }

    const expectedType = this.expectedRecipeType(variant.product?.productType);
    const recipe = await this.recipeRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'lines')
      .where('r.companyId = :companyId', { companyId })
      .andWhere('r.outputVariantId = :variantId', { variantId })
      .andWhere('r.isActive = true')
      .andWhere('r.type = :type', { type: expectedType })
      .orderBy('r.updatedAt', 'DESC')
      .getOne();

    if (!recipe) {
      return {
        ...emptyBase,
        productionUnitId,
        productionUnitName: unit?.name ?? null,
        reason: 'NO_RECIPE',
      };
    }

    const storageId = unit?.defaultInputStorageId ?? null;
    if (!storageId) {
      this.logger.debug(
        `CTP detail: UP ${productionUnitId} sin defaultInputStorageId`,
      );
      return {
        ...emptyBase,
        productionUnitId,
        productionUnitName: unit?.name ?? null,
        reason: 'NO_STORAGE',
      };
    }

    const sortedLines = [...(recipe.lines ?? [])].sort(
      (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
    );
    const inputIds = [...new Set(sortedLines.map((l) => l.inputVariantId))];

    const [inputVariants, stockRows, storage] = await Promise.all([
      inputIds.length
        ? this.variantRepo.find({
            where: { id: In(inputIds), companyId },
            relations: ['product', 'stockBaseUnit'],
          })
        : Promise.resolve([] as ProductVariant[]),
      inputIds.length
        ? this.stockLevelRepo.find({
            where: {
              companyId,
              storageId,
              productVariantId: In(inputIds),
            },
          })
        : Promise.resolve([] as StockLevel[]),
      this.storageRepo.findOne({ where: { id: storageId, companyId } }),
    ]);

    const inputById = new Map(inputVariants.map((v) => [v.id, v]));
    const availableByInput = new Map<string, number>();
    for (const row of stockRows) {
      availableByInput.set(
        row.productVariantId,
        Number(row.availableStock ?? 0),
      );
    }
    for (const id of inputIds) {
      if (!availableByInput.has(id)) {
        availableByInput.set(id, 0);
      }
    }

    const detailLines = buildCtpDetailLines(
      sortedLines.map((l) => {
        const input = inputById.get(l.inputVariantId);
        const stockBaseUnit = (
          input as { stockBaseUnit?: { symbol?: string; name?: string } }
        )?.stockBaseUnit;
        return {
          inputVariantId: l.inputVariantId,
          qtyPerOutputUnit: Number(l.qtyPerOutputUnit ?? 0),
          wasteFactor: Number(l.wasteFactor ?? 0),
          limitsProjectedStock: l.limitsProjectedStock !== false,
          trackInventory: input?.trackInventory !== false,
          inputProductName: input?.product?.name ?? null,
          inputSku: input?.sku ?? null,
          inputStockBaseUnitLabel:
            stockBaseUnit?.symbol?.trim() ||
            stockBaseUnit?.name?.trim() ||
            null,
        };
      }),
      availableByInput,
    );

    let reason: CtpDetailReason | null = null;
    if (detailLines.producibleQty == null) {
      reason = 'NO_LIMITING_LINES';
    }

    return {
      variantId,
      branchId,
      productionUnitId,
      productionUnitName: unit?.name ?? null,
      inputStorageId: storageId,
      inputStorageName: storage?.name ?? null,
      producibleQty: detailLines.producibleQty,
      reason,
      lines: detailLines.lines,
    };
  }

  /**
   * CTP por almacén de insumos: una fila por `defaultInputStorageId` distinto
   * entre las unidades de producción asignadas a la variante (cualquier sucursal).
   */
  async computeByStorageForVariant(
    companyId: string,
    variantId: string,
  ): Promise<CtpByStorageResult> {
    const empty: CtpByStorageResult = {
      variantId,
      reason: null,
      storages: [],
    };

    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
      relations: ['product'],
    });
    if (!variant) {
      return { ...empty, reason: 'NO_RECIPE' };
    }

    const expectedType = this.expectedRecipeType(variant.product?.productType);
    const recipe = await this.recipeRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'lines')
      .where('r.companyId = :companyId', { companyId })
      .andWhere('r.outputVariantId = :variantId', { variantId })
      .andWhere('r.isActive = true')
      .andWhere('r.type = :type', { type: expectedType })
      .orderBy('r.updatedAt', 'DESC')
      .getOne();

    if (!recipe) {
      return { ...empty, reason: 'NO_RECIPE' };
    }

    const mappings = await this.variantProductionUnitRepo.find({
      where: { companyId, productVariantId: variantId },
    });
    const unitIds = [
      ...new Set(mappings.map((m) => m.productionUnitId).filter(Boolean)),
    ];
    if (unitIds.length === 0) {
      return { ...empty, reason: 'NO_ROUTING' };
    }

    const units = await this.productionUnitRepo.find({
      where: { id: In(unitIds), companyId },
    });

    const namesByStorage = new Map<string, Set<string>>();
    for (const unit of units) {
      const storageId = unit.defaultInputStorageId?.trim();
      if (!storageId) continue;
      const set = namesByStorage.get(storageId) ?? new Set<string>();
      if (unit.name?.trim()) set.add(unit.name.trim());
      namesByStorage.set(storageId, set);
    }

    const storageIds = [...namesByStorage.keys()];
    if (storageIds.length === 0) {
      return { ...empty, reason: 'NO_STORAGE' };
    }

    const sortedLines = [...(recipe.lines ?? [])].sort(
      (a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1),
    );
    const inputIds = [...new Set(sortedLines.map((l) => l.inputVariantId))];

    const [inputVariants, stockRows, storages] = await Promise.all([
      inputIds.length
        ? this.variantRepo.find({
            where: { id: In(inputIds), companyId },
            relations: ['product', 'stockBaseUnit'],
          })
        : Promise.resolve([] as ProductVariant[]),
      inputIds.length
        ? this.stockLevelRepo.find({
            where: {
              companyId,
              storageId: In(storageIds),
              productVariantId: In(inputIds),
            },
          })
        : Promise.resolve([] as StockLevel[]),
      this.storageRepo.find({
        where: { id: In(storageIds), companyId },
      }),
    ]);

    const inputById = new Map(inputVariants.map((v) => [v.id, v]));
    const storageById = new Map(storages.map((s) => [s.id, s]));
    const availableMap = new Map<string, number>();
    for (const row of stockRows) {
      availableMap.set(
        `${row.storageId}:${row.productVariantId}`,
        Number(row.availableStock ?? 0),
      );
    }

    const lineInputs = sortedLines.map((l) => {
      const input = inputById.get(l.inputVariantId);
      const stockBaseUnit = (
        input as { stockBaseUnit?: { symbol?: string; name?: string } }
      )?.stockBaseUnit;
      return {
        inputVariantId: l.inputVariantId,
        qtyPerOutputUnit: Number(l.qtyPerOutputUnit ?? 0),
        wasteFactor: Number(l.wasteFactor ?? 0),
        limitsProjectedStock: l.limitsProjectedStock !== false,
        trackInventory: input?.trackInventory !== false,
        inputProductName: input?.product?.name ?? null,
        inputSku: input?.sku ?? null,
        inputStockBaseUnitLabel:
          stockBaseUnit?.symbol?.trim() ||
          stockBaseUnit?.name?.trim() ||
          null,
      };
    });

    const items: CtpByStorageItem[] = storageIds
      .map((storageId) => {
        const availableByInput = new Map<string, number>();
        for (const id of inputIds) {
          availableByInput.set(
            id,
            availableMap.get(`${storageId}:${id}`) ?? 0,
          );
        }
        const detailLines = buildCtpDetailLines(lineInputs, availableByInput);
        let reason: CtpDetailReason | null = null;
        if (detailLines.producibleQty == null) {
          reason = 'NO_LIMITING_LINES';
        }
        return {
          storageId,
          storageName: storageById.get(storageId)?.name ?? null,
          productionUnitNames: [...(namesByStorage.get(storageId) ?? [])].sort(
            (a, b) => a.localeCompare(b, 'es'),
          ),
          producibleQty: detailLines.producibleQty,
          reason,
          lines: detailLines.lines,
        };
      })
      .sort((a, b) =>
        (a.storageName ?? a.storageId).localeCompare(
          b.storageName ?? b.storageId,
          'es',
        ),
      );

    return { variantId, reason: null, storages: items };
  }

  async computeForVariants(
    companyId: string,
    items: CtpBatchItem[],
    branchId?: string | null,
  ): Promise<CtpBatchResultItem[]> {
    if (!items.length) {
      return [];
    }

    const uniqueVariantIds = [...new Set(items.map((i) => i.variantId))];

    let resolvedUnitByVariant = new Map<string, string>();
    if (branchId?.trim()) {
      const mappings = await this.variantProductionUnitRepo.find({
        where: {
          companyId,
          branchId: branchId.trim(),
          productVariantId: In(uniqueVariantIds),
          isDefault: true,
        },
      });
      resolvedUnitByVariant = new Map(
        mappings.map((m) => [m.productVariantId, m.productionUnitId]),
      );
    }

    const normalized = items.map((item) => ({
      variantId: item.variantId,
      productionUnitId:
        item.productionUnitId?.trim() ||
        resolvedUnitByVariant.get(item.variantId) ||
        null,
    }));

    const uniqueUnitIds = [
      ...new Set(
        normalized
          .map((i) => i.productionUnitId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [variants, units, recipes] = await Promise.all([
      this.variantRepo.find({
        where: { id: In(uniqueVariantIds), companyId },
        relations: ['product'],
      }),
      uniqueUnitIds.length
        ? this.productionUnitRepo.find({
            where: { id: In(uniqueUnitIds), companyId },
          })
        : Promise.resolve([] as ProductionUnit[]),
      this.recipeRepo
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.lines', 'lines')
        .where('r.companyId = :companyId', { companyId })
        .andWhere('r.outputVariantId IN (:...ids)', { ids: uniqueVariantIds })
        .andWhere('r.isActive = true')
        .getMany(),
    ]);

    const variantById = new Map(variants.map((v) => [v.id, v]));
    const unitById = new Map(units.map((u) => [u.id, u]));

    const recipeByVariant = new Map<string, Recipe>();
    for (const recipe of recipes) {
      const variant = variantById.get(recipe.outputVariantId);
      const expectedType = this.expectedRecipeType(variant?.product?.productType);
      if (recipe.type !== expectedType) {
        continue;
      }
      const prev = recipeByVariant.get(recipe.outputVariantId);
      if (
        !prev ||
        (recipe.updatedAt?.getTime() ?? 0) > (prev.updatedAt?.getTime() ?? 0)
      ) {
        recipeByVariant.set(recipe.outputVariantId, recipe);
      }
    }

    const inputIds = new Set<string>();
    for (const recipe of recipeByVariant.values()) {
      for (const line of recipe.lines ?? []) {
        if (line.limitsProjectedStock !== false) {
          inputIds.add(line.inputVariantId);
        }
      }
    }

    const inputVariants =
      inputIds.size > 0
        ? await this.variantRepo.find({
            where: { id: In([...inputIds]), companyId },
            select: ['id', 'trackInventory'],
          })
        : [];
    const trackByInput = new Map(
      inputVariants.map((v) => [v.id, v.trackInventory !== false]),
    );

    const storageIds = [
      ...new Set(
        [...unitById.values()]
          .map((u) => u.defaultInputStorageId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const stockRows =
      storageIds.length > 0 && inputIds.size > 0
        ? await this.stockLevelRepo.find({
            where: {
              companyId,
              storageId: In(storageIds),
              productVariantId: In([...inputIds]),
            },
          })
        : [];

    const availableMap = new Map<string, number>();
    for (const row of stockRows) {
      availableMap.set(
        `${row.storageId}:${row.productVariantId}`,
        Number(row.availableStock ?? 0),
      );
    }

    return normalized.map((item) => {
      const empty: CtpBatchResultItem = {
        variantId: item.variantId,
        productionUnitId: item.productionUnitId,
        inputStorageId: null,
        producibleQty: null,
      };

      if (!item.productionUnitId) {
        return empty;
      }

      const recipe = recipeByVariant.get(item.variantId);
      const unit = unitById.get(item.productionUnitId);
      const storageId = unit?.defaultInputStorageId ?? null;

      if (!recipe || !storageId) {
        if (!storageId) {
          this.logger.debug(
            `CTP: UP ${item.productionUnitId} sin defaultInputStorageId`,
          );
        }
        return {
          ...empty,
          inputStorageId: storageId,
        };
      }

      const availableByInput = new Map<string, number>();
      for (const line of recipe.lines ?? []) {
        availableByInput.set(
          line.inputVariantId,
          availableMap.get(`${storageId}:${line.inputVariantId}`) ?? 0,
        );
      }

      const producibleQty = producibleQtyFromLines(
        (recipe.lines ?? []).map((l) => ({
          inputVariantId: l.inputVariantId,
          qtyPerOutputUnit: Number(l.qtyPerOutputUnit ?? 0),
          wasteFactor: Number(l.wasteFactor ?? 0),
          limitsProjectedStock: l.limitsProjectedStock !== false,
          trackInventory: trackByInput.get(l.inputVariantId) !== false,
        })),
        availableByInput,
      );

      return {
        variantId: item.variantId,
        productionUnitId: item.productionUnitId,
        inputStorageId: storageId,
        producibleQty,
      };
    });
  }

  private expectedRecipeType(productType?: string | null): RecipeType {
    const pt = String(productType ?? '')
      .trim()
      .toUpperCase();
    return pt === ProductType.SERVICE ? RecipeType.SERVICE : RecipeType.PRODUCTION;
  }
}
