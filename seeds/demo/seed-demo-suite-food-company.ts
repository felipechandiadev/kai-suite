import { DataSource, IsNull } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage, StorageType } from '@modules/storages/domain/storage.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { TableShape } from '@modules/dining/domain/dining.enums';
import { sanitizeCompanyTipSettings } from '@modules/companies/domain/company-tips.types';
import { buildDefaultCompanyMenuTopBarSettings } from '@modules/companies/domain/company-menu-topbar.types';
import { buildDefaultCompanyMenuAboutSettings } from '@modules/companies/domain/company-menu-about.types';
import { buildDefaultCompanyMenuFindUsSettings } from '@modules/companies/domain/company-menu-find-us.types';
import { buildDefaultCompanyMenuThemeSettings } from '@modules/companies/domain/company-menu-theme.types';
import {
  SEED_BRANCH_NAME,
  SEED_BRANCH_LOCATION,
  SEED_POS_NAMES,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  SEED_DEV_COMPANY_SECOND,
  SEED_DEV_MENU_PUBLIC_SLUG,
} from './config';
import {
  getSeedFoodOnlyProducts,
  getSeedDevBrands,
  SEED_KAIFOOD_CATEGORIES,
  SEED_DEV_ATTRIBUTES,
} from './catalog';
import {
  seedProductsFromDefinitions,
  syncSeedAttributes,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';

export type SeedSuiteFoodCompanyInput = {
  dataSource: DataSource;
  companyFood: Company;
  /** Si se omite, se crea/sincroniza IVA 19% en la empresa Food. */
  ivaTax?: Tax;
};

/**
 * Segunda pasada suite: catálogo KaiFood completo en `companyFood`
 * (on_menu, salón, tips, carta pública).
 */
export async function seedDemoSuiteFoodCompany(
  input: SeedSuiteFoodCompanyInput,
): Promise<void> {
  const { dataSource, companyFood } = input;
  console.log(
    `🍽️  Suite: sembrando empresa food «${companyFood.nombreFantasia}» (${companyFood.id})`,
  );

  await TenantContext.run(
    { activeCompanyId: companyFood.id, userId: null, rol: null },
    async () => {
      const taxRepo = dataSource.getRepository(Tax);
      const unitRepo = dataSource.getRepository(Unit);
      let ivaTax = input.ivaTax;
      if (!ivaTax || ivaTax.companyId !== companyFood.id) {
        let existing = await taxRepo.findOne({
          where: {
            companyId: companyFood.id,
            name: 'IVA',
            taxType: TaxType.IVA,
          },
        });
        if (!existing) {
          existing = taxRepo.create({
            companyId: companyFood.id,
            name: 'IVA',
            rate: 19,
            taxType: TaxType.IVA,
            isActive: true,
            description: 'Impuesto al Valor Agregado (IVA) 19% — seed demo',
          });
        } else {
          existing.rate = 19;
          existing.isActive = true;
        }
        ivaTax = await taxRepo.save(existing);
        console.log(`✅ Suite food: IVA 19% id=${ivaTax.id}`);
      }

      const upsertUnit = async (args: {
        symbol: string;
        name: string;
        dimension: UnitDimension;
        isBase: boolean;
        conversionFactor: number;
        baseUnitId: string | null;
        allowDecimals: boolean;
        isDefault?: boolean;
      }): Promise<Unit> => {
        let u = await unitRepo.findOne({
          where: {
            companyId: companyFood.id,
            symbol: args.symbol,
            deletedAt: IsNull(),
          },
          withDeleted: true,
        });
        if (!u) {
          u = unitRepo.create({
            companyId: companyFood.id,
            symbol: args.symbol,
            name: args.name,
            dimension: args.dimension,
            isBase: args.isBase,
            conversionFactor: args.conversionFactor,
            baseUnitId: args.baseUnitId,
            allowDecimals: args.allowDecimals,
            active: true,
            isDefault: args.isDefault === true,
          });
        } else {
          if (u.deletedAt) {
            u = await unitRepo.recover(u);
          }
          u.name = args.name;
          u.dimension = args.dimension;
          u.isBase = args.isBase;
          u.conversionFactor = args.conversionFactor;
          u.baseUnitId = args.baseUnitId;
          u.allowDecimals = args.allowDecimals;
          u.active = true;
          u.isDefault = args.isDefault === true;
        }
        return unitRepo.save(u);
      };

      const unitUn = await upsertUnit({
        symbol: 'un',
        name: 'Unidad',
        dimension: UnitDimension.COUNT,
        isBase: true,
        conversionFactor: 1,
        baseUnitId: null,
        allowDecimals: false,
        isDefault: true,
      });
      const unitMl = await upsertUnit({
        symbol: 'ml',
        name: 'Mililitro',
        dimension: UnitDimension.VOLUME,
        isBase: true,
        conversionFactor: 1,
        baseUnitId: null,
        allowDecimals: true,
      });
      const unitLiter = await upsertUnit({
        symbol: 'L',
        name: 'Litro',
        dimension: UnitDimension.VOLUME,
        isBase: false,
        conversionFactor: 1000,
        baseUnitId: unitMl.id,
        allowDecimals: true,
      });
      const unitGram = await upsertUnit({
        symbol: 'g',
        name: 'Gramo',
        dimension: UnitDimension.MASS,
        isBase: true,
        conversionFactor: 1,
        baseUnitId: null,
        allowDecimals: true,
      });
      const unitKg = await upsertUnit({
        symbol: 'kg',
        name: 'Kilogramo',
        dimension: UnitDimension.MASS,
        isBase: false,
        conversionFactor: 1000,
        baseUnitId: unitGram.id,
        allowDecimals: true,
      });
      const seedUnitId = {
        UN: unitUn.id,
        ML: unitMl.id,
        L: unitLiter.id,
        G: unitGram.id,
        KG: unitKg.id,
      };
      console.log('✅ Suite food: unidades UN/ml/L/g/kg');

      const branchRepo = dataSource.getRepository(Branch);
      const storageRepo = dataSource.getRepository(Storage);
      const priceListRepo = dataSource.getRepository(PriceList);
      const posRepo = dataSource.getRepository(PointOfSale);
      const categoryRepo = dataSource.getRepository(Category);
      const attributeRepo = dataSource.getRepository(Attribute);
      const productRepo = dataSource.getRepository(Product);
      const variantRepo = dataSource.getRepository(ProductVariant);
      const priceListItemRepo = dataSource.getRepository(PriceListItem);
      const brandRepo = dataSource.getRepository(Brand);
      const companyRepo = dataSource.getRepository(Company);

      let branch = await branchRepo.findOne({
        where: { companyId: companyFood.id, name: SEED_BRANCH_NAME },
      });
      if (!branch) {
        branch = branchRepo.create({
          companyId: companyFood.id,
          name: SEED_BRANCH_NAME,
          address: SEED_DEV_COMPANY_SECOND.address,
          phone: SEED_DEV_COMPANY_SECOND.phone,
          location: SEED_BRANCH_LOCATION,
          isActive: true,
        });
      }
      branch = await branchRepo.save(branch);

      let storage = await storageRepo.findOne({
        where: { companyId: companyFood.id, code: SEED_STORAGE_CODE },
      });
      if (!storage) {
        storage = storageRepo.create({
          companyId: companyFood.id,
          branchId: branch.id,
          name: SEED_STORAGE_NAME,
          code: SEED_STORAGE_CODE,
          type: StorageType.WAREHOUSE,
          isActive: true,
        });
      }
      storage = await storageRepo.save(storage);

      let listaMinorista = await priceListRepo.findOne({
        where: { companyId: companyFood.id, name: SEED_PRICE_LIST_RETAIL_NAME },
      });
      if (!listaMinorista) {
        listaMinorista = priceListRepo.create({
          companyId: companyFood.id,
          name: SEED_PRICE_LIST_RETAIL_NAME,
          priceListType: PriceListType.RETAIL,
          currency: 'CLP',
          priority: 0,
          isDefault: true,
          isActive: true,
        });
      }
      listaMinorista = await priceListRepo.save(listaMinorista);

      for (const posName of SEED_POS_NAMES) {
        let pos = await posRepo.findOne({
          where: { companyId: companyFood.id, name: posName },
        });
        if (!pos) {
          pos = posRepo.create({
            companyId: companyFood.id,
            branchId: branch.id,
            storageId: storage.id,
            name: posName,
            defaultPriceListId: listaMinorista.id,
            priceLists: [
              {
                id: listaMinorista.id,
                name: listaMinorista.name,
                isActive: true,
              },
            ],
            isActive: true,
          });
        } else {
          pos.branchId = branch.id;
          pos.storageId = storage.id;
          pos.defaultPriceListId = listaMinorista.id;
          pos.priceLists = [
            {
              id: listaMinorista.id,
              name: listaMinorista.name,
              isActive: true,
            },
          ];
        }
        await posRepo.save(pos);
      }

      const categoryByName = await syncSeedCategories(
        categoryRepo,
        companyFood.id,
        [...SEED_KAIFOOD_CATEGORIES],
        'Suite food',
      );
      const attributesByName = await syncSeedAttributes(
        attributeRepo,
        SEED_DEV_ATTRIBUTES.map((a) => ({
          name: a.name,
          options: [...a.options],
          displayOrder: a.displayOrder,
        })),
        'Suite food',
      );
      const brandIdByName = await syncSeedBrands(
        brandRepo,
        companyFood.id,
        getSeedDevBrands(),
        'Suite food',
      );

      const foodProducts = getSeedFoodOnlyProducts();
      await seedProductsFromDefinitions(foodProducts, {
        companyId: companyFood.id,
        productRepo,
        variantRepo,
        priceListItemRepo,
        ivaTax,
        categoryByName,
        brandIdByName,
        attributesByName,
        seedUnitId,
        listaMinoristaId: listaMinorista.id,
        listaMayoristaId: listaMinorista.id,
        listaEshopId: listaMinorista.id,
        logPrefix: 'Suite food',
        defaultStockQty: 0,
      });

      await productRepo
        .createQueryBuilder()
        .update(Product)
        .set({ onMenu: true })
        .where('companyId = :companyId', { companyId: companyFood.id })
        .andWhere('productType != :insumo', { insumo: ProductType.INSUMO })
        .execute();

      const diningRoomRepo = dataSource.getRepository(DiningRoom);
      const diningTableRepo = dataSource.getRepository(DiningTable);
      let room = await diningRoomRepo.findOne({
        where: { companyId: companyFood.id, name: 'Salón principal' },
      });
      if (!room) {
        room = diningRoomRepo.create({
          companyId: companyFood.id,
          branchId: branch.id,
          name: 'Salón principal',
          isActive: true,
        });
      }
      room = await diningRoomRepo.save(room);
      for (let i = 1; i <= 6; i++) {
        const code = `M${i}`;
        let table = await diningTableRepo.findOne({
          where: { diningRoomId: room.id, code },
        });
        if (!table) {
          table = diningTableRepo.create({
            diningRoomId: room.id,
            code,
            label: `Mesa ${i}`,
            capacity: 4,
            shape: TableShape.RECT,
          });
        }
        await diningTableRepo.save(table);
      }

      const diningSettingsRepo = dataSource.getRepository(DiningBranchSettings);
      let diningSettings = await diningSettingsRepo.findOne({
        where: { companyId: companyFood.id, branchId: branch.id },
      });
      if (!diningSettings) {
        diningSettings = diningSettingsRepo.create({
          companyId: companyFood.id,
          branchId: branch.id,
          allowPosOpenTable: true,
        });
      } else {
        diningSettings.allowPosOpenTable = true;
      }
      await diningSettingsRepo.save(diningSettings);

      const company = await companyRepo.findOne({ where: { id: companyFood.id } });
      if (company) {
        const settings = {
          ...((company.settings as Record<string, unknown>) ?? {}),
          tips: sanitizeCompanyTipSettings({
            enabled: true,
            suggestPercent: 10,
            allowCustomAmount: true,
            allowCashTips: true,
            distributionMode: 'DIRECT',
            distributionWeights: {},
          }),
          menuEnabled: true,
          menuPublicSlug: SEED_DEV_MENU_PUBLIC_SLUG,
          menuDefaultBranchId: branch.id,
          menuDefaultPriceListId: listaMinorista.id,
          menuTopBar: buildDefaultCompanyMenuTopBarSettings(),
          menuAbout: buildDefaultCompanyMenuAboutSettings(),
          menuFindUs: {
            ...buildDefaultCompanyMenuFindUsSettings(),
            address: SEED_DEV_COMPANY_SECOND.address,
            phone: SEED_DEV_COMPANY_SECOND.phone,
          },
          menuTheme: buildDefaultCompanyMenuThemeSettings(),
        };
        company.settings = settings;
        await companyRepo.save(company);
      }

      console.log(
        `✅ Suite food: ${foodProducts.length} productos, on_menu=true, salón 6 mesas, carta slug=${SEED_DEV_MENU_PUBLIC_SLUG}`,
      );
    },
  );
}
