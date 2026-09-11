import { DataSource, IsNull } from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductAddon } from '@modules/products/domain/product-addon.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import {
  SEED_STORAGE_PASTELERIA_CODE,
  SEED_STORAGE_PASTELERIA_NAME,
} from './config';
import {
  SEED_DEV_PACK_RECIPES,
  SEED_DEV_PRODUCTION_RECIPES,
  type SeedRecipeDef,
} from './food-recipes';

/**
 * Cocina / barra / pastelería + routing variante→UP para una empresa food
 * (Kai Food en suite, o catálogo food-only).
 */
export async function seedDemoFoodKitchenForCompany(input: {
  dataSource: DataSource;
  companyId: string;
  branch: Branch;
  sharedStorage: Storage;
  logPrefix: string;
}): Promise<void> {
  const { dataSource, companyId, branch, sharedStorage, logPrefix } = input;
  const productionUnitRepo = dataSource.getRepository(ProductionUnit);
  const storageRepo = dataSource.getRepository(Storage);
  const productRepo = dataSource.getRepository(Product);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const pvPuRepo = dataSource.getRepository(ProductVariantProductionUnit);
  const recipeRepo = dataSource.getRepository(Recipe);
  const recipeLineRepo = dataSource.getRepository(RecipeLine);

  let pasteleriaStorage = await storageRepo.findOne({
    where: { companyId, code: SEED_STORAGE_PASTELERIA_CODE },
    withDeleted: true,
  });
  if (!pasteleriaStorage) {
    pasteleriaStorage = storageRepo.create({
      companyId,
      name: SEED_STORAGE_PASTELERIA_NAME,
      code: SEED_STORAGE_PASTELERIA_CODE,
      branchId: null,
      type: StorageType.PRODUCTION_INPUTS,
      category: StorageCategory.PRODUCTION_INPUT,
      isDefault: false,
      isActive: true,
    });
  } else if (pasteleriaStorage.deletedAt) {
    pasteleriaStorage = await storageRepo.recover(pasteleriaStorage);
  }
  pasteleriaStorage.name = SEED_STORAGE_PASTELERIA_NAME;
  pasteleriaStorage.branchId = null;
  pasteleriaStorage.type = StorageType.PRODUCTION_INPUTS;
  pasteleriaStorage.category = StorageCategory.PRODUCTION_INPUT;
  pasteleriaStorage.isActive = true;
  pasteleriaStorage = await storageRepo.save(pasteleriaStorage);

  const upsertUnit = async (def: {
    code: string;
    name: string;
    scope: ProductionUnitScope;
    inventoryMode: ProductionUnitInventoryMode;
    purpose: ProductionUnitPurpose;
    branchId: string | null;
    inputStorageId: string;
  }): Promise<ProductionUnit> => {
    let unit = await productionUnitRepo.findOne({
      where:
        def.scope === ProductionUnitScope.COMPANY
          ? { companyId, scope: ProductionUnitScope.COMPANY, code: def.code }
          : { companyId, branchId: def.branchId!, code: def.code },
    });
    if (!unit) {
      unit = productionUnitRepo.create({
        companyId,
        branchId: def.branchId,
        scope: def.scope,
        inventoryMode: def.inventoryMode,
        purpose: def.purpose,
        code: def.code,
        name: def.name,
        defaultInputStorageId: def.inputStorageId,
        defaultOutputStorageId: null,
        isActive: true,
      });
    } else {
      unit.name = def.name;
      unit.branchId = def.branchId;
      unit.scope = def.scope;
      unit.inventoryMode = def.inventoryMode;
      unit.purpose = def.purpose;
      unit.defaultInputStorageId = def.inputStorageId;
      unit.defaultOutputStorageId = null;
      unit.isActive = true;
    }
    return productionUnitRepo.save(unit);
  };

  const cocina = await upsertUnit({
    code: 'COCINA',
    name: 'Cocina',
    scope: ProductionUnitScope.BRANCH,
    inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
    purpose: ProductionUnitPurpose.KITCHEN,
    branchId: branch.id,
    inputStorageId: sharedStorage.id,
  });
  await upsertUnit({
    code: 'BARRA',
    name: 'Barra',
    scope: ProductionUnitScope.BRANCH,
    inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
    purpose: ProductionUnitPurpose.KITCHEN,
    branchId: branch.id,
    inputStorageId: sharedStorage.id,
  });
  const pasteleria = await upsertUnit({
    code: 'PASTELERIA',
    name: 'Pastelería central',
    scope: ProductionUnitScope.COMPANY,
    inventoryMode: ProductionUnitInventoryMode.AUTONOMOUS,
    purpose: ProductionUnitPurpose.BATCH,
    branchId: null,
    inputStorageId: pasteleriaStorage.id,
  });
  pasteleriaStorage.productionUnitId = pasteleria.id;
  await storageRepo.save(pasteleriaStorage);

  const products = await productRepo.find({
    where: { companyId, deletedAt: IsNull() },
    select: ['id', 'productType'],
  });
  const typeByProductId = new Map(products.map((p) => [p.id, p.productType]));
  const variants = await variantRepo.find({
    where: { companyId, deletedAt: IsNull() },
    select: ['id', 'productId'],
  });

  let routingCount = 0;
  for (const v of variants) {
    const pt = typeByProductId.get(v.productId ?? '');
    const targets: Array<{ unitId: string }> = [];
    if (pt === ProductType.PREPARADO) {
      targets.push({ unitId: cocina.id });
    }
    if (pt === ProductType.ELABORADO) {
      targets.push({ unitId: pasteleria.id });
    }
    for (const t of targets) {
      let row = await pvPuRepo.findOne({
        where: {
          companyId,
          productVariantId: v.id,
          branchId: branch.id,
          productionUnitId: t.unitId,
        },
      });
      if (!row) {
        row = pvPuRepo.create({
          companyId,
          productVariantId: v.id,
          branchId: branch.id,
          productionUnitId: t.unitId,
          isDefault: true,
        });
      } else {
        row.isDefault = true;
      }
      await pvPuRepo.save(row);
      await pvPuRepo
        .createQueryBuilder()
        .update()
        .set({ isDefault: false })
        .where('company_id = :companyId', { companyId })
        .andWhere('product_variant_id = :vid', { vid: v.id })
        .andWhere('branch_id = :bid', { bid: branch.id })
        .andWhere('id != :id', { id: row.id })
        .execute();
      routingCount += 1;
    }
  }
  console.log(
    `✅ ${logPrefix}: UP Cocina/Barra/Pastelería · routing variante→UP ${routingCount} vínculo(s)`,
  );

  const skuToVariantId = new Map<string, string>();
  const seedVariants = await variantRepo.find({
    where: { companyId, deletedAt: IsNull() },
    select: ['id', 'sku'],
  });
  for (const v of seedVariants) {
    if (v.sku) skuToVariantId.set(v.sku, v.id);
  }

  const upsertRecipe = async (
    recipeDef: SeedRecipeDef,
    type: RecipeType,
  ): Promise<boolean> => {
    const outputVariantId = skuToVariantId.get(recipeDef.outputSku);
    if (!outputVariantId) return false;
    const linesPayload: Array<{
      inputVariantId: string;
      qtyPerOutputUnit: number;
      wasteFactor: number;
      sortOrder: number;
    }> = [];
    for (let i = 0; i < recipeDef.lines.length; i++) {
      const line = recipeDef.lines[i];
      const inputVariantId = skuToVariantId.get(line.inputSku);
      if (!inputVariantId) return false;
      linesPayload.push({
        inputVariantId,
        qtyPerOutputUnit: line.qtyPerOutputUnit,
        wasteFactor: line.wasteFactor ?? 0,
        sortOrder: i + 1,
      });
    }
    if (linesPayload.length === 0) return false;

    const existing = await recipeRepo.find({
      where: { companyId, outputVariantId, type },
    });
    for (const old of existing) {
      await recipeLineRepo.delete({ recipeId: old.id });
      await recipeRepo.delete({ id: old.id });
    }
    const recipe = await recipeRepo.save(
      recipeRepo.create({
        companyId,
        outputVariantId,
        type,
        version: 1,
        isActive: true,
        metadata: { seed: 'demo', outputSku: recipeDef.outputSku },
      }),
    );
    await recipeLineRepo.save(
      linesPayload.map((l) =>
        recipeLineRepo.create({
          companyId,
          recipeId: recipe.id,
          inputVariantId: l.inputVariantId,
          qtyPerOutputUnit: l.qtyPerOutputUnit,
          wasteFactor: l.wasteFactor,
          limitsProjectedStock: true,
          sortOrder: l.sortOrder,
        }),
      ),
    );
    return true;
  };

  let recipesCreated = 0;
  for (const recipeDef of SEED_DEV_PRODUCTION_RECIPES) {
    if (recipeDef.outputSku.startsWith('SEEDDEVMAN')) continue;
    if (await upsertRecipe(recipeDef, RecipeType.PRODUCTION)) recipesCreated += 1;
  }
  let packCreated = 0;
  for (const recipeDef of SEED_DEV_PACK_RECIPES) {
    if (await upsertRecipe(recipeDef, RecipeType.PACK)) packCreated += 1;
  }
  console.log(
    `✅ ${logPrefix}: recetas PRODUCTION ${recipesCreated} · PACK ${packCreated}`,
  );

  const addonRepo = dataSource.getRepository(ProductAddon);
  const hostProduct = await productRepo.findOne({
    where: { companyId, name: 'Hamburguesa clásica', deletedAt: IsNull() },
  });
  const addonProduct = await productRepo.findOne({
    where: { companyId, name: 'Doble queso', deletedAt: IsNull() },
  });
  if (hostProduct && addonProduct) {
    const existingLink = await addonRepo.findOne({
      where: { hostProductId: hostProduct.id, addonProductId: addonProduct.id },
    });
    if (!existingLink) {
      await addonRepo.save(
        addonRepo.create({
          companyId,
          hostProductId: hostProduct.id,
          addonProductId: addonProduct.id,
          sortOrder: 1,
        }),
      );
    }
    console.log(`✅ ${logPrefix}: agregado Doble queso → Hamburguesa clásica`);
  }
}
