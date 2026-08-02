#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DataSource, DeepPartial, IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SeedOperationalModule } from '../shared/seed-operational.module';
import { seedDemoOperationalHistory } from './seed-demo-operational-history';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import {
  Person,
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
  WorkRegime,
} from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  ExtraHoursMode,
  HealthContributionMode,
  SalesCommissionType,
} from '@modules/employees/domain/employment-contract.enums';
import { HrAfpFund } from '@modules/employees/domain/hr-afp-fund.entity';
import { HrIsapre } from '@modules/employees/domain/hr-isapre.entity';
import { HrJobPosition } from '@modules/employees/domain/hr-job-position.entity';
import { HrShiftSystem } from '@modules/hr-jornada/domain/hr-shift-system.entity';
import {
  FlexibleMode,
  ShiftSystemType,
} from '@modules/hr-jornada/domain/shift-system.enums';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import {
  HrLaborUnitShiftMember,
  LaborUnitShiftMemberStatus,
} from '@modules/hr-jornada/domain/hr-labor-unit-shift-member.entity';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitBranch } from '@modules/hr-labor-units/domain/hr-labor-unit-branch.entity';
import { HrLaborUnitProductionUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-production-unit.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { AccountingAccount, AccountType } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule, RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  AccountingRuleLine,
  AccountingRuleLineAmountMode,
  AccountingRuleLineSide,
} from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AutomationRule } from '@modules/automation/domain/automation-rule.entity';
import { AutomationAction } from '@modules/automation/domain/automation-action.entity';
import { AutomationEventType } from '@modules/automation/domain/automation-event-type.enum';
import { AutomationActionType } from '@modules/automation/domain/automation-action-type.enum';
import {
  ExpenseCategoryOperationalGroup,
} from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '@modules/expense-categories/domain/expense-category-pnl-nature.enum';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductVariantProductionAttribute } from '@modules/product-variants/domain/product-variant-production-attribute.entity';
import { ProductVariantProductionAttributeOption } from '@modules/product-variants/domain/product-variant-production-attribute-option.entity';
import { SEED_DEMO_PRODUCTION_ATTRIBUTES } from './seed-demo-production-attributes';
import { seedDemoLaundryCatalog } from './seed-demo-laundry-catalog';
import { TenantContext } from '@common/tenant/tenant.context';
import { AppConfigService } from '../../kai-core/src/config/config.service';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import {
  cleanSeedMultimediaStorage,
  SEED_COMPANY_LOGO_FILE,
  seedDevCatalogMultimedia,
  seedDevEshopHeroSlides,
  seedDevEshopTestimonials,
  seedMultimediaFileLink,
  resolveSeedMultimediaStorage,
} from '../shared/seed-multimedia.util';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import type { CompanyPaymentMethodConfig } from '@modules/payment-methods-config/domain/payment-method-config.types';
import { CompanyPaymentCatalogService } from '@modules/companies/application/company-payment-catalog.service';
import {
  SEED_BRANCH_ADDRESS,
  SEED_BRANCH_LOCATION,
  SEED_BRANCH_NAME,
  SEED_BRANCH_PHONE,
  SEED_BRANCH_2_ADDRESS,
  SEED_BRANCH_2_LOCATION,
  SEED_BRANCH_2_NAME,
  SEED_BRANCH_2_PHONE,
  SEED_CASH_HUBS,
  SEED_DEV_COMPANY,
  SEED_DEV_COMPANY_SECOND,
  SEED_DEV_SHAREHOLDERS,
  SEED_POS_NAMES,
  SEED_PRESALE_POS_NAME,
  SEED_PRICE_LIST_ESHOP_NAME,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_PRICE_LIST_VIP_LEGACY_NAMES,
  SEED_PRICE_LIST_VIP_NAME,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  SEED_STORAGE_2_CODE,
  SEED_STORAGE_2_NAME,
  SEED_STORAGE_PASTELERIA_CODE,
  SEED_STORAGE_PASTELERIA_NAME,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedEmployeeBankAccount,
  buildSeedEshopPublicContact,
  buildSeedPosPaymentList,
} from './config';
import { sanitizeCompanyTipSettings } from '@modules/companies/domain/company-tips.types';
import { seedDemoTipsHistory } from './seed-demo-tips-history';
import {
  SEED_DEV_ATTRIBUTES,
  SEED_DEV_ATTRIBUTE_TALLA,
  SEED_DEV_VARIANT_SKU_PREFIX,
  collectSeedDevCatalogProductNames,
  collectSeedDevCatalogSkus,
  getSeedDevBrands,
  getSeedDevCategories,
  getSeedDevEshopFeaturedProductNames,
  getSeedDevProducts,
  isKaiFoodSeedMode,
  type SeedDevUnitKey,
} from './catalog';
import {
  getSeedDevProductionRecipes,
  getSeedDevProductionUnits,
} from './food-recipes';
import { seedDemoDeliveryCalendar } from './seed-delivery-calendar';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { TableShape } from '@modules/dining/domain/dining.enums';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import {
  seedProductsFromDefinitions,
  syncSeedAttributes,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

/** Meseros seed (JP00009) — únicos tipsEligible en modo KaiFood. */
const SEED_WAITER_DOCUMENT_NUMBERS = new Set([
  '17.100.009-2',
  '17.100.010-6',
  '17.100.011-4',
]);

const SEED_HONORARIUM_RETENTION_NAME = 'Retención pago Honorarios';
const SEED_HONORARIUM_RETENTION_DESCRIPTION =
  'Retención de impuesto aplicable al pago de honorarios (tasa referencial 15,25%).';

/** ILA / impuestos adicionales de venta (códigos SII). Por defecto inactivos (catálogo listo para activar). */
const SEED_SPECIFIC_TAXES = [
  {
    name: 'ILA Bebidas analcohólicas',
    code: '27',
    rate: 10,
    description: 'Impuesto adicional bebidas analcohólicas (código SII 27).',
    isActive: false,
  },
  {
    name: 'ILA Bebidas alto azúcar',
    code: '271',
    rate: 18,
    description: 'Impuesto adicional bebidas con alto contenido de azúcar (código SII 271).',
    isActive: false,
  },
  {
    name: 'ILA Vinos',
    code: '25',
    rate: 20.5,
    description: 'Impuesto adicional vinos (código SII 25).',
    isActive: false,
  },
  {
    name: 'ILA Cervezas',
    code: '26',
    rate: 20.5,
    description: 'Impuesto adicional cervezas y bebidas alcohólicas fermentadas (código SII 26).',
    isActive: false,
  },
  {
    name: 'ILA Licores y destilados',
    code: '24',
    rate: 31.5,
    description: 'Impuesto adicional licores, piscos, whisky y aguardientes (código SII 24).',
    isActive: false,
  },
  {
    name: 'Impuesto artículos suntuarios',
    code: '23',
    rate: 15,
    description: 'Impuesto adicional artículos suntuarios (código SII 23).',
    isActive: false,
  },
] as const;

const SEED_UNIT_BASE_NAME = 'Unidad';
const SEED_UNIT_BASE_SYMBOL = 'un';

function buildSeedAttributes(): readonly {
  name: string;
  options: readonly string[];
  displayOrder: number;
}[] {
  return SEED_DEV_ATTRIBUTES.map((a) => ({
    name: a.name,
    options: [...a.options],
    displayOrder: a.displayOrder,
  }));
}

async function cleanupOrphanSeedDevCatalog(args: {
  companyId: string;
  productRepo: Repository<Product>;
  variantRepo: Repository<ProductVariant>;
  priceListItemRepo: Repository<PriceListItem>;
  stockLevelRepo: Repository<StockLevel>;
  recipeRepo: Repository<Recipe>;
  recipeLineRepo: Repository<RecipeLine>;
}): Promise<void> {
  const {
    companyId,
    productRepo,
    variantRepo,
    priceListItemRepo,
    stockLevelRepo,
    recipeRepo,
    recipeLineRepo,
  } = args;
  const allowedSkus = collectSeedDevCatalogSkus();
  const allowedProductNames = collectSeedDevCatalogProductNames();

  const activeVariants = await variantRepo.find({
    where: { companyId, deletedAt: IsNull() },
  });

  let removedVariants = 0;
  for (const variant of activeVariants) {
    if (!variant.sku.startsWith(SEED_DEV_VARIANT_SKU_PREFIX)) {
      continue;
    }
    if (allowedSkus.has(variant.sku)) {
      continue;
    }

    const recipesOut = await recipeRepo.find({
      where: { companyId, outputVariantId: variant.id },
    });
    for (const recipe of recipesOut) {
      await recipeLineRepo.delete({ recipeId: recipe.id });
      await recipeRepo.delete({ id: recipe.id });
    }
    await recipeLineRepo.delete({ companyId, inputVariantId: variant.id });

    const priceItems = await priceListItemRepo.find({
      where: { productVariantId: variant.id, deletedAt: IsNull() },
    });
    if (priceItems.length > 0) {
      await priceListItemRepo.softRemove(priceItems);
    }
    await stockLevelRepo.delete({ productVariantId: variant.id });
    await variantRepo.softRemove(variant);
    removedVariants += 1;
    console.log(`🗑️  Variante huérfana eliminada: SKU «${variant.sku}»`);
  }

  const activeProducts = await productRepo.find({
    where: { companyId, deletedAt: IsNull() },
  });

  let removedProducts = 0;
  for (const product of activeProducts) {
    if (allowedProductNames.has(product.name)) {
      continue;
    }

    const remaining = await variantRepo.count({
      where: { productId: product.id, deletedAt: IsNull() },
    });
    if (remaining > 0) {
      continue;
    }

    const productPriceItems = await priceListItemRepo.find({
      where: { productId: product.id, deletedAt: IsNull() },
    });
    if (productPriceItems.length > 0) {
      await priceListItemRepo.softRemove(productPriceItems);
    }

    await productRepo.softRemove(product);
    removedProducts += 1;
    console.log(`🗑️  Producto huérfano eliminado: «${product.name}»`);
  }

  if (removedVariants === 0 && removedProducts === 0) {
    console.log('✅ Catálogo desarrollo: sin variantes/productos huérfanos');
  } else {
    console.log(
      `✅ Catálogo desarrollo: ${removedVariants} variante(s) y ${removedProducts} producto(s) huérfanos eliminados`,
    );
  }
}

const SEED_ACCOUNTING_ACCOUNTS: readonly {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  isActive?: boolean;
}[] = [
  // Assets
  { code: '1000', name: 'Activos', type: AccountType.ASSET },
  { code: '1100', name: 'Caja y bancos', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1101', name: 'Caja', type: AccountType.ASSET, parentCode: '1100' },
  { code: '1102', name: 'Banco', type: AccountType.ASSET, parentCode: '1100' },
  {
    code: '1110',
    name: 'Efectivo centros de acopio',
    type: AccountType.ASSET,
    parentCode: '1100',
  },
  { code: '1200', name: 'Cuentas por cobrar', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1201', name: 'Clientes', type: AccountType.ASSET, parentCode: '1200' },

  // Liabilities
  { code: '2000', name: 'Pasivos', type: AccountType.LIABILITY },
  { code: '2100', name: 'Cuentas por pagar', type: AccountType.LIABILITY, parentCode: '2000' },
  { code: '2101', name: 'Proveedores', type: AccountType.LIABILITY, parentCode: '2100' },
  {
    code: '2110',
    name: 'Cheques por pagar emitidos',
    type: AccountType.LIABILITY,
    parentCode: '2100',
  },

  // Equity
  { code: '3000', name: 'Patrimonio', type: AccountType.EQUITY },
  { code: '3100', name: 'Capital', type: AccountType.EQUITY, parentCode: '3000' },
  { code: '3101', name: 'Capital social', type: AccountType.EQUITY, parentCode: '3100' },

  // Income
  { code: '4000', name: 'Ingresos', type: AccountType.INCOME },
  { code: '4100', name: 'Ventas', type: AccountType.INCOME, parentCode: '4000' },
  { code: '4101', name: 'Ventas (mercaderías)', type: AccountType.INCOME, parentCode: '4100' },

  // Expenses
  { code: '5000', name: 'Gastos', type: AccountType.EXPENSE },
  { code: '5100', name: 'Costo de ventas', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5101', name: 'Costo de mercaderías', type: AccountType.EXPENSE, parentCode: '5100' },
  { code: '5200', name: 'Gastos operativos', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5201', name: 'Gastos operativos varios', type: AccountType.EXPENSE, parentCode: '5200' },
] as const;

const SEED_EXPENSE_CATEGORIES: readonly {
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroup;
  pnlNature: ExpenseCategoryPnlNature;
  nonDeletable?: boolean;
}[] = [
  {
    name: 'Sueldos',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Horas extra',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Cargas sociales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Capacitación operativa',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Arriendo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Gastos comunes',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Mantención',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Limpieza',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Seguridad física',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Electricidad',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Agua',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Embalaje',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Útiles',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Materiales no inventariables',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'EPP (Elementos de Protección Personal)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Flete',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Courier',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Combustible operativo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Peajes',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Almacenaje externo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Software recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Hosting',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Internet y telecomunicaciones',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'POS (Puntos de Venta)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Soporte',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Licencias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Promociones en tienda',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Señalética',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Muestras',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Contabilidad/tributario recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Retainer legal',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Auditorías',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Comisiones bancarias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Seguros operativos',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Costos de líneas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Mermas autorizadas',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Diferencias de caja menores',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Obsolescencia (gasto operativo)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Permisos municipales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Fiscalización',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Certificaciones obligatorias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
] as const;

type SeedPersonGeo = {
  regionCode?: string;
  regionName?: string;
  communeCode?: string;
  communeName?: string;
  treasuryCode?: string;
  activityStarted?: boolean;
  economicActivities?: Array<{
    code: string;
    name: string;
    category: 'PRIMERA' | 'SEGUNDA';
    ivaAffected: boolean;
    isActive: boolean;
  }>;
};

const SEED_PARRAL_GEO: SeedPersonGeo = {
  regionCode: '07',
  regionName: 'Maule',
  communeCode: '07305',
  communeName: 'PARRAL',
  treasuryCode: '164',
  activityStarted: true,
  economicActivities: [
    {
      code: '471100',
      name: 'VENTA AL POR MENOR EN COMERCIOS DE ALIMENTOS, BEBIDAS O TABACO (SUPERMERCADOS E HIPERMERCADOS)',
      category: 'PRIMERA',
      ivaAffected: true,
      isActive: true,
    },
    {
      code: '472101',
      name: 'VENTA AL POR MENOR DE ALIMENTOS EN COMERCIOS ESPECIALIZADOS (ALMACENES PEQUEÑOS Y MINIMARKET)',
      category: 'PRIMERA',
      ivaAffected: true,
      isActive: false,
    },
  ],
};

const SEED_SUPPLIERS: readonly {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  } & SeedPersonGeo;
  supplier: {
    supplierType: SupplierType;
    alias?: string;
    defaultPaymentTermDays: number;
    isActive: boolean;
    notes?: string;
  };
}[] = [
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Comercial Andes SpA',
      businessName: 'Comercial Andes SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.123.456-7',
      email: 'contacto@andes-proveedores.cl',
      phone: '+56 9 6123 4567',
      address: 'Av. Providencia 1234, Santiago',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Andes',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Distribuidor multirubro con despacho nacional.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Textiles del Sur Ltda',
      businessName: 'Textiles del Sur Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '77.234.567-8',
      email: 'ventas@textilessur.cl',
      phone: '+56 41 245 7788',
      address: 'Ruta 5 Sur km 505, Temuco',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      alias: 'TextilSur',
      defaultPaymentTermDays: 45,
      isActive: true,
      notes: 'Fabricante directo; condiciones especiales por volumen.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'María',
      lastName: 'Pérez Soto',
      documentType: DocumentType.RUT,
      documentNumber: '15.876.543-2',
      email: 'maria.perez@servicios.cl',
      phone: '+56 9 9988 7766',
      address: 'Los Canelos 778, Talca',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Servicio local con pago contra entrega.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'John',
      lastName: 'Miller',
      documentType: DocumentType.PASSPORT,
      documentNumber: 'P99887766',
      email: 'john.miller@imports.com',
      phone: '+1 305 555 1122',
      address: '745 Brickell Ave, Miami',
    },
    supplier: {
      supplierType: SupplierType.IMPORTER,
      alias: 'JM Imports',
      defaultPaymentTermDays: 60,
      isActive: true,
      notes: 'Proveedor importado con lead time variable.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Envases Pacifico S.A.',
      businessName: 'Envases Pacifico S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '96.345.678-9',
      email: 'contacto@envasespacifico.cl',
      address: 'Camino a Melipilla 8800, Maipú',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      alias: 'EnvasesPacifico',
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Especialista en packaging y consumibles.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Servicios Tributarios Integrales EIRL',
      businessName: 'Servicios Tributarios Integrales EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.876.543-1',
      email: 'admin@sti.cl',
      phone: '+56 2 2677 8899',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'STI',
      defaultPaymentTermDays: 10,
      isActive: false,
      notes: 'Proveedor inactivo para pruebas de filtro.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Andrea',
      lastName: 'Rojas',
      documentType: DocumentType.OTHER,
      documentNumber: 'PROVAR001',
      phone: '+56 9 4321 1000',
      address: 'Pasaje Las Flores 120',
      ...SEED_PARRAL_GEO,
    },
    supplier: {
      supplierType: SupplierType.CONTRACTOR,
      alias: 'A. Rojas',
      defaultPaymentTermDays: 7,
      isActive: true,
      notes: 'Proveedor demo Parral con geo Chile + ACTECO (una activa).',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Mayorista Central SPA',
      businessName: 'Mayorista Central SPA',
      documentType: DocumentType.RUT,
      documentNumber: '77.987.654-3',
      email: 'compras@mayoristacentral.cl',
      phone: '+56 2 2987 1200',
      address: 'Av. Matta 3400, Santiago',
    },
    supplier: {
      supplierType: SupplierType.WHOLESALER,
      defaultPaymentTermDays: 90,
      isActive: true,
      notes: 'Mayorista con crédito amplio y despacho semanal.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Carlos',
      lastName: 'Gutiérrez',
      documentType: DocumentType.RUT,
      documentNumber: '12.345.678-5',
      email: 'carlos.gutierrez@logistica.cl',
      address: 'Los Aromos 450, Rancagua',
    },
    supplier: {
      supplierType: SupplierType.LOGISTICS,
      alias: 'LogisticaCG',
      defaultPaymentTermDays: 21,
      isActive: true,
      notes: 'Distribución regional zona centro sur.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Tecnologia Retail Hub SpA',
      businessName: 'Tecnologia Retail Hub SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.654.321-0',
      email: 'soporte@retailhub.cl',
      phone: '+56 2 2555 7788',
      address: 'Av. Apoquindo 4800, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'RetailHub',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Proveedor de hardware POS y licenciamiento.',
    },
  },
] as const;

/**
 * Catálogo de clientes demo. Cubre personas naturales y empresas, con
 * distintos días de pago programado y límites de crédito (incluyendo
 * crédito en 0 para pruebas), un cliente inactivo, RUTs y pasaportes.
 */
const SEED_CUSTOMERS: readonly {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  } & SeedPersonGeo;
  customer: {
    creditLimit: number;
    paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
    isActive: boolean;
    notes?: string;
  };
}[] = [
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Sebastián',
      lastName: 'Fuentes Vargas',
      documentType: DocumentType.RUT,
      documentNumber: '16.345.789-2',
      email: 'sebastian.fuentes@gmail.com',
      phone: '+56 9 8123 4567',
      address: 'Calle Los Olivos 234, Parral',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 5,
      isActive: true,
      notes: 'Cliente contado (sin crédito).',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Camila',
      lastName: 'Ríos Soto',
      documentType: DocumentType.RUT,
      documentNumber: '18.999.111-K',
      email: 'camila.rios@hotmail.com',
      phone: '+56 9 7456 1234',
      address: 'Pasaje El Sauce 78, Linares',
    },
    customer: {
      creditLimit: 150000,
      paymentDayOfMonth: 10,
      isActive: true,
      notes: 'Crédito acotado para compras recurrentes.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Restaurante Costanera SpA',
      businessName: 'Restaurante Costanera SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.555.222-K',
      email: 'compras@costaneraresto.cl',
      phone: '+56 73 222 5566',
      address: 'Av. Costanera 1500, Constitución',
    },
    customer: {
      creditLimit: 800000,
      paymentDayOfMonth: 15,
      isActive: true,
      notes: 'Cliente B2B con crédito y pago a 30 días.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Distribuidora Andes Norte Ltda',
      businessName: 'Distribuidora Andes Norte Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '77.888.123-4',
      email: 'pagos@andesnorte.cl',
      phone: '+56 55 245 7700',
      address: 'Av. Argentina 2200, Antofagasta',
    },
    customer: {
      creditLimit: 1500000,
      paymentDayOfMonth: 20,
      isActive: true,
      notes: 'Mayorista regional zona norte.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Patricia',
      lastName: 'Núñez Carrasco',
      documentType: DocumentType.RUT,
      documentNumber: '14.555.222-7',
      email: 'patricia.nunez@correo.cl',
      phone: '+56 9 6321 9988',
      address: 'Los Aromos 220, Talca',
    },
    customer: {
      creditLimit: 300000,
      paymentDayOfMonth: 25,
      isActive: true,
      notes: 'Cliente frecuente con crédito mediano.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Café del Valle SPA',
      businessName: 'Café del Valle SPA',
      documentType: DocumentType.RUT,
      documentNumber: '76.111.789-6',
      email: 'admin@cafedelvalle.cl',
      address: 'Av. Bernardo O\'Higgins 980, Curicó',
    },
    customer: {
      creditLimit: 500000,
      paymentDayOfMonth: 30,
      isActive: true,
      notes: 'Reventa de café; pago fin de mes.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Diego',
      lastName: 'Pérez Lagos',
      documentType: DocumentType.RUT,
      documentNumber: '19.876.543-2',
      email: 'diego.perez@protonmail.com',
      phone: '+56 9 5555 3322',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 5,
      isActive: true,
      notes: 'Cliente contado sin domicilio cargado (campos opcionales).',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Mark',
      lastName: 'Johnson',
      documentType: DocumentType.PASSPORT,
      documentNumber: 'P12345678',
      email: 'mark.johnson@global.com',
      phone: '+1 415 555 0199',
      address: '1 Market St, San Francisco',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 10,
      isActive: true,
      notes: 'Cliente con pasaporte para validar tipo de documento.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Almacenes El Roble EIRL',
      businessName: 'Almacenes El Roble EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.444.999-1',
      email: 'contacto@elroble.cl',
      phone: '+56 71 244 0099',
      address: 'Avenida 21 de Mayo 450, Cauquenes',
    },
    customer: {
      creditLimit: 250000,
      paymentDayOfMonth: 15,
      isActive: false,
      notes: 'Cliente inactivo para pruebas de filtro.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Valentina',
      lastName: 'Sánchez',
      documentType: DocumentType.OTHER,
      documentNumber: 'CUSTVS001',
      phone: '+56 9 4444 1212',
      address: 'Calle Prat 450',
      ...SEED_PARRAL_GEO,
    },
    customer: {
      creditLimit: 100000,
      paymentDayOfMonth: 20,
      isActive: true,
      notes: 'Cliente demo Parral con geo Chile + ACTECO (una activa).',
    },
  },
] as const;

const SEED_EMPLOYEES: readonly {
  person: {
    firstName: string;
    lastName: string;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  employee: {
    employmentType: EmploymentType;
    status: EmployeeStatus;
    hireDate: string;
    baseSalary?: string;
    /** UL demo; por defecto UL00001 (Sala de ventas). */
    laborUnitCode?: string;
  };
}[] = [
  {
    person: {
      firstName: 'Juan',
      lastName: 'Pérez González',
      documentNumber: '17.100.001-7',
      email: 'juan.perez@empleado.local',
      phone: '+56 9 7000 0001',
      address: 'Av. Libertador 100, Santiago',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2022-03-15',
      baseSalary: '850000',
    },
  },
  {
    person: {
      firstName: 'María',
      lastName: 'González Soto',
      documentNumber: '17.100.002-5',
      email: 'maria.gonzalez@empleado.local',
      phone: '+56 9 7000 0002',
      address: 'Calle Los Alerces 45, Providencia',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2021-08-01',
      baseSalary: '920000',
    },
  },
  {
    person: {
      firstName: 'Carlos',
      lastName: 'Ramírez Vega',
      documentNumber: '17.100.003-3',
      email: 'carlos.ramirez@empleado.local',
      phone: '+56 9 7000 0003',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2023-01-10',
      baseSalary: '780000',
    },
  },
  {
    person: {
      firstName: 'Ana',
      lastName: 'Torres Muñoz',
      documentNumber: '17.100.004-1',
      email: 'ana.torres@empleado.local',
      phone: '+56 9 7000 0004',
      address: 'Pasaje El Roble 12, Ñuñoa',
    },
    employee: {
      employmentType: EmploymentType.PART_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2024-06-01',
      baseSalary: '450000',
    },
  },
  {
    person: {
      firstName: 'Luis',
      lastName: 'Silva Contreras',
      documentNumber: '17.100.005-K',
      email: 'luis.silva@empleado.local',
      phone: '+56 9 7000 0005',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2020-11-20',
      baseSalary: '1050000',
    },
  },
  {
    person: {
      firstName: 'Andrea',
      lastName: 'Morales Rojas',
      documentNumber: '17.100.006-8',
      email: 'andrea.morales@empleado.local',
      phone: '+56 9 7000 0006',
      address: 'Av. Irarrázaval 3200, Macul',
    },
    employee: {
      employmentType: EmploymentType.INTERN,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2025-03-01',
      baseSalary: '350000',
    },
  },
  {
    person: {
      firstName: 'Pedro',
      lastName: 'Contreras López',
      documentNumber: '17.100.007-6',
      email: 'pedro.contreras@empleado.local',
      phone: '+56 9 7000 0007',
    },
    employee: {
      employmentType: EmploymentType.CONTRACTOR,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2024-09-15',
      baseSalary: '650000',
    },
  },
  {
    person: {
      firstName: 'Francisca',
      lastName: 'Herrera Díaz',
      documentNumber: '17.100.008-4',
      email: 'francisca.herrera@empleado.local',
      phone: '+56 9 7000 0008',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.SUSPENDED,
      hireDate: '2019-05-01',
      baseSalary: '880000',
    },
  },
  {
    person: {
      firstName: 'Camila',
      lastName: 'Rojas Paredes',
      documentNumber: '17.100.009-2',
      email: 'camila.rojas@empleado.local',
      phone: '+56 9 7000 0009',
      address: 'Av. Providencia 2100, Providencia',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2024-02-01',
      baseSalary: '520000',
      laborUnitCode: 'UL00002',
    },
  },
  {
    person: {
      firstName: 'Diego',
      lastName: 'Muñoz Castillo',
      documentNumber: '17.100.010-6',
      email: 'diego.munoz@empleado.local',
      phone: '+56 9 7000 0010',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2023-07-15',
      baseSalary: '540000',
      laborUnitCode: 'UL00002',
    },
  },
  {
    person: {
      firstName: 'Javiera',
      lastName: 'Soto Ibáñez',
      documentNumber: '17.100.011-4',
      email: 'javiera.soto@empleado.local',
      phone: '+56 9 7000 0011',
      address: 'Calle Merced 88, Santiago Centro',
    },
    employee: {
      employmentType: EmploymentType.PART_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2025-01-20',
      baseSalary: '380000',
      laborUnitCode: 'UL00002',
    },
  },
  {
    person: {
      firstName: 'Sofía',
      lastName: 'Vargas Núñez',
      documentNumber: '17.205.884-3',
      email: 'sofia.vargas@empleado.local',
      phone: '+56 9 7654 3210',
      address: 'Av. Providencia 1200, Providencia',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2023-04-01',
      baseSalary: '520000',
      laborUnitCode: 'UL00001',
    },
  },
  {
    person: {
      firstName: 'Nicolás',
      lastName: 'Bravo Soto',
      documentNumber: '17.100.012-2',
      email: 'nicolas.bravo@empleado.local',
      phone: '+56 9 7000 0012',
      address: 'Calle Estado 450, Santiago Centro',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2024-01-15',
      baseSalary: '500000',
      laborUnitCode: 'UL00001',
    },
  },
  {
    person: {
      firstName: 'Fernanda',
      lastName: 'Lagos Ruiz',
      documentNumber: '17.100.013-0',
      email: 'fernanda.lagos@empleado.local',
      phone: '+56 9 7000 0013',
      address: 'Av. Vicuña Mackenna 890, Ñuñoa',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2024-09-01',
      baseSalary: '480000',
      laborUnitCode: 'UL00001',
    },
  },
  /** Taller textil (UL00003) — exclusivos de producción manufacturada. */
  {
    person: {
      firstName: 'Patricia',
      lastName: 'Navarro Fuentes',
      documentNumber: '17.100.014-9',
      email: 'taller1@textilessur.cl',
      phone: '+56 9 7100 0001',
      address: 'Calle Industria 120, Quilicura',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2023-05-01',
      baseSalary: '650000',
      laborUnitCode: 'UL00003',
    },
  },
  {
    person: {
      firstName: 'Rodrigo',
      lastName: 'Pizarro Campos',
      documentNumber: '17.100.015-7',
      email: 'taller2@textilessur.cl',
      phone: '+56 9 7100 0002',
      address: 'Av. Américo Vespucio 4500, Quilicura',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2023-08-15',
      baseSalary: '620000',
      laborUnitCode: 'UL00003',
    },
  },
  {
    person: {
      firstName: 'Valentina',
      lastName: 'Cáceres Molina',
      documentNumber: '17.100.016-5',
      email: 'taller3@textilessur.cl',
      phone: '+56 9 7100 0003',
      address: 'Pasaje Taller 8, Renca',
    },
    employee: {
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2022-11-01',
      baseSalary: '780000',
      laborUnitCode: 'UL00003',
    },
  },
] as const;

/** Comisión AFP (puntos %), catálogo Chile seed. */
const SEED_AFP_FUNDS: readonly {
  code: string;
  name: string;
  contributionPercent: string;
}[] = [
  { code: 'AFP00001', name: 'AFP Uno', contributionPercent: '0.46' },
  { code: 'AFP00002', name: 'AFP Modelo', contributionPercent: '0.58' },
  { code: 'AFP00003', name: 'AFP PlanVital', contributionPercent: '1.16' },
  { code: 'AFP00004', name: 'AFP Habitat', contributionPercent: '1.27' },
  { code: 'AFP00005', name: 'AFP Capital', contributionPercent: '1.44' },
  { code: 'AFP00006', name: 'AFP Cuprum', contributionPercent: '1.44' },
  { code: 'AFP00007', name: 'AFP Provida', contributionPercent: '1.45' },
] as const;

const SEED_JOB_POSITIONS: readonly {
  code: string;
  name: string;
  description: string;
  defaultDuties: string;
  sortOrder: number;
}[] = [
  {
    code: 'JP00001',
    name: 'Cajero',
    description: 'Atención de caja y cobros en sala de ventas.',
    defaultDuties:
      'Cobrar ventas, cuadrar caja, emitir boletas y apoyar cierre de turno.',
    sortOrder: 10,
  },
  {
    code: 'JP00002',
    name: 'Vendedor de piso',
    description: 'Atención y asesoría a clientes en sala.',
    defaultDuties:
      'Atender clientes, recomendar productos, reponer góndolas y apoyar inventario.',
    sortOrder: 20,
  },
  {
    code: 'JP00003',
    name: 'Supervisor de sala',
    description: 'Coordinación del equipo de piso y caja.',
    defaultDuties:
      'Supervisar turnos, resolver incidencias de sala y apoyar al jefe de local.',
    sortOrder: 30,
  },
  {
    code: 'JP00004',
    name: 'Jefe de local',
    description: 'Responsable operativo de la sucursal.',
    defaultDuties:
      'Planificar turnos, metas de venta, control de caja y coordinación con bodega.',
    sortOrder: 40,
  },
  {
    code: 'JP00005',
    name: 'Encargado de bodega',
    description: 'Recepción, almacenamiento y despacho de mercadería.',
    defaultDuties:
      'Recibir mercadería, controlar stock, preparar transferencias y conteos cíclicos.',
    sortOrder: 50,
  },
  {
    code: 'JP00006',
    name: 'Asistente administrativo',
    description: 'Apoyo administrativo y documental de la operación.',
    defaultDuties:
      'Gestionar documentación, apoyo a RR.HH. y seguimiento de trámites internos.',
    sortOrder: 60,
  },
  {
    code: 'JP00007',
    name: 'Contador',
    description: 'Contabilidad y reportes financieros de la empresa.',
    defaultDuties:
      'Llevar contabilidad, liquidaciones y reportes tributarios/financieros.',
    sortOrder: 70,
  },
  {
    code: 'JP00008',
    name: 'Gerente general',
    description: 'Dirección general del negocio.',
    defaultDuties:
      'Definir estrategia, supervisión de jefaturas y resultados de la empresa.',
    sortOrder: 80,
  },
  {
    code: 'JP00009',
    name: 'Mesero',
    description: 'Atención de mesas y servicio en salón restaurante.',
    defaultDuties:
      'Atender mesas, tomar pedidos, entregar platos y coordinar con cocina y caja.',
    sortOrder: 25,
  },
  {
    code: 'JP00010',
    name: 'Costurera',
    description: 'Confección y acabado en taller textil.',
    defaultDuties:
      'Coser prendas, remates, control de calidad de costura y apoyo a lotes de producción.',
    sortOrder: 90,
  },
  {
    code: 'JP00011',
    name: 'Operario de corte',
    description: 'Corte de tela e insumos textiles.',
    defaultDuties:
      'Cortar tela según patrón, preparar kits de insumos y alimentar línea de confección.',
    sortOrder: 91,
  },
  {
    code: 'JP00012',
    name: 'Supervisora de taller',
    description: 'Coordinación del taller textil y lotes de producción.',
    defaultDuties:
      'Planificar lotes, asignar trabajo, controlar avance y calidad del taller.',
    sortOrder: 92,
  },
] as const;

/** Catálogo base de sistemas de jornada (M3). Códigos alineados con migración HcmShiftSystems. */
const SEED_SHIFT_SYSTEMS: readonly {
  code: string;
  name: string;
  type: ShiftSystemType;
  requiresPlannerAssignment: boolean;
  generatesLateEvents: boolean;
  overtimeEnabled: boolean;
  cycleConfigJson?: { daysOn: number; daysOff: number } | null;
}[] = [
  {
    code: 'SS00001',
    name: 'Jornada fija',
    type: ShiftSystemType.FIXED,
    requiresPlannerAssignment: false,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  {
    code: 'SS00002',
    name: 'Rotativo',
    type: ShiftSystemType.ROTATING,
    requiresPlannerAssignment: true,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  {
    code: 'SS00003',
    name: 'Flexible con banda',
    type: ShiftSystemType.FLEXIBLE,
    requiresPlannerAssignment: false,
    generatesLateEvents: true,
    overtimeEnabled: true,
  },
  {
    code: 'SS00004',
    name: 'Flexible sin banda',
    type: ShiftSystemType.FLEXIBLE,
    requiresPlannerAssignment: false,
    generatesLateEvents: false,
    overtimeEnabled: true,
  },
  {
    code: 'SS00005',
    name: 'Sin control Art. 22',
    type: ShiftSystemType.FREE,
    requiresPlannerAssignment: false,
    generatesLateEvents: false,
    overtimeEnabled: false,
  },
  {
    code: 'SS00006',
    name: 'Excepcional DT',
    type: ShiftSystemType.EXCEPTIONAL,
    requiresPlannerAssignment: true,
    generatesLateEvents: true,
    overtimeEnabled: true,
    cycleConfigJson: { daysOn: 4, daysOff: 4 },
  },
] as const;

/** Catálogo Isapres (M1). Códigos alineados con migración HcmContractWeeklyHoursIsapre. */
const SEED_ISAPRES: readonly {
  code: string;
  externalCode: string;
  name: string;
  website: string;
  phone: string;
}[] = [
  {
    code: 'ISA00001',
    externalCode: '99',
    name: 'Banmédica S.A.',
    website: 'www.banmedica.cl',
    phone: '600 600 3600',
  },
  {
    code: 'ISA00002',
    externalCode: '63',
    name: 'Isalud Ltda.',
    website: 'https://www.isapredecodelco.cl',
    phone: '6003 800 331',
  },
  {
    code: 'ISA00003',
    externalCode: '67',
    name: 'Colmena Golden Cross S.A.',
    website: 'www.colmena.cl',
    phone: '800 633 444',
  },
  {
    code: 'ISA00004',
    externalCode: '107',
    name: 'Consalud S.A.',
    website: 'www.consalud.cl',
    phone: '600 500 9000',
  },
  {
    code: 'ISA00005',
    externalCode: '78',
    name: 'Cruz Blanca S.A.',
    website: 'www.cruzblanca.cl',
    phone: '600 818 0000',
  },
  {
    code: 'ISA00006',
    externalCode: '94',
    name: 'Cruz del Norte Ltda.',
    website: 'www.isaprecruzdelnorte.cl',
    phone: '97 799365',
  },
  {
    code: 'ISA00007',
    externalCode: '81',
    name: 'Nueva Masvida S.A.',
    website: 'www.nuevamasvida.cl',
    phone: '600 600 262',
  },
  {
    code: 'ISA00008',
    externalCode: '76',
    name: 'Fundación Ltda.',
    website: 'www.isaprefundacion.cl',
    phone: '22 347 9000',
  },
  {
    code: 'ISA00009',
    externalCode: '80',
    name: 'Vida Tres S.A.',
    website: 'www.vidatres.cl',
    phone: '600 600 3535',
  },
  {
    code: 'ISA00010',
    externalCode: '108',
    name: 'Esencial S.A.',
    website: 'www.somosesencial.cl',
    phone: '600 0880 090',
  },
] as const;

type SeedWeekSchedule = Record<string, { start: string; end: string } | null>;

function seedWeekdaySchedule(
  start: string,
  end: string,
  days: readonly number[] = [0, 1, 2, 3, 4],
): SeedWeekSchedule {
  const schedule: SeedWeekSchedule = {};
  for (let i = 0; i < 7; i++) {
    schedule[String(i)] = days.includes(i) ? { start, end } : null;
  }
  return schedule;
}

/** Turnos UL demo (M2) para Sala de ventas y Salón restaurante. */
const SEED_LABOR_UNIT_SHIFTS: readonly {
  code: string;
  name: string;
  laborUnitCode?: string;
  scheduleJson: SeedWeekSchedule;
  effectiveFrom: string;
  memberDocumentNumbers: readonly string[];
}[] = [
  {
    code: 'ULS00001',
    name: 'Sala mañana',
    scheduleJson: seedWeekdaySchedule('09:00', '14:00'),
    effectiveFrom: '2025-01-01',
    memberDocumentNumbers: [
      '17.100.001-7',
      '17.100.002-5',
      '17.100.004-1',
      '17.100.006-8',
    ],
  },
  {
    code: 'ULS00002',
    name: 'Sala tarde',
    scheduleJson: seedWeekdaySchedule('14:00', '22:00', [0, 1, 2, 3, 4, 5]),
    effectiveFrom: '2025-01-01',
    memberDocumentNumbers: ['17.100.003-3', '17.100.005-K'],
  },
  {
    code: 'ULS00003',
    name: 'Salón almuerzo',
    laborUnitCode: 'UL00002',
    scheduleJson: seedWeekdaySchedule('11:00', '15:00'),
    effectiveFrom: '2025-01-01',
    memberDocumentNumbers: ['17.100.009-2', '17.100.010-6'],
  },
  {
    code: 'ULS00004',
    name: 'Salón cena',
    laborUnitCode: 'UL00002',
    scheduleJson: seedWeekdaySchedule('18:00', '23:00', [0, 1, 2, 3, 4, 5]),
    effectiveFrom: '2025-01-01',
    memberDocumentNumbers: ['17.100.010-6', '17.100.011-4'],
  },
] as const;

type SeedEmployeeContractDef =
  | {
      kind: EmploymentContractKind.LABOR;
      laborType: EmploymentLaborType;
      workRegime: WorkRegime;
      weeklyHours: string;
      extraHoursMode: ExtraHoursMode;
      shiftSystemCode: string;
      jobPositionCode: string;
      afpCode: string;
      healthSystem: 'FONASA' | 'ISAPRE';
      isapreCode?: string;
      healthContributionMode?: HealthContributionMode;
      healthContributionValue?: string;
      mutualName: string;
      tipsEligible?: boolean;
      flexibleMode?: FlexibleMode;
      fixedScheduleJson?: SeedWeekSchedule;
      flexibleBandJson?: Record<
        string,
        {
          earliestStart: string;
          latestStart: string;
          earliestEnd: string;
          latestEnd: string;
        } | null
      >;
      art22Exempt?: boolean;
      exceptionalResolutionRef?: string | null;
      endDate?: string | null;
      /** Comisión % sobre ventas netas POS (solo PERCENT). */
      salesCommissionPercent?: string;
    }
  | {
      kind: EmploymentContractKind.FEE;
      jobPositionCode?: string;
      notes?: string;
    };

/** Contratos ACTIVE por RUT (M1 + M3). Idempotente: actualiza el ACTIVE existente. */
const SEED_EMPLOYEE_CONTRACTS: Record<string, SeedEmployeeContractDef> = {
  '17.100.001-7': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00001',
    afpCode: 'AFP00004',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  '17.100.002-5': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00001',
    jobPositionCode: 'JP00002',
    afpCode: 'AFP00002',
    healthSystem: 'ISAPRE',
    isapreCode: 'ISA00001',
    healthContributionMode: HealthContributionMode.PERCENT,
    healthContributionValue: '7',
    mutualName: 'ACHS',
    tipsEligible: true,
    fixedScheduleJson: seedWeekdaySchedule('09:00', '18:00'),
  },
  '17.100.003-3': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.BOTH,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00002',
    afpCode: 'AFP00001',
    healthSystem: 'ISAPRE',
    isapreCode: 'ISA00003',
    healthContributionMode: HealthContributionMode.PERCENT,
    healthContributionValue: '7',
    mutualName: 'Mutual de Seguridad',
    tipsEligible: true,
  },
  '17.100.004-1': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.PART_TIME,
    workRegime: WorkRegime.PARTIAL,
    weeklyHours: '30',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00001',
    afpCode: 'AFP00003',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  '17.100.005-K': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.COMPENSATORY_REST,
    shiftSystemCode: 'SS00003',
    jobPositionCode: 'JP00003',
    afpCode: 'AFP00005',
    healthSystem: 'ISAPRE',
    isapreCode: 'ISA00005',
    healthContributionMode: HealthContributionMode.PERCENT,
    healthContributionValue: '7',
    mutualName: 'ACHS',
    flexibleMode: FlexibleMode.BAND,
    flexibleBandJson: (() => {
      const band = {
        earliestStart: '08:00',
        latestStart: '10:00',
        earliestEnd: '17:00',
        latestEnd: '19:00',
      };
      const json: Record<string, typeof band | null> = {};
      for (let i = 0; i < 7; i++) {
        json[String(i)] = i < 5 ? band : null;
      }
      return json;
    })(),
  },
  '17.100.006-8': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.FIXED_TERM,
    workRegime: WorkRegime.PARTIAL,
    weeklyHours: '30',
    extraHoursMode: ExtraHoursMode.NONE,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00006',
    afpCode: 'AFP00002',
    healthSystem: 'FONASA',
    mutualName: 'ISL',
    endDate: '2026-12-31',
  },
  '17.100.007-6': {
    kind: EmploymentContractKind.FEE,
    jobPositionCode: 'JP00006',
    notes: 'Honorarios demo (sin AFP / Isapre / jornada laboral).',
  },
  '17.100.008-4': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00002',
    afpCode: 'AFP00007',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
  },
  '17.100.009-2': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00009',
    afpCode: 'AFP00004',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  '17.100.010-6': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00009',
    afpCode: 'AFP00001',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  '17.100.011-4': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.PART_TIME,
    workRegime: WorkRegime.PARTIAL,
    weeklyHours: '30',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00009',
    afpCode: 'AFP00003',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  /** Sofía / operador — comisión % ventas POS (demo HCM Comisiones). */
  '17.205.884-3': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00001',
    afpCode: 'AFP00004',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
    salesCommissionPercent: '3',
  },
  /** Nicolás / operador2 — comisión % (distinta para QA). */
  '17.100.012-2': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00002',
    jobPositionCode: 'JP00001',
    afpCode: 'AFP00002',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
    salesCommissionPercent: '2.5',
  },
  /** Fernanda / operador3 — sin comisión (contraste en cards/ficha). */
  '17.100.013-0': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00001',
    jobPositionCode: 'JP00001',
    afpCode: 'AFP00001',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
    tipsEligible: true,
  },
  /** Patricia / costurera — taller textil. */
  '17.100.014-9': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00001',
    jobPositionCode: 'JP00010',
    afpCode: 'AFP00004',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
  },
  /** Rodrigo / operario de corte — taller textil. */
  '17.100.015-7': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00001',
    jobPositionCode: 'JP00011',
    afpCode: 'AFP00002',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
  },
  /** Valentina / supervisora de taller — taller textil. */
  '17.100.016-5': {
    kind: EmploymentContractKind.LABOR,
    laborType: EmploymentLaborType.INDEFINITE,
    workRegime: WorkRegime.ORDINARY,
    weeklyHours: '45',
    extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
    shiftSystemCode: 'SS00001',
    jobPositionCode: 'JP00012',
    afpCode: 'AFP00001',
    healthSystem: 'FONASA',
    mutualName: 'ACHS',
  },
};

async function bootstrap() {
  // Evita que el due-worker de tips quede con interval durante el seed.
  if (
    process.env.TIP_DUE_WORKER_INTERVAL_MS == null ||
    String(process.env.TIP_DUE_WORKER_INTERVAL_MS).trim() === ''
  ) {
    process.env.TIP_DUE_WORKER_INTERVAL_MS = '0';
  }

  const app = await NestFactory.createApplicationContext(SeedOperationalModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(AppConfigService);

    await cleanSeedMultimediaStorage({ app, configService });

    // Ensure new tables exist even if DB_SYNCHRONIZE is off.
    await runSeedBootstrapGuards(dataSource);

    const personRepo = dataSource.getRepository(Person);
    const companyRepo = dataSource.getRepository(Company);
    const taxRepo = dataSource.getRepository(Tax);
    const branchRepo = dataSource.getRepository(Branch);
    const unitRepo = dataSource.getRepository(Unit);
    const categoryRepo = dataSource.getRepository(Category);
    const attributeRepo = dataSource.getRepository(Attribute);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const cashHubRepo = dataSource.getRepository(CashHub);
    const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
    const supplierRepo = dataSource.getRepository(Supplier);
    const customerRepo = dataSource.getRepository(Customer);
    const employeeRepo = dataSource.getRepository(Employee);
    const shareholderRepo = dataSource.getRepository(Shareholder);
    const accountingAccountRepo = dataSource.getRepository(AccountingAccount);
    const accountingRuleRepo = dataSource.getRepository(AccountingRule);
    const accountingRuleLineRepo = dataSource.getRepository(AccountingRuleLine);
    const automationRuleRepo = dataSource.getRepository(AutomationRule);
    const automationActionRepo = dataSource.getRepository(AutomationAction);
    const userRepo = dataSource.getRepository(User);
    const membershipRepo = dataSource.getRepository(UserCompanyMembership);
    const membershipRoleRepo = dataSource.getRepository(UserCompanyRole);
    const userCompanyPersonRepo = dataSource.getRepository(UserCompanyPerson);

    const foodMode = isKaiFoodSeedMode();
    if (foodMode) {
      console.log(
        '🍽️  Seed modo KaiFood: catálogo gastronómico (sin textil/manufacturados/lavandería)',
      );
    }

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@kai.local';
    const companyDefaults = foodMode ? SEED_DEV_COMPANY_SECOND : SEED_DEV_COMPANY;
    const razonSocial =
      process.env.SEED_COMPANY_RAZON_SOCIAL || companyDefaults.razonSocial;
    const nombreFantasia =
      process.env.SEED_NOMBRE_FANTASIA || companyDefaults.nombreFantasia;
    const businessActivity =
      process.env.SEED_BUSINESS_ACTIVITY || companyDefaults.businessActivity;
    const rut = process.env.SEED_COMPANY_RUT || SEED_DEV_COMPANY.rut;
    const companyAddress =
      process.env.SEED_COMPANY_ADDRESS ||
      (foodMode ? SEED_DEV_COMPANY_SECOND.address : SEED_DEV_COMPANY.address);
    const companyMail =
      process.env.SEED_COMPANY_MAIL ||
      (foodMode ? SEED_DEV_COMPANY_SECOND.mail : SEED_DEV_COMPANY.mail);
    const companyPhone =
      process.env.SEED_COMPANY_PHONE ||
      (foodMode ? SEED_DEV_COMPANY_SECOND.phone : SEED_DEV_COMPANY.phone);
    const companyKaiProduct = foodMode
      ? SEED_DEV_COMPANY_SECOND.kaiProduct
      : SEED_DEV_COMPANY.kaiProduct;

    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    let company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });
    if (!company) {
      company = companyRepo.create({
        razonSocial,
        nombreFantasia,
        businessActivity,
        rut,
        address: companyAddress,
        mail: companyMail,
        phone: companyPhone,
        commune: SEED_DEV_COMPANY.commune,
        city: SEED_DEV_COMPANY.city,
        siiResolutionNumber: SEED_DEV_COMPANY.siiResolutionNumber,
        siiResolutionDate: SEED_DEV_COMPANY.siiResolutionDate,
        defaultCurrency: SEED_DEV_COMPANY.defaultCurrency,
        kaiProduct: companyKaiProduct,
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(
        `✅ Empresa creada: id=${company.id} razonSocial='${razonSocial}' rut='${rut}' kaiProduct=${company.kaiProduct}`,
      );
    } else {
      company.razonSocial = razonSocial;
      company.nombreFantasia = nombreFantasia;
      company.businessActivity = businessActivity;
      company.address = companyAddress;
      company.mail = companyMail;
      company.phone = companyPhone;
      company.commune = SEED_DEV_COMPANY.commune;
      company.city = SEED_DEV_COMPANY.city;
      company.siiResolutionNumber = SEED_DEV_COMPANY.siiResolutionNumber;
      company.siiResolutionDate = SEED_DEV_COMPANY.siiResolutionDate;
      company.kaiProduct = companyKaiProduct;
      await companyRepo.save(company);
      console.log(
        `✅ Empresa ya existía: id=${company.id} razonSocial='${company.razonSocial}' rut='${company.rut}' kaiProduct=${company.kaiProduct} (datos básicos actualizados)`,
      );
    }

    const seedBankRows = buildSeedCompanyBankAccounts(company.razonSocial);
    const byKey = new Map(
      (company.bankAccounts ?? []).map((a) => [
        a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
        a,
      ] as const),
    );
    for (const row of seedBankRows) {
      byKey.set(row.accountKey!, row);
    }
    company.bankAccounts = Array.from(byKey.values());
    await companyRepo.save(company);
    console.log(
      `✅ Cuentas bancarias ejemplo sincronizadas (${seedBankRows.length}) companyId=${company.id}`,
    );

  /** Settings de empresa: medios de pago, cheques, cotizaciones y crédito interno. */
    const seedCompanyPaymentCatalog = buildSeedCompanyPaymentCatalog();
    company.settings = buildSeedCompanySettings(
      company.settings as Record<string, unknown> | undefined,
      seedCompanyPaymentCatalog,
    );
    const syncedSettings = company.settings as Record<string, unknown>;
    const eShopSlug =
      typeof syncedSettings.eShopPublicSlug === 'string'
        ? syncedSettings.eShopPublicSlug
        : 'demo';
    syncedSettings.publicContact = buildSeedEshopPublicContact(
      eShopSlug,
      company.mail ?? SEED_DEV_COMPANY.mail,
      company.phone ?? SEED_DEV_COMPANY.phone,
    );
    if (foodMode) {
      syncedSettings.tips = sanitizeCompanyTipSettings({
        enabled: true,
        suggestPercent: 10,
        allowCustomAmount: true,
        allowCashTips: true,
        distributionMode: 'DIRECT',
        distributionWeights: {},
      });
    }
    company.settings = syncedSettings;
    await companyRepo.save(company);
    console.log(
      `✅ Settings empresa sincronizados: medios (${seedCompanyPaymentCatalog
        .map((c) => c.method)
        .join(', ')}), cotizaciones 10/20 días, cheques ON, crédito interno ON, preventa ON${
        foodMode ? ', tips ON (DIRECT 10%)' : ''
      }`,
    );

    const paymentCatalog = app.get(CompanyPaymentCatalogService);
    const syncedCompanyPaymentMethods =
      await paymentCatalog.replacePaymentMethods(
        company.id,
        seedCompanyPaymentCatalog,
      );
    console.log(
      `✅ Catálogo company_payment_methods sincronizado (${syncedCompanyPaymentMethods.length} medios; fee tarjetas crédito 2.5% / débito 1.5%)`,
    );
    const mp = syncedSettings.mercadoPago as
      | { enabled?: boolean; environment?: string; eshopOnlinePaymentEnabled?: boolean }
      | undefined;
    console.log(
      `✅ Mercado Pago seed: enabled=${mp?.enabled ?? false} env=${mp?.environment ?? '—'} eshopOnline=${mp?.eshopOnlinePaymentEnabled ?? false}`,
    );
    const publicContact = syncedSettings.publicContact as {
      email?: string;
      phone?: string;
      instagram?: string;
      tiktok?: string;
      facebook?: string;
    };
    console.log(
      `✅ Contacto público eShop: email=${publicContact.email ?? '—'} phone=${publicContact.phone ?? '—'} instagram=${publicContact.instagram ?? '—'} tiktok=${publicContact.tiktok ?? '—'} facebook=${publicContact.facebook ?? '—'}`,
    );

    /** Segunda empresa (KaiFood) para switch multi-vertical en deploys suite. */
    let companyFood = await companyRepo.findOne({
      where: { rut: SEED_DEV_COMPANY_SECOND.rut, deletedAt: null as never },
    });
    if (!companyFood) {
      companyFood = companyRepo.create({
        razonSocial: SEED_DEV_COMPANY_SECOND.razonSocial,
        nombreFantasia: SEED_DEV_COMPANY_SECOND.nombreFantasia,
        businessActivity: SEED_DEV_COMPANY_SECOND.businessActivity,
        rut: SEED_DEV_COMPANY_SECOND.rut,
        address: SEED_DEV_COMPANY_SECOND.address,
        mail: SEED_DEV_COMPANY_SECOND.mail,
        phone: SEED_DEV_COMPANY_SECOND.phone,
        defaultCurrency: SEED_DEV_COMPANY_SECOND.defaultCurrency,
        kaiProduct: SEED_DEV_COMPANY_SECOND.kaiProduct,
        isActive: true,
      });
    } else {
      companyFood.razonSocial = SEED_DEV_COMPANY_SECOND.razonSocial;
      companyFood.nombreFantasia = SEED_DEV_COMPANY_SECOND.nombreFantasia;
      companyFood.businessActivity = SEED_DEV_COMPANY_SECOND.businessActivity;
      companyFood.address = SEED_DEV_COMPANY_SECOND.address;
      companyFood.mail = SEED_DEV_COMPANY_SECOND.mail;
      companyFood.phone = SEED_DEV_COMPANY_SECOND.phone;
      companyFood.kaiProduct = SEED_DEV_COMPANY_SECOND.kaiProduct;
      companyFood.isActive = true;
    }
    await companyRepo.save(companyFood);
    console.log(
      `✅ Empresa secundaria: id=${companyFood.id} «${companyFood.nombreFantasia}» kaiProduct=${companyFood.kaiProduct}`,
    );

    /**
     * A partir de aquí, todo el resto del seed se ejecuta dentro del
     * `TenantContext` de la empresa creada. Esto activa el
     * `TenantSubscriber` (registrado en typeorm.config.ts), que
     * autopopula `companyId` en cualquier INSERT de entidades
     * multi-empresa que no lo provean explícitamente. Sin esto, las
     * tablas con `company_id NOT NULL` (storages, products,
     * categories, units, attributes, persons, suppliers, etc.) fallan
     * porque el seed corre fuera del request scope.
     */
    await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {

    const seedStorage = resolveSeedMultimediaStorage(app, configService);
    if (!seedStorage.seedImages) {
      console.log('⏭️  SEED_SKIP_IMAGES=true — logo y multimedia omitidos');
    }

    if (seedStorage.seedImages) {
      try {
        const logoAsset = await seedMultimediaFileLink({
          assetRepo: dataSource.getRepository(MultimediaAsset),
          linkRepo: dataSource.getRepository(MultimediaLink),
          storage: seedStorage.storage,
          storageProvider: seedStorage.storageProvider,
          ingest: seedStorage.ingest,
          sourceRelativePath: SEED_COMPANY_LOGO_FILE,
          entityType: 'company',
          entityId: company.id,
          usageType: 'default',
          isPrimary: true,
        });
        console.log(
          `✅ Logo empresa seed enlazado (companyId=${company.id}, url=${logoAsset.publicUrl})`,
        );
      } catch (err) {
        console.warn(
          `⚠️  Logo empresa seed omitido: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    let ivaTax = await taxRepo.findOne({
      where: {
        companyId: company.id,
        name: 'IVA',
        taxType: TaxType.IVA,
      },
    });
    if (!ivaTax) {
      ivaTax = taxRepo.create({
        companyId: company.id,
        name: 'IVA',
        code: null,
        taxType: TaxType.IVA,
        rate: 19,
        description: SEED_IVA_DESCRIPTION,
        isDefault: false,
        isActive: true,
        nonDeletable: true,
      });
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo creado: IVA 19% id=${ivaTax.id} companyId=${company.id}`,
      );
    } else {
      ivaTax.code = null;
      ivaTax.rate = 19;
      ivaTax.description = SEED_IVA_DESCRIPTION;
      ivaTax.isDefault = false;
      ivaTax.isActive = true;
      ivaTax.taxType = TaxType.IVA;
      ivaTax.nonDeletable = true;
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo IVA ya existía: id=${ivaTax.id} (sincronizado con seed)`,
      );
    }

    let honorariumRetentionTax = await taxRepo.findOne({
      where: {
        companyId: company.id,
        name: SEED_HONORARIUM_RETENTION_NAME,
        taxType: TaxType.RETENTION,
      },
    });
    if (!honorariumRetentionTax) {
      honorariumRetentionTax = taxRepo.create({
        companyId: company.id,
        name: SEED_HONORARIUM_RETENTION_NAME,
        code: null,
        taxType: TaxType.RETENTION,
        rate: 15.25,
        description: SEED_HONORARIUM_RETENTION_DESCRIPTION,
        isDefault: false,
        isActive: true,
        nonDeletable: true,
      });
      await taxRepo.save(honorariumRetentionTax);
      console.log(
        `✅ Impuesto ejemplo creado: ${SEED_HONORARIUM_RETENTION_NAME} 15,25% id=${honorariumRetentionTax.id} companyId=${company.id}`,
      );
    } else {
      honorariumRetentionTax.code = null;
      honorariumRetentionTax.rate = 15.25;
      honorariumRetentionTax.description = SEED_HONORARIUM_RETENTION_DESCRIPTION;
      honorariumRetentionTax.isDefault = false;
      honorariumRetentionTax.isActive = true;
      honorariumRetentionTax.taxType = TaxType.RETENTION;
      honorariumRetentionTax.nonDeletable = true;
      await taxRepo.save(honorariumRetentionTax);
      console.log(
        `✅ Impuesto ejemplo ${SEED_HONORARIUM_RETENTION_NAME} ya existía: id=${honorariumRetentionTax.id} (sincronizado con seed)`,
      );
    }

    for (const def of SEED_SPECIFIC_TAXES) {
      let specificTax = await taxRepo.findOne({
        where: { companyId: company.id, code: def.code, taxType: TaxType.SPECIFIC },
      });
      if (!specificTax) {
        specificTax = taxRepo.create({
          companyId: company.id,
          name: def.name,
          code: def.code,
          taxType: TaxType.SPECIFIC,
          rate: def.rate,
          description: def.description,
          isDefault: false,
          isActive: def.isActive,
          nonDeletable: true,
        });
        await taxRepo.save(specificTax);
        console.log(
          `✅ Impuesto SPECIFIC creado: ${def.name} (${def.rate}%) code=${def.code} active=${def.isActive} id=${specificTax.id}`,
        );
      } else {
        specificTax.name = def.name;
        specificTax.rate = def.rate;
        specificTax.description = def.description;
        specificTax.isDefault = false;
        specificTax.isActive = def.isActive;
        specificTax.taxType = TaxType.SPECIFIC;
        specificTax.nonDeletable = true;
        await taxRepo.save(specificTax);
        console.log(
          `✅ Impuesto SPECIFIC sincronizado: ${def.name} code=${def.code} active=${def.isActive} id=${specificTax.id}`,
        );
      }
    }

    // ---------------------------------------------------------------------
    // Accounting accounts (plan de cuentas mínimo)
    // ---------------------------------------------------------------------
    const existingAccounts = await accountingAccountRepo.find({
      where: { companyId: company.id },
      order: { code: 'ASC' },
    });
    const byCode = new Map(existingAccounts.map((a) => [a.code, a]));

    // First pass: create/update roots and all accounts with parentCode resolved later.
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      const prev = byCode.get(item.code);
      const row = prev
        ? Object.assign(prev, {
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            isActive: item.isActive ?? true,
          })
        : accountingAccountRepo.create({
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            parentId: null,
            isActive: item.isActive ?? true,
          });
      const saved = await accountingAccountRepo.save(row);
      byCode.set(saved.code, saved);
    }

    // Second pass: set parentId for those that have parentCode
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      if (!item.parentCode) continue;
      const child = byCode.get(item.code);
      const parent = byCode.get(item.parentCode);
      if (!child || !parent) continue;
      const needsUpdate = (child.parentId ?? null) !== parent.id;
      if (needsUpdate) {
        child.parentId = parent.id;
        await accountingAccountRepo.save(child);
      }
    }

    console.log(
      `✅ Plan de cuentas mínimo sincronizado: companyId=${company.id} total=${SEED_ACCOUNTING_ACCOUNTS.length}`,
    );

    // ---------------------------------------------------------------------
    // Accounting rules (reglas mínimas por evento)
    // ---------------------------------------------------------------------
    const deleteRulesResult = await accountingRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AccountingRule)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Reglas contables eliminadas para companyId=${company.id}: ${deleteRulesResult.affected ?? 0}`,
    );

    const acc = (code: string) => {
      const a = byCode.get(code);
      if (!a) {
        throw new Error(`Seed contable: falta cuenta code=${code}`);
      }
      return a.id;
    };

    const seedRules: Array<Partial<AccountingRule>> = [
      // Ventas: Caja/Banco (debe) contra Ventas (haber). Genérica (sin paymentMethod).
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SALE' as any,
        debitAccountId: acc('1101'),
        creditAccountId: acc('4101'),
        priority: 0,
        isActive: true,
      },
      // Cobro a cliente: Banco (debe) contra Clientes (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PAYMENT_IN' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('1201'),
        priority: 0,
        isActive: true,
      },
      // Compra: Costo mercaderías (debe) contra Proveedores (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PURCHASE' as any,
        debitAccountId: acc('5101'),
        creditAccountId: acc('2101'),
        priority: 0,
        isActive: true,
      },
      // Pago a proveedor: Proveedores (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SUPPLIER_PAYMENT' as any,
        debitAccountId: acc('2101'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'OPERATING_EXPENSE' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Pago gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'EXPENSE_PAYMENT' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 10,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CAPITAL_CONTRIBUTION' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('3101'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'BANK_WITHDRAWAL_TO_SHAREHOLDER' as any,
        debitAccountId: acc('3101'),
        creditAccountId: acc('1102'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_DEPOSIT' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('1101'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_WITHDRAWAL_TO_PETTY_CASH' as any,
        debitAccountId: acc('1101'),
        creditAccountId: acc('1102'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'BANK_TO_CASH_TRANSFER' as any,
        debitAccountId: acc('1110'),
        creditAccountId: acc('1102'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_SESSION_TO_HUB_TRANSFER' as any,
        debitAccountId: acc('1110'),
        creditAccountId: acc('1101'),
        priority: 6,
        isActive: true,
      },
    ];

    for (const r of seedRules) {
      const row = accountingRuleRepo.create(r as any);
      const savedRule = (await accountingRuleRepo.save(
        row as any,
      )) as unknown as AccountingRule;
      // Crear líneas por defecto equivalentes al par débito/crédito.
      // Se setea `companyId` explícitamente porque la columna es NOT NULL
      // en multi-empresa y la entity no tiene default.
      const lines = [
        {
          companyId: company.id,
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.DEBIT,
          accountId: (r.debitAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 0,
          isActive: true,
        },
        {
          companyId: company.id,
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.CREDIT,
          accountId: (r.creditAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 1,
          isActive: true,
        },
      ];
      for (const l of lines) {
        await accountingRuleLineRepo.save(accountingRuleLineRepo.create(l as any));
      }
      console.log(
        `✅ Regla contable creada: type=${String(r.transactionType)} scope=${String(r.appliesTo)} priority=${r.priority} id=${savedRule.id}`,
      );
    }

    // ---------------------------------------------------------------------
    // Automation rules (transaction events -> actions)
    // ---------------------------------------------------------------------
    await automationActionRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationAction)
      .where(`"ruleId" IN (SELECT id FROM automation_rules WHERE "companyId" = :companyId)`, {
        companyId: company.id,
      })
      .execute();
    await automationRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationRule)
      .where(`"companyId" = :companyId`, { companyId: company.id })
      .execute();

    const createAutomationRule = async (row: {
      eventType: AutomationEventType;
      filters?: Record<string, any> | null;
      priority?: number;
      isActive?: boolean;
      actions: Array<{
        type: AutomationActionType;
        sortOrder: number;
        isActive?: boolean;
        params?: Record<string, any> | null;
      }>;
    }) => {
      const saved = (await automationRuleRepo.save(
        automationRuleRepo.create({
          companyId: company.id,
          eventType: row.eventType,
          filters: row.filters ?? null,
          priority: row.priority ?? 0,
          isActive: row.isActive !== false,
        } as any),
      )) as unknown as AutomationRule;
      for (const a of row.actions) {
        await automationActionRepo.save(
          automationActionRepo.create({
            companyId: company.id,
            ruleId: saved.id,
            type: a.type,
            sortOrder: a.sortOrder ?? 0,
            isActive: a.isActive !== false,
            params: a.params ?? null,
          } as any),
        );
      }
      console.log(`✅ Automation rule creada: event=${row.eventType} id=${saved.id}`);
    };

    // SALE + deliveryMode=IMMEDIATE + contado -> ADJUSTMENT_OUT + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'IMMEDIATE',
      },
      priority: 0,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'ADJUSTMENT_OUT',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // SALE + deliveryMode=DEFERRED + contado -> INVENTORY_RESERVATION + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'DEFERRED',
      },
      priority: 10,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'INVENTORY_RESERVATION',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // Nota: reglas de PURCHASE y pagos posteriores se tratarán en flujos dedicados.

    let seedBranch = await branchRepo.findOne({
      where: { companyId: company.id, name: SEED_BRANCH_NAME },
      withDeleted: true,
    });
    if (!seedBranch) {
      seedBranch = branchRepo.create({
        companyId: company.id,
        name: SEED_BRANCH_NAME,
        address: SEED_BRANCH_ADDRESS,
        phone: SEED_BRANCH_PHONE,
        location: SEED_BRANCH_LOCATION,
        isActive: true,
        isHeadquarters: true,
      });
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo creada: «${SEED_BRANCH_NAME}» id=${seedBranch.id} companyId=${company.id}`,
      );
    } else {
      if (seedBranch.deletedAt) {
        seedBranch = await branchRepo.recover(seedBranch);
      }
      seedBranch.companyId = company.id;
      seedBranch.address = SEED_BRANCH_ADDRESS;
      seedBranch.phone = SEED_BRANCH_PHONE;
      seedBranch.location = SEED_BRANCH_LOCATION;
      seedBranch.isActive = true;
      seedBranch.isHeadquarters = true;
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo «${SEED_BRANCH_NAME}» ya existía: id=${seedBranch.id} (sincronizado con seed)`,
      );
    }

    await branchRepo.update({ companyId: company.id }, { isHeadquarters: false });
    seedBranch.isHeadquarters = true;
    await branchRepo.save(seedBranch);
    console.log(`✅ Sucursal «${SEED_BRANCH_NAME}» marcada como casa matriz (isHeadquarters)`);

    let seedBranchMall = await branchRepo.findOne({
      where: { companyId: company.id, name: SEED_BRANCH_2_NAME },
      withDeleted: true,
    });
    if (!seedBranchMall) {
      seedBranchMall = branchRepo.create({
        companyId: company.id,
        name: SEED_BRANCH_2_NAME,
        address: SEED_BRANCH_2_ADDRESS,
        phone: SEED_BRANCH_2_PHONE,
        location: SEED_BRANCH_2_LOCATION,
        isActive: true,
        isHeadquarters: false,
      });
      await branchRepo.save(seedBranchMall);
      console.log(
        `✅ Segunda sucursal creada: «${SEED_BRANCH_2_NAME}» id=${seedBranchMall.id}`,
      );
    } else {
      if (seedBranchMall.deletedAt) {
        seedBranchMall = await branchRepo.recover(seedBranchMall);
      }
      seedBranchMall.companyId = company.id;
      seedBranchMall.address = SEED_BRANCH_2_ADDRESS;
      seedBranchMall.phone = SEED_BRANCH_2_PHONE;
      seedBranchMall.location = SEED_BRANCH_2_LOCATION;
      seedBranchMall.isActive = true;
      seedBranchMall.isHeadquarters = false;
      await branchRepo.save(seedBranchMall);
      console.log(
        `✅ Segunda sucursal «${SEED_BRANCH_2_NAME}» ya existía: id=${seedBranchMall.id} (sincronizado)`,
      );
    }

    // Salones y mesas demo (casa matriz): 2 salones × 3 mesas
    const diningRoomRepo = dataSource.getRepository(DiningRoom);
    const diningTableRepo = dataSource.getRepository(DiningTable);
    const seedDiningRooms: Array<{
      name: string;
      tables: Array<{
        code: string;
        label: string;
        capacity: number;
        x: number;
        y: number;
      }>;
    }> = [
      {
        name: 'Salón principal',
        tables: [
          { code: 'M1', label: 'Mesa 1', capacity: 4, x: 40, y: 40 },
          { code: 'M2', label: 'Mesa 2', capacity: 4, x: 160, y: 40 },
          { code: 'M3', label: 'Mesa 3', capacity: 6, x: 280, y: 40 },
        ],
      },
      {
        name: 'Terraza',
        tables: [
          { code: 'T1', label: 'Mesa T1', capacity: 2, x: 40, y: 40 },
          { code: 'T2', label: 'Mesa T2', capacity: 4, x: 160, y: 40 },
          { code: 'T3', label: 'Mesa T3', capacity: 4, x: 280, y: 40 },
        ],
      },
    ];
    for (const roomDef of seedDiningRooms) {
      let room = await diningRoomRepo.findOne({
        where: {
          companyId: company.id,
          branchId: seedBranch.id,
          name: roomDef.name,
        },
      });
      if (!room) {
        room = diningRoomRepo.create({
          companyId: company.id,
          branchId: seedBranch.id,
          name: roomDef.name,
          isActive: true,
        });
        await diningRoomRepo.save(room);
        console.log(
          `✅ Salón demo creado: «${roomDef.name}» id=${room.id} branchId=${seedBranch.id}`,
        );
      } else {
        room.isActive = true;
        await diningRoomRepo.save(room);
        console.log(
          `✅ Salón demo «${roomDef.name}» ya existía: id=${room.id}`,
        );
      }
      for (const tableDef of roomDef.tables) {
        let table = await diningTableRepo.findOne({
          where: { diningRoomId: room.id, code: tableDef.code },
        });
        if (!table) {
          table = diningTableRepo.create({
            diningRoomId: room.id,
            code: tableDef.code,
            label: tableDef.label,
            capacity: tableDef.capacity,
            shape: TableShape.RECT,
            x: tableDef.x,
            y: tableDef.y,
            width: 80,
            height: 80,
            rotation: 0,
          });
          await diningTableRepo.save(table);
          console.log(
            `✅ Mesa demo creada: ${tableDef.code} («${tableDef.label}») en «${roomDef.name}»`,
          );
        } else {
          table.label = tableDef.label;
          table.capacity = tableDef.capacity;
          table.shape = TableShape.RECT;
          table.x = tableDef.x;
          table.y = tableDef.y;
          table.width = 80;
          table.height = 80;
          await diningTableRepo.save(table);
        }
      }
    }

    // Preferencias dining: POS puede abrir mesas (además del mesero)
    const diningSettingsRepo = dataSource.getRepository(DiningBranchSettings);
    for (const branch of [seedBranch, seedBranchMall]) {
      let diningSettings = await diningSettingsRepo.findOne({
        where: { companyId: company.id, branchId: branch.id },
      });
      if (!diningSettings) {
        diningSettings = diningSettingsRepo.create({
          companyId: company.id,
          branchId: branch.id,
          timezone: 'America/Santiago',
          resetTimeLocal: '00:00:01',
          allowWaiterOpenTable: true,
          allowPosOpenTable: true,
        });
        await diningSettingsRepo.save(diningSettings);
        console.log(
          `✅ Dining settings creados: branch=${branch.name} allowPosOpenTable=true`,
        );
      } else if (!diningSettings.allowPosOpenTable) {
        diningSettings.allowPosOpenTable = true;
        await diningSettingsRepo.save(diningSettings);
        console.log(
          `✅ Dining settings: allowPosOpenTable=true en «${branch.name}»`,
        );
      }
    }

    // Almacenes demo: bodega casa matriz + bodega Local Mall
    const storageRepo = dataSource.getRepository(Storage);

    let seedSalaVenta = await storageRepo.findOne({
      where: { companyId: company.id, code: SEED_STORAGE_CODE },
      withDeleted: true,
    });
    if (!seedSalaVenta) {
      seedSalaVenta = storageRepo.create({
        companyId: company.id,
        name: SEED_STORAGE_NAME,
        code: SEED_STORAGE_CODE,
        branchId: seedBranch.id,
        type: StorageType.STORE,
        category: StorageCategory.IN_BRANCH,
        isDefault: true,
        isActive: true,
      });
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén ejemplo creado: «${SEED_STORAGE_NAME}» id=${seedSalaVenta.id} branchId=${seedBranch.id}`,
      );
    } else {
      if (seedSalaVenta.deletedAt) {
        seedSalaVenta = await storageRepo.recover(seedSalaVenta);
      }
      seedSalaVenta.companyId = company.id;
      seedSalaVenta.name = SEED_STORAGE_NAME;
      seedSalaVenta.branchId = seedBranch.id;
      seedSalaVenta.type = StorageType.STORE;
      seedSalaVenta.category = StorageCategory.IN_BRANCH;
      seedSalaVenta.isDefault = true;
      seedSalaVenta.isActive = true;
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén «${SEED_STORAGE_NAME}» ya existía: id=${seedSalaVenta.id} (sincronizado con seed)`,
      );
    }

    let seedStorageMall = await storageRepo.findOne({
      where: { companyId: company.id, code: SEED_STORAGE_2_CODE },
      withDeleted: true,
    });
    if (!seedStorageMall) {
      seedStorageMall = storageRepo.create({
        companyId: company.id,
        name: SEED_STORAGE_2_NAME,
        code: SEED_STORAGE_2_CODE,
        branchId: seedBranchMall.id,
        type: StorageType.STORE,
        category: StorageCategory.IN_BRANCH,
        isDefault: false,
        isActive: true,
      });
      await storageRepo.save(seedStorageMall);
      console.log(
        `✅ Almacén segunda sucursal creado: «${SEED_STORAGE_2_NAME}» id=${seedStorageMall.id} branchId=${seedBranchMall.id}`,
      );
    } else {
      if (seedStorageMall.deletedAt) {
        seedStorageMall = await storageRepo.recover(seedStorageMall);
      }
      seedStorageMall.companyId = company.id;
      seedStorageMall.name = SEED_STORAGE_2_NAME;
      seedStorageMall.branchId = seedBranchMall.id;
      seedStorageMall.type = StorageType.STORE;
      seedStorageMall.category = StorageCategory.IN_BRANCH;
      seedStorageMall.isDefault = false;
      seedStorageMall.isActive = true;
      await storageRepo.save(seedStorageMall);
      console.log(
        `✅ Almacén «${SEED_STORAGE_2_NAME}» ya existía: id=${seedStorageMall.id} (sincronizado)`,
      );
    }

    const seedStorageKeepIds = new Set([
      seedSalaVenta.id,
      seedStorageMall.id,
    ]);

    let seedPasteleriaInput = await storageRepo.findOne({
      where: { companyId: company.id, code: SEED_STORAGE_PASTELERIA_CODE },
      withDeleted: true,
    });
    if (!seedPasteleriaInput) {
      seedPasteleriaInput = storageRepo.create({
        companyId: company.id,
        name: SEED_STORAGE_PASTELERIA_NAME,
        code: SEED_STORAGE_PASTELERIA_CODE,
        branchId: null,
        type: StorageType.PRODUCTION_INPUTS,
        category: StorageCategory.PRODUCTION_INPUT,
        isDefault: false,
        isActive: true,
      });
      await storageRepo.save(seedPasteleriaInput);
      console.log(
        `✅ Almacén insumos pastelería creado: «${SEED_STORAGE_PASTELERIA_NAME}» id=${seedPasteleriaInput.id}`,
      );
    } else {
      if (seedPasteleriaInput.deletedAt) {
        seedPasteleriaInput = await storageRepo.recover(seedPasteleriaInput);
      }
      seedPasteleriaInput.name = SEED_STORAGE_PASTELERIA_NAME;
      seedPasteleriaInput.branchId = null;
      seedPasteleriaInput.type = StorageType.PRODUCTION_INPUTS;
      seedPasteleriaInput.category = StorageCategory.PRODUCTION_INPUT;
      seedPasteleriaInput.isActive = true;
      await storageRepo.save(seedPasteleriaInput);
      console.log(
        `✅ Almacén «${SEED_STORAGE_PASTELERIA_NAME}» sincronizado id=${seedPasteleriaInput.id}`,
      );
    }
    seedStorageKeepIds.add(seedPasteleriaInput.id);

    // Almacén predeterminado de la empresa: Casa matriz.
    await storageRepo.update({ companyId: company.id }, { isDefault: false });
    await storageRepo.update({ id: seedSalaVenta.id }, { isDefault: true, isActive: true });

    const stockLevelRepoForStorage = dataSource.getRepository(StockLevel);
    await stockLevelRepoForStorage.delete({
      companyId: company.id,
      storageId: Not(seedSalaVenta.id),
    });

    const extraStorages = await storageRepo.find({
      where: { companyId: company.id, deletedAt: IsNull() },
    });
    let removedStorageCount = 0;
    for (const st of extraStorages) {
      if (seedStorageKeepIds.has(st.id)) {
        continue;
      }
      await storageRepo.softRemove(st);
      removedStorageCount += 1;
    }
    if (removedStorageCount > 0) {
      console.log(
        `🗑️  Almacenes extra retirados: ${removedStorageCount} (predeterminado: «${SEED_STORAGE_NAME}»)`,
      );
    }

    // Units: UNIDAD (predeterminada) + volumen (ml, L). Sin docena / gramo / kilogramo en seed.
    const setCompanyDefaultUnit = async (defaultUnitId: string): Promise<void> => {
      await unitRepo.update(
        { companyId: company.id, deletedAt: null as never },
        { isDefault: false },
      );
      await unitRepo.update(
        { id: defaultUnitId, companyId: company.id },
        { isDefault: true },
      );
    };

    let baseUnit = await unitRepo.findOne({
      where: { symbol: SEED_UNIT_BASE_SYMBOL, companyId: company.id, deletedAt: null as never },
    });
    if (!baseUnit) {
      baseUnit = unitRepo.create({
        name: SEED_UNIT_BASE_NAME,
        symbol: SEED_UNIT_BASE_SYMBOL,
        dimension: UnitDimension.COUNT,
        conversionFactor: 1,
        allowDecimals: false,
        isBase: true,
        baseUnitId: null,
        active: true,
        isDefault: true,
      });
      await unitRepo.save(baseUnit);
      await setCompanyDefaultUnit(baseUnit.id);
      console.log(`✅ Unidad ejemplo creada: ${baseUnit.symbol} (${baseUnit.name}) id=${baseUnit.id}`);
    } else {
      baseUnit.name = SEED_UNIT_BASE_NAME;
      baseUnit.dimension = UnitDimension.COUNT;
      baseUnit.conversionFactor = 1;
      baseUnit.allowDecimals = false;
      baseUnit.isBase = true;
      baseUnit.baseUnitId = null;
      baseUnit.active = true;
      baseUnit.isDefault = true;
      await unitRepo.save(baseUnit);
      await setCompanyDefaultUnit(baseUnit.id);
      console.log(`✅ Unidad ejemplo ${baseUnit.symbol} ya existía: id=${baseUnit.id} (sincronizada con seed)`);
    }

    await setCompanyDefaultUnit(baseUnit.id);

    /** Símbolos de unidad seed (empresa actual) para variantes y product.baseUnitId */
    type SeedUnitKey = SeedDevUnitKey;

    const upsertSeedUnit = async (args: {
      symbol: string;
      name: string;
      dimension: UnitDimension;
      isBase: boolean;
      conversionFactor: number;
      baseUnitId: string | null;
      allowDecimals: boolean;
      active?: boolean;
    }): Promise<Unit> => {
      let u = await unitRepo.findOne({
        where: { symbol: args.symbol, companyId: company.id },
        withDeleted: true,
      });
      const isDefaultUnit =
        args.symbol.toLowerCase() === SEED_UNIT_BASE_SYMBOL.toLowerCase();
      if (!u) {
        u = unitRepo.create({
          symbol: args.symbol,
          name: args.name,
          dimension: args.dimension,
          isBase: args.isBase,
          conversionFactor: args.conversionFactor,
          baseUnitId: args.baseUnitId,
          allowDecimals: args.allowDecimals,
          active: args.active ?? true,
          isDefault: isDefaultUnit,
        });
        await unitRepo.save(u);
        if (isDefaultUnit) {
          await setCompanyDefaultUnit(u.id);
        }
        console.log(`✅ Unidad seed creada: ${args.symbol} (${args.name}) id=${u.id}`);
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
        u.active = args.active ?? true;
        u.isDefault = isDefaultUnit;
        await unitRepo.save(u);
        if (isDefaultUnit) {
          await setCompanyDefaultUnit(u.id);
        }
        console.log(`✅ Unidad seed ${args.symbol} ya existía: id=${u.id} (sincronizada)`);
      }
      return u;
    };

    const unitMl = await upsertSeedUnit({
      symbol: 'ml',
      name: 'Mililitro',
      dimension: UnitDimension.VOLUME,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: true,
    });
    const unitLiter = await upsertSeedUnit({
      symbol: 'L',
      name: 'Litro',
      dimension: UnitDimension.VOLUME,
      isBase: false,
      conversionFactor: 1000,
      baseUnitId: unitMl.id,
      allowDecimals: true,
    });
    const unitGram = await upsertSeedUnit({
      symbol: 'g',
      name: 'Gramo',
      dimension: UnitDimension.MASS,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: true,
    });
    const unitKg = await upsertSeedUnit({
      symbol: 'kg',
      name: 'Kilogramo',
      dimension: UnitDimension.MASS,
      isBase: false,
      conversionFactor: 1000,
      baseUnitId: unitGram.id,
      allowDecimals: true,
    });

    const seedUnitId: Record<SeedUnitKey, string> = {
      UN: baseUnit.id,
      ML: unitMl.id,
      L: unitLiter.id,
      G: unitGram.id,
      KG: unitKg.id,
    };

    const seedDevProducts = getSeedDevProducts();
    const seedDevCategories = getSeedDevCategories();
    const seedDevBrands = getSeedDevBrands();
    const seedDevFeaturedNames = getSeedDevEshopFeaturedProductNames();
    const seedDevProductionUnits = getSeedDevProductionUnits();
    const seedDevProductionRecipes = getSeedDevProductionRecipes();

    const categoryByName = await syncSeedCategories(
      categoryRepo,
      seedDevCategories,
      'Seed dev',
    );

    const attributesByName = await syncSeedAttributes(
      attributeRepo,
      buildSeedAttributes(),
      'Seed dev',
    );
    if (!attributesByName.has(SEED_DEV_ATTRIBUTE_TALLA.name)) {
      throw new Error('Seed dev: atributo Talla no sincronizado');
    }

    const upsertPriceList = async (
      name: string,
      opts: {
        isDefault: boolean;
        priority: number;
        nonDeletable?: boolean;
        priceListType?: PriceListType;
        legacyNames?: readonly string[];
      },
    ): Promise<PriceList> => {
      let existing = await priceListRepo.findOne({
        where: { companyId: company.id, name },
      });
      if (!existing && opts.legacyNames?.length) {
        for (const legacy of opts.legacyNames) {
          existing = await priceListRepo.findOne({
            where: { companyId: company.id, name: legacy },
          });
          if (existing) break;
        }
      }
      const payload = {
        companyId: company.id,
        priceListType: opts.priceListType ?? PriceListType.RETAIL,
        currency: 'CLP',
        validFrom: undefined,
        validUntil: undefined,
        priority: opts.priority,
        isDefault: opts.isDefault,
        isActive: true,
        nonDeletable: opts.nonDeletable === true,
        description: undefined,
      };
      if (existing) {
        return priceListRepo.save({ ...existing, ...payload, name });
      }
      return priceListRepo.save(priceListRepo.create({ name, ...payload }));
    };

    const listaMinorista = await upsertPriceList(SEED_PRICE_LIST_RETAIL_NAME, {
      isDefault: true,
      priority: 0,
    });
    const listaVip = await upsertPriceList(SEED_PRICE_LIST_VIP_NAME, {
      isDefault: false,
      priority: 1,
      priceListType: PriceListType.VIP,
      legacyNames: SEED_PRICE_LIST_VIP_LEGACY_NAMES,
    });
    const listaEshop = await upsertPriceList(SEED_PRICE_LIST_ESHOP_NAME, {
      isDefault: false,
      priority: 2,
      nonDeletable: true,
    });
    console.log(
      `✅ Listas de precios: «${listaMinorista.name}» id=${listaMinorista.id} (default), «${listaVip.name}» id=${listaVip.id} (${listaVip.priceListType}), «${listaEshop.name}» id=${listaEshop.id} (eShop, no eliminable)`,
    );

    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const brandRepo = dataSource.getRepository(Brand);

    const brandIdByName = await syncSeedBrands(
      brandRepo,
      company.id,
      seedDevBrands,
      'Seed dev',
    );
    console.log(`✅ Marcas desarrollo sincronizadas: ${seedDevBrands.length}`);

    const { variantCount: devVariantCount, stockByVariantId: devStockByVariantId } =
      await seedProductsFromDefinitions(seedDevProducts, {
        companyId: company.id,
        productRepo,
        variantRepo,
        priceListItemRepo,
        ivaTax,
        categoryByName,
        brandIdByName,
        attributesByName,
        seedUnitId,
        listaMinoristaId: listaMinorista.id,
        listaMayoristaId: listaVip.id,
        listaEshopId: listaEshop.id,
        logPrefix: 'Seed dev',
        defaultStockQty: 0,
      });

    console.log(`✅ Catálogo desarrollo: ${devVariantCount} variante(s) en ${seedDevProducts.length} producto(s)`);

    if (!foodMode) {
      await seedDemoLaundryCatalog(dataSource, company.id);
    } else {
      console.log('⏭️  Lavandería catálogo omitido (modo KaiFood)');
    }

    await productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ visibleInEShop: true })
      .where('companyId = :companyId', { companyId: company.id })
      .andWhere('productType != :insumo', { insumo: ProductType.INSUMO })
      .execute();
    const sellableProductIds = (
      await productRepo.find({
        where: { companyId: company.id },
        select: ['id', 'productType'],
      })
    )
      .filter((p) => p.productType !== ProductType.INSUMO)
      .map((p) => p.id);
    if (sellableProductIds.length > 0) {
      await variantRepo
        .createQueryBuilder()
        .update()
        .set({ visibleInEShop: true })
        .where('companyId = :companyId', { companyId: company.id })
        .andWhere('productId IN (:...ids)', { ids: sellableProductIds })
        .execute();
    }
    console.log('✅ eShop: productos/variantes vendibles marcados visibleInEShop=true (INSUMO excluido)');

    const recipeRepo = dataSource.getRepository(Recipe);
    const recipeLineRepo = dataSource.getRepository(RecipeLine);

    await cleanupOrphanSeedDevCatalog({
      companyId: company.id,
      productRepo,
      variantRepo,
      priceListItemRepo,
      stockLevelRepo: dataSource.getRepository(StockLevel),
      recipeRepo,
      recipeLineRepo,
    });


    const companyForEshop = await companyRepo.findOne({ where: { id: company.id } });
    if (companyForEshop) {
      const settings = {
        ...((companyForEshop.settings as Record<string, unknown>) ?? {}),
      };
      settings.eShopDefaultBranchId = seedBranch.id;
      settings.eShopDefaultPriceListId = listaEshop.id;
      settings.eShopDefaultStorageId = seedSalaVenta.id;

      const featuredProductIds: string[] = [];
      for (const productName of seedDevFeaturedNames) {
        const featuredProduct = await productRepo.findOne({
          where: { name: productName, companyId: company.id },
        });
        if (featuredProduct?.id) {
          featuredProductIds.push(featuredProduct.id);
        } else {
          console.warn(
            `⚠️ Seed dev: producto destacado eShop «${productName}» no encontrado; se omite`,
          );
        }
      }
      settings.eShopFeaturedProductIds = featuredProductIds;
      settings.eShopFeaturedProductVariantIds = [];

      if (featuredProductIds.length < seedDevFeaturedNames.length) {
        console.warn(
          `⚠️ Seed dev: solo ${featuredProductIds.length}/${seedDevFeaturedNames.length} producto(s) destacados eShop encontrados`,
        );
      }

      companyForEshop.settings = settings;
      await companyRepo.save(companyForEshop);
      console.log(
        `✅ Settings eShop: defaultBranchId=${seedBranch.id} defaultPriceListId=${listaEshop.id} defaultStorageId=${seedSalaVenta.id} featuredProducts=${featuredProductIds.length}`,
      );
    }

    const seedMultimediaParams = {
      assetRepo: dataSource.getRepository(MultimediaAsset),
      linkRepo: dataSource.getRepository(MultimediaLink),
      companyId: company.id,
      ...resolveSeedMultimediaStorage(app, configService),
    };

    await seedDevCatalogMultimedia({
      productRepo,
      variantRepo,
      attributeRepo: dataSource.getRepository(Attribute),
      ...seedMultimediaParams,
    });

    await seedDevEshopHeroSlides({
      heroSlideRepo: dataSource.getRepository(EShopHeroSlide),
      ...seedMultimediaParams,
    });

    await seedDevEshopTestimonials({
      testimonialRepo: dataSource.getRepository(EShopTestimonial),
      ...seedMultimediaParams,
    });

    const priceListsJson = [
      { id: listaMinorista.id, name: listaMinorista.name, isActive: true },
      { id: listaVip.id, name: listaVip.name, isActive: true },
    ];

    const companyCatalog: CompanyPaymentMethodConfig[] =
      syncedCompanyPaymentMethods.length > 0
        ? syncedCompanyPaymentMethods
        : seedCompanyPaymentCatalog;
    const posPaymentList = buildSeedPosPaymentList(companyCatalog, {
      preloadSaleMethods: true,
    });
    const presalePaymentList = buildSeedPosPaymentList(companyCatalog, {
      preloadSaleMethods: false,
    });

    const posPoints: PointOfSale[] = [];
    for (const posName of SEED_POS_NAMES) {
      const defaultListId =
        posName === SEED_POS_NAMES[0] ? listaMinorista.id : listaVip.id;
      let posRow = await posRepo.findOne({ where: { name: posName } });
      const isPrimarySalePos = posName === SEED_POS_NAMES[0];
      const posPayload = {
        name: posName,
        branchId: seedBranch.id,
        storageId: seedSalaVenta.id,
        isActive: true,
        deviceId: undefined,
        defaultPriceListId: defaultListId,
        priceLists: priceListsJson,
        settings: {
          paymentMethods: posPaymentList,
          kind: 'SALE' as const,
          acceptsPresaleTickets: true,
          allowsDeferredPayment: false,
          ...(isPrimarySalePos
            ? {
                fiscal: {
                  defaultDocumentKind: 'TICKET' as const,
                  allowedDocumentKinds: ['TICKET' as const],
                },
              }
            : {}),
        },
      };
      if (!posRow) {
        posRow = await posRepo.save(posRepo.create(posPayload));
        console.log(`✅ Punto de venta creado: «${posName}» id=${posRow.id}`);
      } else {
        posRow = await posRepo.save({ ...posRow, ...posPayload });
        console.log(`✅ Punto de venta sincronizado: «${posName}» id=${posRow.id}`);
      }
      await paymentCatalog.replacePosPaymentMethods(
        posRow.id,
        company.id,
        posPaymentList,
      );
      console.log(
        `✅ Medios POS «${posName}»: precarga efectivo + débito + crédito + transferencia`,
      );
      posPoints.push(posRow);
    }

    let presalePos = await posRepo.findOne({ where: { name: SEED_PRESALE_POS_NAME } });
    const presalePayload = {
      name: SEED_PRESALE_POS_NAME,
      branchId: seedBranch.id,
      storageId: seedSalaVenta.id,
      isActive: true,
      deviceId: undefined,
      defaultPriceListId: listaMinorista.id,
      priceLists: priceListsJson,
      settings: {
        paymentMethods: presalePaymentList,
        kind: 'PRESALE' as const,
        acceptsPresaleTickets: false,
        allowsDeferredPayment: false,
      },
    };
    if (!presalePos) {
      presalePos = await posRepo.save(posRepo.create(presalePayload));
      console.log(
        `✅ Punto de preventa creado: «${SEED_PRESALE_POS_NAME}» id=${presalePos.id}`,
      );
    } else {
      presalePos = await posRepo.save({ ...presalePos, ...presalePayload });
      console.log(
        `✅ Punto de preventa sincronizado: «${SEED_PRESALE_POS_NAME}» id=${presalePos.id}`,
      );
    }
    await paymentCatalog.replacePosPaymentMethods(
      presalePos.id,
      company.id,
      presalePaymentList,
    );

    const stockLevelRepo = dataSource.getRepository(StockLevel);
    const trackedVariants = await variantRepo.find({
      where: { companyId: company.id, trackInventory: true, deletedAt: null as never },
      select: ['id'],
    });
    for (const v of trackedVariants) {
      const physicalQty = devStockByVariantId.get(v.id) ?? 0;
      let sl = await stockLevelRepo.findOne({
        where: { productVariantId: v.id, storageId: seedSalaVenta.id },
      });
      if (!sl) {
        sl = stockLevelRepo.create({
          companyId: company.id,
          productVariantId: v.id,
          storageId: seedSalaVenta.id,
          physicalStock: physicalQty,
          committedStock: 0,
          availableStock: physicalQty,
          incomingStock: 0,
        });
      } else {
        sl.physicalStock = physicalQty;
        sl.committedStock = 0;
        sl.availableStock = physicalQty;
        sl.incomingStock = 0;
      }
      await stockLevelRepo.save(sl);
    }
    console.log(
      `✅ Stock «${SEED_STORAGE_NAME}»: ${trackedVariants.length} variante(s) en 0 (compras seed llenan inventario)`,
    );

    const productionUnitRepo = dataSource.getRepository(ProductionUnit);

    for (const unitDef of seedDevProductionUnits) {
      const scope =
        unitDef.scope === 'COMPANY'
          ? ProductionUnitScope.COMPANY
          : ProductionUnitScope.BRANCH;
      const inventoryMode =
        unitDef.inventoryMode === 'AUTONOMOUS'
          ? ProductionUnitInventoryMode.AUTONOMOUS
          : ProductionUnitInventoryMode.DEPENDENT;
      const purpose =
        unitDef.purpose === 'BATCH'
          ? ProductionUnitPurpose.BATCH
          : ProductionUnitPurpose.KITCHEN;

      const branchId =
        scope === ProductionUnitScope.COMPANY
          ? null
          : unitDef.branchKey === 'mall'
            ? seedBranchMall.id
            : seedBranch.id;

      const sharedStorage =
        scope === ProductionUnitScope.COMPANY
          ? seedSalaVenta
          : unitDef.branchKey === 'mall'
            ? seedStorageMall
            : seedSalaVenta;

      const inputStorage =
        inventoryMode === ProductionUnitInventoryMode.AUTONOMOUS
          ? seedPasteleriaInput
          : sharedStorage;
      const outputStorage = sharedStorage;

      let unit = await productionUnitRepo.findOne({
        where:
          scope === ProductionUnitScope.COMPANY
            ? {
                companyId: company.id,
                scope: ProductionUnitScope.COMPANY,
                code: unitDef.code,
              }
            : {
                companyId: company.id,
                branchId: branchId!,
                code: unitDef.code,
              },
      });

      const unitLabel =
        scope === ProductionUnitScope.COMPANY
          ? `${unitDef.name} (empresa)`
          : `${unitDef.name} (${unitDef.branchKey === 'mall' ? SEED_BRANCH_2_NAME : SEED_BRANCH_NAME})`;

      if (!unit) {
        unit = productionUnitRepo.create({
          companyId: company.id,
          branchId,
          scope,
          inventoryMode,
          purpose,
          code: unitDef.code,
          name: unitDef.name,
          defaultInputStorageId: inputStorage.id,
          defaultOutputStorageId: null,
          isActive: true,
        });
        await productionUnitRepo.save(unit);
        console.log(
          `✅ Unidad de producción creada: «${unitLabel}» (${unitDef.code}) id=${unit.id}`,
        );
      } else {
        unit.name = unitDef.name;
        unit.branchId = branchId;
        unit.scope = scope;
        unit.inventoryMode = inventoryMode;
        unit.purpose = purpose;
        unit.defaultInputStorageId = inputStorage.id;
        unit.defaultOutputStorageId = null;
        unit.isActive = true;
        await productionUnitRepo.save(unit);
        console.log(
          `✅ Unidad de producción sincronizada: «${unitLabel}» (${unitDef.code}) id=${unit.id}`,
        );
      }

      if (inventoryMode === ProductionUnitInventoryMode.AUTONOMOUS) {
        seedPasteleriaInput.productionUnitId = unit.id;
        await storageRepo.save(seedPasteleriaInput);
      }
    }

    const skuToVariantId = new Map<string, string>();
    const seedVariants = await variantRepo.find({
      where: { companyId: company.id, deletedAt: IsNull() },
      select: ['id', 'sku'],
    });
    for (const v of seedVariants) {
      if (v.sku) skuToVariantId.set(v.sku, v.id);
    }

    let recipesCreated = 0;
    let recipesUpdated = 0;
    for (const recipeDef of seedDevProductionRecipes) {
      const outputVariantId = skuToVariantId.get(recipeDef.outputSku);
      if (!outputVariantId) {
        console.warn(
          `⚠️ Seed receta: variante salida «${recipeDef.outputSku}» no encontrada; se omite`,
        );
        continue;
      }
      const linesPayload: {
        inputVariantId: string;
        qtyPerOutputUnit: number;
        wasteFactor: number;
        sortOrder: number;
      }[] = [];
      let lineOk = true;
      for (let i = 0; i < recipeDef.lines.length; i++) {
        const line = recipeDef.lines[i];
        const inputVariantId = skuToVariantId.get(line.inputSku);
        if (!inputVariantId) {
          console.warn(
            `⚠️ Seed receta «${recipeDef.outputSku}»: insumo «${line.inputSku}» no encontrado; se omite receta`,
          );
          lineOk = false;
          break;
        }
        linesPayload.push({
          inputVariantId,
          qtyPerOutputUnit: line.qtyPerOutputUnit,
          wasteFactor: line.wasteFactor ?? 0,
          sortOrder: i + 1,
        });
      }
      if (!lineOk || linesPayload.length === 0) continue;

      const existingRecipes = await recipeRepo.find({
        where: { companyId: company.id, outputVariantId },
      });
      for (const old of existingRecipes) {
        await recipeLineRepo.delete({ recipeId: old.id });
        await recipeRepo.delete({ id: old.id });
      }

      const recipe = await recipeRepo.save(
        recipeRepo.create({
          companyId: company.id,
          outputVariantId,
          type: RecipeType.PRODUCTION,
          version: 1,
          isActive: true,
          metadata: { seed: 'demo', outputSku: recipeDef.outputSku },
        }),
      );
      await recipeLineRepo.save(
        linesPayload.map((l) =>
          recipeLineRepo.create({
            companyId: company.id,
            recipeId: recipe.id,
            inputVariantId: l.inputVariantId,
            qtyPerOutputUnit: l.qtyPerOutputUnit,
            wasteFactor: l.wasteFactor,
            limitsProjectedStock: true,
            sortOrder: l.sortOrder,
          }),
        ),
      );
      if (existingRecipes.length > 0) recipesUpdated += 1;
      else recipesCreated += 1;
    }
    console.log(
      `✅ Recetas PRODUCTION: ${recipesCreated} creada(s), ${recipesUpdated} actualizada(s) (total defs=${seedDevProductionRecipes.length})`,
    );

    // CTP: routing variante → UP + stock insumos en bodega pastelería
    const pvPuRepo = dataSource.getRepository(ProductVariantProductionUnit);
    const allUnits = await productionUnitRepo.find({
      where: { companyId: company.id },
    });
    const cocinaMain = allUnits.find(
      (u) =>
        u.code === 'COCINA' &&
        u.branchId === seedBranch.id &&
        u.scope === ProductionUnitScope.BRANCH,
    );
    const cocinaMall = allUnits.find(
      (u) =>
        u.code === 'COCINA' &&
        u.branchId === seedBranchMall.id &&
        u.scope === ProductionUnitScope.BRANCH,
    );
    const pasteleria = allUnits.find(
      (u) =>
        u.code === 'PASTELERIA' && u.scope === ProductionUnitScope.COMPANY,
    );
    const tallerTextil = allUnits.find(
      (u) => u.code === 'TALLER' && u.scope === ProductionUnitScope.COMPANY,
    );

    const productsForRouting = await productRepo.find({
      where: { companyId: company.id, deletedAt: IsNull() },
      select: ['id', 'productType'],
    });
    const typeByProductId = new Map(
      productsForRouting.map((p) => [p.id, p.productType]),
    );
    const allVars = await variantRepo.find({
      where: { companyId: company.id, deletedAt: IsNull() },
      select: ['id', 'productId'],
    });

    let routingCount = 0;
    for (const v of allVars) {
      const pt = typeByProductId.get(v.productId ?? '');
      const targets: Array<{ branchId: string; unitId: string }> = [];
      if (pt === ProductType.PREPARADO && cocinaMain) {
        targets.push({ branchId: seedBranch.id, unitId: cocinaMain.id });
        if (cocinaMall) {
          targets.push({ branchId: seedBranchMall.id, unitId: cocinaMall.id });
        }
      }
      if (pt === ProductType.ELABORADO && pasteleria) {
        targets.push({ branchId: seedBranch.id, unitId: pasteleria.id });
        targets.push({ branchId: seedBranchMall.id, unitId: pasteleria.id });
      }
      if (pt === ProductType.MANUFACTURADO && tallerTextil) {
        targets.push({ branchId: seedBranch.id, unitId: tallerTextil.id });
        targets.push({ branchId: seedBranchMall.id, unitId: tallerTextil.id });
      }
      for (const t of targets) {
        let row = await pvPuRepo.findOne({
          where: {
            companyId: company.id,
            productVariantId: v.id,
            branchId: t.branchId,
            productionUnitId: t.unitId,
          },
        });
        if (!row) {
          row = pvPuRepo.create({
            companyId: company.id,
            productVariantId: v.id,
            branchId: t.branchId,
            productionUnitId: t.unitId,
            isDefault: true,
          });
        } else {
          row.isDefault = true;
        }
        await pvPuRepo.save(row);
        // Clear other defaults for same variant+branch
        await pvPuRepo
          .createQueryBuilder()
          .update()
          .set({ isDefault: false })
          .where('company_id = :companyId', { companyId: company.id })
          .andWhere('product_variant_id = :vid', { vid: v.id })
          .andWhere('branch_id = :bid', { bid: t.branchId })
          .andWhere('id != :id', { id: row.id })
          .execute();
        routingCount += 1;
      }
    }
    console.log(`✅ Routing CTP variante→UP: ${routingCount} vínculo(s)`);

    const pvProdAttrRepo = dataSource.getRepository(
      ProductVariantProductionAttribute,
    );
    const pvProdOptRepo = dataSource.getRepository(
      ProductVariantProductionAttributeOption,
    );
    const variantBySku = new Map(
      (
        await variantRepo.find({
          where: { companyId: company.id, deletedAt: IsNull() },
          select: ['id', 'sku'],
        })
      ).map((v) => [v.sku, v.id] as const),
    );
    let prodAttrCount = 0;
    let prodOptCount = 0;
    for (const def of SEED_DEMO_PRODUCTION_ATTRIBUTES) {
      const variantId = variantBySku.get(def.outputSku);
      if (!variantId) continue;
      for (let ai = 0; ai < def.attributes.length; ai++) {
        const a = def.attributes[ai]!;
        let attr = await pvProdAttrRepo.findOne({
          where: { id: a.id },
          withDeleted: true,
        });
        if (!attr) {
          attr = pvProdAttrRepo.create({
            id: a.id,
            companyId: company.id,
            productVariantId: variantId,
            name: a.name,
            description: a.description ?? null,
            tagKey: a.tagKey,
            tagLabel: a.tagLabel,
            displayOrder: ai,
            deletedAt: null,
          });
        } else {
          attr.companyId = company.id;
          attr.productVariantId = variantId;
          attr.name = a.name;
          attr.description = a.description ?? null;
          attr.tagKey = a.tagKey;
          attr.tagLabel = a.tagLabel;
          attr.displayOrder = ai;
          attr.deletedAt = null;
        }
        await pvProdAttrRepo.save(attr);
        prodAttrCount += 1;
        for (let oi = 0; oi < a.options.length; oi++) {
          const o = a.options[oi]!;
          let opt = await pvProdOptRepo.findOne({
            where: { id: o.id },
            withDeleted: true,
          });
          if (!opt) {
            opt = pvProdOptRepo.create({
              id: o.id,
              companyId: company.id,
              attributeId: a.id,
              label: o.label,
              displayOrder: oi,
              deletedAt: null,
            });
          } else {
            opt.companyId = company.id;
            opt.attributeId = a.id;
            opt.label = o.label;
            opt.displayOrder = oi;
            opt.deletedAt = null;
          }
          await pvProdOptRepo.save(opt);
          prodOptCount += 1;
        }
      }
    }
    console.log(
      `✅ Atributos de producción MANUFACTURADO: ${prodAttrCount} attr(s), ${prodOptCount} opción(es)`,
    );

    // Stock de insumos también en bodega pastelería (CTP elaborados)
    if (seedPasteleriaInput?.id && seedSalaVenta?.id) {
      const salaLevels = await stockLevelRepo.find({
        where: { companyId: company.id, storageId: seedSalaVenta.id },
      });
      let copied = 0;
      for (const sl of salaLevels) {
        const variant = allVars.find((v) => v.id === sl.productVariantId);
        if (!variant) continue;
        const pt = typeByProductId.get(variant.productId ?? '');
        if (pt !== ProductType.INSUMO && pt !== ProductType.PHYSICAL) continue;
        let dest = await stockLevelRepo.findOne({
          where: {
            productVariantId: sl.productVariantId,
            storageId: seedPasteleriaInput.id,
          },
        });
        if (!dest) {
          dest = stockLevelRepo.create({
            companyId: company.id,
            productVariantId: sl.productVariantId,
            storageId: seedPasteleriaInput.id,
            physicalStock: sl.physicalStock,
            committedStock: 0,
            availableStock: sl.availableStock,
            incomingStock: 0,
          });
        } else {
          dest.physicalStock = sl.physicalStock;
          dest.committedStock = 0;
          dest.availableStock = sl.availableStock;
          dest.incomingStock = 0;
        }
        await stockLevelRepo.save(dest);
        copied += 1;
      }
      console.log(
        `✅ Stock insumos copiado a «${SEED_STORAGE_PASTELERIA_NAME}»: ${copied} nivel(es)`,
      );
    }

    const seedBranchRow = await branchRepo.findOne({ where: { id: seedBranch.id } });
    const cashHubRows: CashHub[] = [];
    for (let i = 0; i < SEED_CASH_HUBS.length; i++) {
      const hubDef = SEED_CASH_HUBS[i];
      let hub = await cashHubRepo.findOne({
        where: { companyId: company.id, code: hubDef.code },
      });
      if (!hub) {
        hub = cashHubRepo.create({
          companyId: company.id,
          name: hubDef.name,
          code: hubDef.code,
          isActive: true,
        });
        await cashHubRepo.save(hub);
      } else {
        hub.name = hubDef.name;
        await cashHubRepo.save(hub);
      }
      if (seedBranchRow) {
        hub.branches = [seedBranchRow];
      }
      const linkedPos = posPoints[i] ?? posPoints[0];
      hub.pointsOfSale = [linkedPos];
      await cashHubRepo.save(hub);
      linkedPos.defaultCashHubId = hub.id;
      await posRepo.save(linkedPos);
      cashHubRows.push(hub);
      console.log(
        `✅ Centro de acopio «${hub.name}» (${hub.code}) → POS «${linkedPos.name}»`,
      );
    }

    // Expense categories (seed explícito): limpiar y recrear catálogo por empresa.
    const deleteResult = await expenseCategoryRepo
      .createQueryBuilder()
      .delete()
      .from(ExpenseCategory)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Categorías de gasto eliminadas para companyId=${company.id}: ${deleteResult.affected ?? 0}`,
    );

    for (const item of SEED_EXPENSE_CATEGORIES) {
      const row = expenseCategoryRepo.create({
        companyId: company.id,
        code: null,
        name: item.name,
        operationalExpenseGroup: item.operationalExpenseGroup,
        pnlNature: item.pnlNature,
        description: item.name,
        requiresApproval: false,
        approvalThreshold: '0',
        defaultResultCenterId: null,
        isActive: true,
        nonDeletable: item.nonDeletable === true,
        examples: null,
        metadata: null,
      });
      await expenseCategoryRepo.save(row);
      console.log(
        `✅ Categoría de gasto creada: ${row.name} (${row.operationalExpenseGroup} / ${row.pnlNature}${row.nonDeletable ? ' · sistema' : ''}) id=${row.id}`,
      );
    }

    // Suppliers (ejemplos): 10 combinaciones entre persona/empresa y campos opcionales.
    for (const item of SEED_SUPPLIERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: item.person.type,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          businessName: item.person.businessName,
          documentType: item.person.documentType,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
          regionCode: item.person.regionCode,
          regionName: item.person.regionName,
          communeCode: item.person.communeCode,
          communeName: item.person.communeName,
          treasuryCode: item.person.treasuryCode,
          activityStarted: item.person.activityStarted === true,
          economicActivities: item.person.economicActivities as any,
        });
      } else {
        person.type = item.person.type;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.businessName = item.person.businessName;
        person.documentType = item.person.documentType;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
        person.regionCode = item.person.regionCode;
        person.regionName = item.person.regionName;
        person.communeCode = item.person.communeCode;
        person.communeName = item.person.communeName;
        person.treasuryCode = item.person.treasuryCode;
        person.activityStarted = item.person.activityStarted === true;
        person.economicActivities = item.person.economicActivities as any;
      }
      person = await personRepo.save(person);

      let supplier = await supplierRepo.findOne({
        where: { personId: person.id },
        withDeleted: true,
      });
      if (!supplier) {
        supplier = supplierRepo.create({
          personId: person.id,
          supplierType: item.supplier.supplierType,
          alias: item.supplier.alias,
          defaultPaymentTermDays: item.supplier.defaultPaymentTermDays,
          isActive: item.supplier.isActive,
          notes: item.supplier.notes,
        });
      } else {
        if (supplier.deletedAt) {
          supplier = await supplierRepo.recover(supplier);
        }
        supplier.personId = person.id;
        supplier.supplierType = item.supplier.supplierType;
        supplier.alias = item.supplier.alias;
        supplier.defaultPaymentTermDays = item.supplier.defaultPaymentTermDays;
        supplier.isActive = item.supplier.isActive;
        supplier.notes = item.supplier.notes;
      }
      supplier = await supplierRepo.save(supplier);
      console.log(
        `✅ Proveedor ${supplier.alias ?? person.businessName ?? `${person.firstName} ${person.lastName ?? ''}`.trim()} sincronizado: id=${supplier.id} tipo=${supplier.supplierType}`,
      );
    }

    // Customers (ejemplos): combinaciones de persona/empresa, distintos
    // límites de crédito y días de pago. Cada customer queda vinculado a
    // un `Person` (FK) y a la `Company` seed vía `companyId` (NOT NULL).
    for (const item of SEED_CUSTOMERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: item.person.type,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          businessName: item.person.businessName,
          documentType: item.person.documentType,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
          regionCode: item.person.regionCode,
          regionName: item.person.regionName,
          communeCode: item.person.communeCode,
          communeName: item.person.communeName,
          treasuryCode: item.person.treasuryCode,
          activityStarted: item.person.activityStarted === true,
          economicActivities: item.person.economicActivities as any,
        });
      } else {
        person.type = item.person.type;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.businessName = item.person.businessName;
        person.documentType = item.person.documentType;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
        person.regionCode = item.person.regionCode;
        person.regionName = item.person.regionName;
        person.communeCode = item.person.communeCode;
        person.communeName = item.person.communeName;
        person.treasuryCode = item.person.treasuryCode;
        person.activityStarted = item.person.activityStarted === true;
        person.economicActivities = item.person.economicActivities as any;
      }
      person = await personRepo.save(person);

      let customer = await customerRepo.findOne({
        where: { companyId: company.id, personId: person.id },
        withDeleted: true,
      });
      if (!customer) {
        customer = customerRepo.create({
          companyId: company.id,
          personId: person.id,
          creditLimit: item.customer.creditLimit,
          currentBalance: 0,
          paymentDayOfMonth: item.customer.paymentDayOfMonth,
          isActive: item.customer.isActive,
          notes: item.customer.notes,
        });
      } else {
        if (customer.deletedAt) {
          customer = await customerRepo.recover(customer);
        }
        customer.companyId = company.id;
        customer.personId = person.id;
        customer.creditLimit = item.customer.creditLimit;
        customer.paymentDayOfMonth = item.customer.paymentDayOfMonth;
        customer.isActive = item.customer.isActive;
        customer.notes = item.customer.notes;
      }
      customer = await customerRepo.save(customer);
      const displayName =
        person.businessName ??
        `${person.firstName} ${person.lastName ?? ''}`.trim();
      console.log(
        `✅ Cliente «${displayName}» sincronizado: id=${customer.id} companyId=${customer.companyId} crédito=${customer.creditLimit} día=${customer.paymentDayOfMonth} activo=${customer.isActive}`,
      );
    }

    const laborUnitRepo = dataSource.getRepository(HrLaborUnit);
    const laborUnitBranchRepo = dataSource.getRepository(HrLaborUnitBranch);
    let seedLaborUnit = await laborUnitRepo.findOne({
      where: {
        companyId: company.id,
        code: 'UL00001',
        deletedAt: IsNull(),
      },
    });
    if (!seedLaborUnit) {
      seedLaborUnit = await laborUnitRepo.save(
        laborUnitRepo.create({
          companyId: company.id,
          code: 'UL00001',
          name: 'Sala de ventas',
          description: 'Unidad laboral demo (piso / atención).',
          isActive: true,
        }),
      );
      console.log(
        `✅ Unidad laboral demo creada: ${seedLaborUnit.code} «${seedLaborUnit.name}» id=${seedLaborUnit.id}`,
      );
    } else {
      seedLaborUnit.name = 'Sala de ventas';
      seedLaborUnit.description = 'Unidad laboral demo (piso / atención).';
      seedLaborUnit.isActive = true;
      seedLaborUnit = await laborUnitRepo.save(seedLaborUnit);
      console.log(
        `✅ Unidad laboral demo sincronizada: ${seedLaborUnit.code} id=${seedLaborUnit.id}`,
      );
    }

    let seedSalonLaborUnit = await laborUnitRepo.findOne({
      where: {
        companyId: company.id,
        code: 'UL00002',
        deletedAt: IsNull(),
      },
    });
    if (!seedSalonLaborUnit) {
      seedSalonLaborUnit = await laborUnitRepo.save(
        laborUnitRepo.create({
          companyId: company.id,
          code: 'UL00002',
          name: 'Salón restaurante',
          description: 'Unidad laboral demo (meseros / servicio en mesa).',
          isActive: true,
        }),
      );
      console.log(
        `✅ Unidad laboral demo creada: ${seedSalonLaborUnit.code} «${seedSalonLaborUnit.name}» id=${seedSalonLaborUnit.id}`,
      );
    } else {
      seedSalonLaborUnit.name = 'Salón restaurante';
      seedSalonLaborUnit.description =
        'Unidad laboral demo (meseros / servicio en mesa).';
      seedSalonLaborUnit.isActive = true;
      seedSalonLaborUnit = await laborUnitRepo.save(seedSalonLaborUnit);
      console.log(
        `✅ Unidad laboral demo sincronizada: ${seedSalonLaborUnit.code} id=${seedSalonLaborUnit.id}`,
      );
    }

    let seedTallerLaborUnit = await laborUnitRepo.findOne({
      where: {
        companyId: company.id,
        code: 'UL00003',
        deletedAt: IsNull(),
      },
    });
    if (!seedTallerLaborUnit) {
      seedTallerLaborUnit = await laborUnitRepo.save(
        laborUnitRepo.create({
          companyId: company.id,
          code: 'UL00003',
          name: 'Taller textil',
          description:
            'Unidad laboral exclusiva del taller de manufactura textil (sin sucursal).',
          isActive: true,
        }),
      );
      console.log(
        `✅ Unidad laboral demo creada: ${seedTallerLaborUnit.code} «${seedTallerLaborUnit.name}» id=${seedTallerLaborUnit.id}`,
      );
    } else {
      seedTallerLaborUnit.name = 'Taller textil';
      seedTallerLaborUnit.description =
        'Unidad laboral exclusiva del taller de manufactura textil (sin sucursal).';
      seedTallerLaborUnit.isActive = true;
      seedTallerLaborUnit = await laborUnitRepo.save(seedTallerLaborUnit);
      console.log(
        `✅ Unidad laboral demo sincronizada: ${seedTallerLaborUnit.code} id=${seedTallerLaborUnit.id}`,
      );
    }

    const laborUnitsByCode = new Map<string, HrLaborUnit>([
      [seedLaborUnit.code, seedLaborUnit],
      [seedSalonLaborUnit.code, seedSalonLaborUnit],
      [seedTallerLaborUnit.code, seedTallerLaborUnit],
    ]);

    /** Solo UL de piso/salón van a sucursales; UL00003 es exclusiva de producción. */
    for (const laborUnit of [seedLaborUnit, seedSalonLaborUnit]) {
      for (const branchId of [seedBranch.id, seedBranchMall.id]) {
        const existingBridge = await laborUnitBranchRepo.findOne({
          where: { laborUnitId: laborUnit.id, branchId },
        });
        if (!existingBridge) {
          await laborUnitBranchRepo.save(
            laborUnitBranchRepo.create({
              companyId: company.id,
              laborUnitId: laborUnit.id,
              branchId,
            }),
          );
        }
      }
    }

    const afpFundRepo = dataSource.getRepository(HrAfpFund);
    const afpByCode = new Map<string, HrAfpFund>();
    for (const item of SEED_AFP_FUNDS) {
      let fund = await afpFundRepo.findOne({
        where: { companyId: company.id, code: item.code },
        withDeleted: true,
      });
      if (!fund) {
        fund = afpFundRepo.create({
          companyId: company.id,
          code: item.code,
          name: item.name,
          contributionPercent: item.contributionPercent,
          isActive: true,
        });
      } else {
        if (fund.deletedAt) {
          fund = await afpFundRepo.recover(fund);
        }
        fund.name = item.name;
        fund.contributionPercent = item.contributionPercent;
        fund.isActive = true;
      }
      fund = await afpFundRepo.save(fund);
      afpByCode.set(fund.code, fund);
      console.log(
        `✅ AFP «${fund.name}» sincronizada: ${fund.code} comisión=${fund.contributionPercent}%`,
      );
    }

    const isapreRepo = dataSource.getRepository(HrIsapre);
    const isapreByCode = new Map<string, HrIsapre>();
    for (const item of SEED_ISAPRES) {
      let isapre = await isapreRepo.findOne({
        where: { companyId: company.id, code: item.code },
        withDeleted: true,
      });
      if (!isapre) {
        isapre = isapreRepo.create({
          companyId: company.id,
          code: item.code,
          externalCode: item.externalCode,
          name: item.name,
          website: item.website,
          phone: item.phone,
          isActive: true,
        });
      } else {
        if (isapre.deletedAt) {
          isapre = await isapreRepo.recover(isapre);
        }
        isapre.externalCode = item.externalCode;
        isapre.name = item.name;
        isapre.website = item.website;
        isapre.phone = item.phone;
        isapre.isActive = true;
      }
      isapre = await isapreRepo.save(isapre);
      isapreByCode.set(isapre.code, isapre);
      console.log(
        `✅ Isapre «${isapre.name}» sincronizada: ${isapre.code} (ext=${isapre.externalCode})`,
      );
    }

    const jobPositionRepo = dataSource.getRepository(HrJobPosition);
    const jobPositionByCode = new Map<string, HrJobPosition>();
    for (const item of SEED_JOB_POSITIONS) {
      let position = await jobPositionRepo.findOne({
        where: { companyId: company.id, code: item.code },
        withDeleted: true,
      });
      if (!position) {
        position = jobPositionRepo.create({
          companyId: company.id,
          code: item.code,
          name: item.name,
          description: item.description,
          defaultDuties: item.defaultDuties,
          sortOrder: item.sortOrder,
          isActive: true,
        });
      } else {
        if (position.deletedAt) {
          position = await jobPositionRepo.recover(position);
        }
        position.name = item.name;
        position.description = item.description;
        position.defaultDuties = item.defaultDuties;
        position.sortOrder = item.sortOrder;
        position.isActive = true;
      }
      position = await jobPositionRepo.save(position);
      jobPositionByCode.set(item.code, position);
      console.log(
        `✅ Cargo «${position.name}» sincronizado: ${position.code}`,
      );
    }

    const shiftSystemRepo = dataSource.getRepository(HrShiftSystem);
    const shiftSystemByCode = new Map<string, HrShiftSystem>();
    let rotatingShiftSystemId: string | null = null;
    for (const item of SEED_SHIFT_SYSTEMS) {
      let system = await shiftSystemRepo.findOne({
        where: { companyId: company.id, code: item.code },
        withDeleted: true,
      });
      if (!system) {
        system = shiftSystemRepo.create({
          companyId: company.id,
          code: item.code,
          name: item.name,
          type: item.type,
          requiresPlannerAssignment: item.requiresPlannerAssignment,
          generatesLateEvents: item.generatesLateEvents,
          overtimeEnabled: item.overtimeEnabled,
          cycleConfigJson: item.cycleConfigJson ?? null,
          isActive: true,
        });
      } else {
        if (system.deletedAt) {
          system = await shiftSystemRepo.recover(system);
        }
        system.name = item.name;
        system.type = item.type;
        system.requiresPlannerAssignment = item.requiresPlannerAssignment;
        system.generatesLateEvents = item.generatesLateEvents;
        system.overtimeEnabled = item.overtimeEnabled;
        system.cycleConfigJson = item.cycleConfigJson ?? null;
        system.isActive = true;
      }
      system = await shiftSystemRepo.save(system);
      shiftSystemByCode.set(system.code, system);
      if (item.code === 'SS00002') rotatingShiftSystemId = system.id;
      console.log(
        `✅ Sistema de jornada «${system.name}» sincronizado: ${system.code} (${system.type})`,
      );
    }

    if (rotatingShiftSystemId) {
      const jornadaConfigRepo = dataSource.getRepository(HrJornadaConfig);
      let jornadaConfig = await jornadaConfigRepo.findOne({
        where: { companyId: company.id },
      });
      if (!jornadaConfig) {
        jornadaConfig = jornadaConfigRepo.create({
          companyId: company.id,
          defaultShiftSystemId: rotatingShiftSystemId,
          defaultWeeklyHours: '45',
          defaultExtraHoursMode: ExtraHoursMode.PAID_OVERTIME,
          nightStart: '21:00',
          nightEnd: '07:00',
        });
      } else {
        if (!jornadaConfig.defaultShiftSystemId) {
          jornadaConfig.defaultShiftSystemId = rotatingShiftSystemId;
        }
        jornadaConfig.defaultWeeklyHours = '45';
        jornadaConfig.defaultExtraHoursMode = ExtraHoursMode.PAID_OVERTIME;
        if (!jornadaConfig.nightStart) jornadaConfig.nightStart = '21:00';
        if (!jornadaConfig.nightEnd) jornadaConfig.nightEnd = '07:00';
      }
      await jornadaConfigRepo.save(jornadaConfig);
      console.log(
        `✅ defaultShiftSystemId → Rotativo (${rotatingShiftSystemId}); weeklyHours=45; noche=${jornadaConfig.nightStart}–${jornadaConfig.nightEnd}`,
      );
    }

    const employeesByDocument = new Map<string, Employee>();
    for (const item of SEED_EMPLOYEES) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: PersonType.NATURAL,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          documentType: DocumentType.RUT,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
          companyId: company.id,
        });
      } else {
        person.type = PersonType.NATURAL;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.documentType = DocumentType.RUT;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
        person.companyId = company.id;
      }
      const displayName = `${item.person.firstName} ${item.person.lastName}`.trim();
      const seedBankRow = buildSeedEmployeeBankAccount(
        displayName,
        item.person.documentNumber,
      );
      const bankByKey = new Map(
        (person.bankAccounts ?? []).map((a) => [
          a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
          a,
        ] as const),
      );
      bankByKey.set(seedBankRow.accountKey!, seedBankRow);
      person.bankAccounts = Array.from(bankByKey.values());
      person = await personRepo.save(person);

      const laborUnitCode = item.employee.laborUnitCode ?? 'UL00001';
      const assignedLaborUnit = laborUnitsByCode.get(laborUnitCode);
      if (!assignedLaborUnit) {
        throw new Error(
          `Empleado seed ${item.person.documentNumber}: UL desconocida ${laborUnitCode}`,
        );
      }

      let employee = await employeeRepo.findOne({
        where: { companyId: company.id, personId: person.id },
        withDeleted: true,
      });
      if (!employee) {
        employee = employeeRepo.create({
          companyId: company.id,
          personId: person.id,
          branchId: seedBranch.id,
          laborUnitId: assignedLaborUnit.id,
          employmentType: item.employee.employmentType,
          status: item.employee.status,
          hireDate: item.employee.hireDate,
          baseSalary: item.employee.baseSalary,
        });
      } else {
        if (employee.deletedAt) {
          employee = await employeeRepo.recover(employee);
        }
        employee.companyId = company.id;
        employee.personId = person.id;
        employee.branchId = seedBranch.id;
        employee.laborUnitId = assignedLaborUnit.id;
        employee.employmentType = item.employee.employmentType;
        employee.status = item.employee.status;
        employee.hireDate = item.employee.hireDate;
        employee.baseSalary = item.employee.baseSalary;
      }
      employee = await employeeRepo.save(employee);
      employeesByDocument.set(item.person.documentNumber, employee);
      console.log(
        `✅ Empleado «${displayName}» sincronizado: id=${employee.id} tipo=${employee.employmentType} estado=${employee.status} sueldo=${employee.baseSalary ?? '—'} cuenta=${seedBankRow.accountNumber}`,
      );
    }

    const laborUnitPuRepo = dataSource.getRepository(HrLaborUnitProductionUnit);
    const tallerForLu =
      tallerTextil ??
      (await productionUnitRepo.findOne({
        where: {
          companyId: company.id,
          code: 'TALLER',
          scope: ProductionUnitScope.COMPANY,
        },
      }));
    if (tallerForLu) {
      const existingLuPu = await laborUnitPuRepo.findOne({
        where: {
          laborUnitId: seedTallerLaborUnit.id,
          productionUnitId: tallerForLu.id,
        },
      });
      if (!existingLuPu) {
        await laborUnitPuRepo.save(
          laborUnitPuRepo.create({
            companyId: company.id,
            laborUnitId: seedTallerLaborUnit.id,
            productionUnitId: tallerForLu.id,
          }),
        );
      }
      console.log(
        `✅ UL ${seedTallerLaborUnit.code} ↔ UP TALLER (${tallerForLu.id})`,
      );
    } else {
      console.warn(
        '⚠️ UP TALLER no encontrada; no se vinculó UL00003 a producción',
      );
    }

    const contractRepo = dataSource.getRepository(EmploymentContract);
    for (const [documentNumber, def] of Object.entries(SEED_EMPLOYEE_CONTRACTS)) {
      const employee = employeesByDocument.get(documentNumber);
      if (!employee) {
        console.warn(`⚠️ Contrato seed: empleado ${documentNumber} no encontrado`);
        continue;
      }
      const person = await personRepo.findOne({
        where: { id: employee.personId },
      });
      const displayName = person
        ? `${person.firstName} ${person.lastName ?? ''}`.trim()
        : documentNumber;

      let contract = await contractRepo.findOne({
        where: {
          companyId: company.id,
          employeeId: employee.id,
          status: EmploymentContractStatus.ACTIVE,
        },
      });
      if (!contract) {
        contract = contractRepo.create({
          companyId: company.id,
          employeeId: employee.id,
          branchId: seedBranch.id,
          status: EmploymentContractStatus.ACTIVE,
          startDate: employee.hireDate ?? '2025-01-01',
          mealAllowance: '0',
          transportAllowance: '0',
          tipsEligible: false,
          salesCommissionType: SalesCommissionType.NONE,
        });
      }

      contract.branchId = seedBranch.id;
      contract.status = EmploymentContractStatus.ACTIVE;
      contract.startDate = employee.hireDate ?? contract.startDate;

      if (def.kind === EmploymentContractKind.FEE) {
        const job =
          def.jobPositionCode != null
            ? jobPositionByCode.get(def.jobPositionCode)
            : undefined;
        contract.kind = EmploymentContractKind.FEE;
        contract.laborType = null;
        contract.workRegime = null;
        contract.weeklyHours = null;
        contract.extraHoursMode = null;
        contract.baseSalary = null;
        contract.feeAmount = employee.baseSalary ?? '0';
        contract.tipsEligible = false;
        contract.afpId = null;
        contract.afpCode = null;
        contract.afpName = null;
        contract.afpContributionPercent = null;
        contract.healthSystem = null;
        contract.isapreId = null;
        contract.isapreCode = null;
        contract.isapreName = null;
        contract.healthContributionMode = null;
        contract.healthContributionValue = null;
        contract.mutualName = null;
        contract.shiftSystemId = null;
        contract.shiftSystemCode = null;
        contract.shiftSystemName = null;
        contract.shiftSystemType = null;
        contract.fixedScheduleJson = null;
        contract.flexibleMode = null;
        contract.flexibleBandJson = null;
        contract.art22Exempt = null;
        contract.exceptionalResolutionRef = null;
        contract.endDate = null;
        contract.jobPositionId = job?.id ?? null;
        contract.duties = job?.defaultDuties ?? null;
        contract.notes = def.notes ?? null;
        contract.salesCommissionType = SalesCommissionType.NONE;
        contract.salesCommissionValue = null;
      } else {
        const shiftSystem = shiftSystemByCode.get(def.shiftSystemCode);
        if (!shiftSystem) {
          console.warn(
            `⚠️ Contrato seed ${documentNumber}: shift system ${def.shiftSystemCode} no encontrado`,
          );
          continue;
        }
        const afp = afpByCode.get(def.afpCode);
        if (!afp) {
          console.warn(
            `⚠️ Contrato seed ${documentNumber}: AFP ${def.afpCode} no encontrada`,
          );
          continue;
        }
        const job = jobPositionByCode.get(def.jobPositionCode);
        let isapre: HrIsapre | undefined;
        if (def.healthSystem === 'ISAPRE') {
          isapre = def.isapreCode
            ? isapreByCode.get(def.isapreCode)
            : undefined;
          if (!isapre) {
            console.warn(
              `⚠️ Contrato seed ${documentNumber}: Isapre ${def.isapreCode} no encontrada`,
            );
            continue;
          }
        }

        contract.kind = EmploymentContractKind.LABOR;
        contract.laborType = def.laborType;
        contract.workRegime = def.workRegime;
        contract.weeklyHours = def.weeklyHours;
        contract.extraHoursMode = def.extraHoursMode;
        contract.baseSalary = employee.baseSalary ?? null;
        contract.feeAmount = null;
        contract.tipsEligible = foodMode
          ? SEED_WAITER_DOCUMENT_NUMBERS.has(documentNumber)
          : def.tipsEligible ?? false;
        contract.afpId = afp.id;
        contract.afpCode = afp.code;
        contract.afpName = afp.name;
        contract.afpContributionPercent = afp.contributionPercent;
        contract.healthSystem = def.healthSystem;
        contract.isapreId = isapre?.id ?? null;
        contract.isapreCode = isapre?.code ?? null;
        contract.isapreName = isapre?.name ?? null;
        contract.healthContributionMode =
          def.healthContributionMode ?? null;
        contract.healthContributionValue =
          def.healthContributionValue ?? null;
        contract.mutualName = def.mutualName;
        contract.shiftSystemId = shiftSystem.id;
        contract.shiftSystemCode = shiftSystem.code;
        contract.shiftSystemName = shiftSystem.name;
        contract.shiftSystemType = shiftSystem.type;
        contract.fixedScheduleJson =
          shiftSystem.type === ShiftSystemType.FIXED
            ? (def.fixedScheduleJson ?? null)
            : null;
        contract.flexibleMode =
          shiftSystem.type === ShiftSystemType.FLEXIBLE
            ? (def.flexibleMode ?? FlexibleMode.OPEN)
            : null;
        contract.flexibleBandJson =
          shiftSystem.type === ShiftSystemType.FLEXIBLE &&
          def.flexibleMode === FlexibleMode.BAND
            ? (def.flexibleBandJson ?? null)
            : null;
        contract.art22Exempt =
          shiftSystem.type === ShiftSystemType.FREE
            ? (def.art22Exempt ?? true)
            : null;
        contract.exceptionalResolutionRef =
          shiftSystem.type === ShiftSystemType.EXCEPTIONAL
            ? (def.exceptionalResolutionRef ?? null)
            : null;
        contract.endDate = def.endDate ?? null;
        contract.jobPositionId = job?.id ?? null;
        contract.duties = job?.defaultDuties ?? null;
        contract.notes = null;
        const pct =
          typeof def.salesCommissionPercent === 'string'
            ? def.salesCommissionPercent.trim()
            : '';
        if (pct && Number(pct) > 0) {
          contract.salesCommissionType = SalesCommissionType.PERCENT;
          contract.salesCommissionValue = pct;
        } else {
          contract.salesCommissionType = SalesCommissionType.NONE;
          contract.salesCommissionValue = null;
        }
      }

      contract = await contractRepo.save(contract);
      console.log(
        `✅ Contrato ACTIVE «${displayName}»: ${contract.kind}` +
          (contract.kind === EmploymentContractKind.LABOR
            ? ` ${contract.weeklyHours}h · ${contract.shiftSystemCode}` +
              (contract.salesCommissionType === SalesCommissionType.PERCENT
                ? ` · comisión ${contract.salesCommissionValue}%`
                : '') +
              (contract.tipsEligible ? ' · tipsEligible' : '')
            : ` honorario=${contract.feeAmount}`),
      );
    }
    if (foodMode) {
      console.log(
        '✅ KaiFood: tipsEligible solo meseros (17.100.009-2 / 010-6 / 011-4)',
      );
    }

    const laborUnitShiftRepo = dataSource.getRepository(HrLaborUnitShift);
    const laborUnitShiftMemberRepo = dataSource.getRepository(
      HrLaborUnitShiftMember,
    );
    for (const item of SEED_LABOR_UNIT_SHIFTS) {
      const shiftLaborUnitCode = item.laborUnitCode ?? 'UL00001';
      const shiftLaborUnit = laborUnitsByCode.get(shiftLaborUnitCode);
      if (!shiftLaborUnit) {
        throw new Error(
          `Turno UL seed ${item.code}: UL desconocida ${shiftLaborUnitCode}`,
        );
      }
      let shift = await laborUnitShiftRepo.findOne({
        where: { companyId: company.id, code: item.code },
        withDeleted: true,
      });
      if (!shift) {
        shift = laborUnitShiftRepo.create({
          companyId: company.id,
          laborUnitId: shiftLaborUnit.id,
          code: item.code,
          name: item.name,
          scheduleJson: item.scheduleJson,
          timezone: 'America/Santiago',
          isActive: true,
          effectiveFrom: item.effectiveFrom,
          effectiveTo: null,
        });
      } else {
        if (shift.deletedAt) {
          shift = await laborUnitShiftRepo.recover(shift);
        }
        shift.laborUnitId = shiftLaborUnit.id;
        shift.name = item.name;
        shift.scheduleJson = item.scheduleJson;
        shift.timezone = 'America/Santiago';
        shift.isActive = true;
        shift.effectiveFrom = item.effectiveFrom;
        shift.effectiveTo = null;
      }
      shift = await laborUnitShiftRepo.save(shift);
      console.log(
        `✅ Turno UL «${shift.name}» sincronizado: ${shift.code} (UL=${shiftLaborUnit.code})`,
      );

      const desiredDocs = new Set(item.memberDocumentNumbers);
      const existingMembers = await laborUnitShiftMemberRepo.find({
        where: { companyId: company.id, shiftId: shift.id },
      });

      for (const documentNumber of item.memberDocumentNumbers) {
        const employee = employeesByDocument.get(documentNumber);
        if (!employee) {
          console.warn(
            `⚠️ Miembro turno ${item.code}: empleado ${documentNumber} no encontrado`,
          );
          continue;
        }
        if (employee.status !== EmployeeStatus.ACTIVE) {
          continue;
        }

        const otherActives = await laborUnitShiftMemberRepo.find({
          where: {
            companyId: company.id,
            employeeId: employee.id,
            status: LaborUnitShiftMemberStatus.ACTIVE,
          },
        });
        for (const other of otherActives) {
          if (other.shiftId !== shift.id) {
            other.status = LaborUnitShiftMemberStatus.INACTIVE;
            await laborUnitShiftMemberRepo.save(other);
          }
        }

        let member = existingMembers.find((m) => m.employeeId === employee.id);
        if (!member) {
          member = laborUnitShiftMemberRepo.create({
            companyId: company.id,
            shiftId: shift.id,
            employeeId: employee.id,
            status: LaborUnitShiftMemberStatus.ACTIVE,
          });
        } else {
          member.status = LaborUnitShiftMemberStatus.ACTIVE;
        }
        await laborUnitShiftMemberRepo.save(member);
      }

      for (const member of existingMembers) {
        const emp = [...employeesByDocument.entries()].find(
          ([, e]) => e.id === member.employeeId,
        );
        const doc = emp?.[0];
        if (!doc || !desiredDocs.has(doc)) {
          if (member.status === LaborUnitShiftMemberStatus.ACTIVE) {
            member.status = LaborUnitShiftMemberStatus.INACTIVE;
            await laborUnitShiftMemberRepo.save(member);
          }
        }
      }
      console.log(
        `✅ Miembros turno ${shift.code}: ${item.memberDocumentNumbers.length} esperado(s)`,
      );
    }

    const seedShareholderPersonIds = new Set<string>();

    for (const sh of SEED_DEV_SHAREHOLDERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: sh.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: PersonType.NATURAL,
          firstName: sh.firstName,
          lastName: sh.lastName,
          documentType: sh.documentType,
          documentNumber: sh.documentNumber,
        });
      } else {
        person.firstName = sh.firstName;
        person.lastName = sh.lastName;
        person.documentType = sh.documentType;
      }
      person = await personRepo.save(person);
      seedShareholderPersonIds.add(person.id);

      let shRow = await shareholderRepo.findOne({
        where: { companyId: company.id, personId: person.id, deletedAt: null as never },
      });
      if (!shRow) {
        shRow = shareholderRepo.create({
          companyId: company.id,
          personId: person.id,
          ownershipPercentage: sh.ownershipPercentage,
          partnerType: sh.partnerType,
          joinDate: sh.joinDate,
          isActive: true,
        });
      } else {
        shRow.ownershipPercentage = sh.ownershipPercentage;
        shRow.partnerType = sh.partnerType;
        shRow.joinDate = sh.joinDate;
        shRow.isActive = true;
      }
      await shareholderRepo.save(shRow);
      console.log(
        `✅ Socio seed: ${sh.firstName} ${sh.lastName} participación=${sh.ownershipPercentage}% partnerType=${sh.partnerType}`,
      );
    }

    {
      const otherShareholders = await shareholderRepo.find({
        where: { companyId: company.id, deletedAt: null as never },
      });
      for (const row of otherShareholders) {
        if (!seedShareholderPersonIds.has(row.personId)) {
          await shareholderRepo.softRemove(row);
          console.log(`🗑️ Socio fuera de seed retirado: shareholderId=${row.id}`);
        }
      }
    }

    // Helper: usuario seed + membership (tras TRUNCATE no queda legacy OPERATOR).
    // SUPER_ADMIN: sin persona ni membership. Resto: Person + membership canónico.
    const membershipRoleFromUserRole = (rol: UserRole): string => {
      if (rol === UserRole.OPERATOR || rol === UserRole.POS_OPERATOR) {
        return PlatformRoleCode.POS_OPERATOR;
      }
      return rol;
    };

    const ensureSeedUser = async (params: {
      userName: string;
      password: string;
      rol: UserRole;
      companyId: string | null;
      nonDeletable: boolean;
      firstName: string;
      lastName?: string;
      email: string;
      documentNumber: string;
      phone?: string;
      preferOwner?: boolean;
    }) => {
      const needsPerson = params.rol !== UserRole.SUPER_ADMIN;
      if (needsPerson && !params.companyId) {
        throw new Error(
          `Usuario seed ${params.userName} (${params.rol}) requiere companyId para asociar persona.`,
        );
      }

      let u = await userRepo.findOne({
        where: { userName: params.userName, deletedAt: null as never },
        relations: ['person'],
      });

      const upsertPerson = async (existing?: Person | null): Promise<Person> => {
        const companyIdForPerson = params.companyId as string;
        let person = existing ?? null;
        if (!person) {
          person = await personRepo.findOne({
            where: {
              documentNumber: params.documentNumber,
              companyId: companyIdForPerson,
              deletedAt: null as never,
            },
          });
        }
        if (!person) {
          person = personRepo.create({
            type: PersonType.NATURAL,
            firstName: params.firstName,
            lastName: params.lastName || undefined,
            documentType: DocumentType.RUT,
            documentNumber: params.documentNumber,
            email: params.email,
            phone: params.phone,
            companyId: companyIdForPerson,
          });
        } else {
          person.type = PersonType.NATURAL;
          person.firstName = params.firstName;
          person.lastName = params.lastName || undefined;
          person.documentType = DocumentType.RUT;
          person.documentNumber = params.documentNumber;
          person.email = params.email;
          if (params.phone) person.phone = params.phone;
          person.companyId = companyIdForPerson;
        }
        return personRepo.save(person);
      };

      const syncMembership = async (user: User, person?: Person | null) => {
        if (user.rol === UserRole.SUPER_ADMIN || !user.companyId) return;

        const memRole = membershipRoleFromUserRole(user.rol);
        let membership = await membershipRepo.findOne({
          where: { userId: user.id, companyId: user.companyId },
        });

        const ownerCount = await membershipRepo.count({
          where: {
            companyId: user.companyId,
            isOwner: true,
            isActive: true,
          },
        });
        const shouldOwn =
          memRole === PlatformRoleCode.ADMIN &&
          (params.preferOwner === true ||
            (params.preferOwner !== false && ownerCount === 0));

        if (!membership) {
          membership = await membershipRepo.save(
            membershipRepo.create({
              userId: user.id,
              companyId: user.companyId,
              isOwner: shouldOwn,
              isActive: true,
            }),
          );
        } else {
          membership.isActive = true;
          if (params.preferOwner === false) {
            membership.isOwner = false;
          } else if (shouldOwn) {
            membership.isOwner = true;
          }
          await membershipRepo.save(membership);
        }

        const existingRoles = await membershipRoleRepo.find({
          where: { membershipId: membership.id },
        });
        for (const r of existingRoles) {
          if (r.role === 'OPERATOR' || r.role !== memRole) {
            await membershipRoleRepo.delete({ id: r.id });
          }
        }
        const still = await membershipRoleRepo.find({
          where: { membershipId: membership.id },
        });
        if (!still.some((r) => r.role === memRole)) {
          await membershipRoleRepo.save(
            membershipRoleRepo.create({
              membershipId: membership.id,
              role: memRole,
            }),
          );
        }

        if (person?.id) {
          await userCompanyPersonRepo.upsert(
            {
              userId: user.id,
              companyId: user.companyId,
              personId: person.id,
            },
            ['userId', 'companyId'],
          );
        }
      };

      if (!u) {
        const person = needsPerson ? await upsertPerson(null) : undefined;
        u = userRepo.create({
          userName: params.userName,
          pass: await bcrypt.hash(params.password, 12),
          mail: params.email,
          rol: params.rol,
          companyId: params.companyId,
          nonDeletable: params.nonDeletable,
          person: person ?? undefined,
        });
        await userRepo.save(u);
        await syncMembership(u, person ?? null);
        console.log(
          `✅ Usuario seed creado: rol=${params.rol} userName='${params.userName}'` +
            (person
              ? ` person=${person.firstName}${person.lastName ? ` ${person.lastName}` : ''} doc=${person.documentNumber}`
              : ' (sin persona)'),
        );
        return;
      }

      const needsBcrypt = !u.pass?.startsWith('$2');
      if (needsBcrypt) {
        u.pass = await bcrypt.hash(params.password, 12);
      }
      u.mail = params.email;
      u.rol = params.rol;
      u.companyId = params.companyId;
      u.nonDeletable = params.nonDeletable;

      if (needsPerson) {
        u.person = await upsertPerson(u.person ?? null);
      } else {
        u.person = null as unknown as undefined;
      }

      await userRepo.save(u);
      await syncMembership(u, u.person ?? null);

      console.log(
        `✅ Usuario seed actualizado: rol=${params.rol} userName='${params.userName}'` +
          (u.person
            ? ` person=${u.person.firstName}${u.person.lastName ? ` ${u.person.lastName}` : ''} doc=${u.person.documentNumber}`
            : ' (sin persona)'),
      );
    };


    const seedPassword = password;

    await ensureSeedUser({
      userName: 'superadmin',
      password: seedPassword,
      rol: UserRole.SUPER_ADMIN,
      companyId: null,
      nonDeletable: true,
      firstName: 'Administrador',
      lastName: 'de Sistema',
      email: 'superadmin@kai.local',
      documentNumber: '11111111-1',
    });

    await ensureSeedUser({
      userName: userName,
      password: seedPassword,
      rol: UserRole.ADMIN,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Administrador',
      lastName: 'de Empresa',
      email,
      documentNumber: '10.987.654-3',
      phone: '+56 9 8765 4321',
      preferOwner: true,
    });

    const adminUser = await userRepo.findOne({
      where: { userName, deletedAt: null as never },
    });
    if (!adminUser) {
      throw new Error(`Usuario admin seed '${userName}' no encontrado tras ensureSeedUser`);
    }

    let foodMembership = await membershipRepo.findOne({
      where: { userId: adminUser.id, companyId: companyFood.id },
    });
    if (!foodMembership) {
      foodMembership = await membershipRepo.save(
        membershipRepo.create({
          userId: adminUser.id,
          companyId: companyFood.id,
          isOwner: true,
          isActive: true,
        }),
      );
    } else {
      foodMembership.isActive = true;
      foodMembership.isOwner = true;
      await membershipRepo.save(foodMembership);
    }
    const foodRoles = await membershipRoleRepo.find({
      where: { membershipId: foodMembership.id },
    });
    if (!foodRoles.some((r) => r.role === PlatformRoleCode.ADMIN)) {
      await membershipRoleRepo.save(
        membershipRoleRepo.create({
          membershipId: foodMembership.id,
          role: PlatformRoleCode.ADMIN,
        }),
      );
    }
    console.log(
      `✅ Admin «${userName}» también miembro de «${companyFood.nombreFantasia}» (${companyFood.kaiProduct})`,
    );

    // Operadores POS antes del historial operativo (ventas los usan como userId).
    await ensureSeedUser({
      userName: 'operador',
      password: seedPassword,
      rol: UserRole.POS_OPERATOR,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Sofía',
      lastName: 'Vargas Núñez',
      email: 'sofia.vargas@empleado.local',
      documentNumber: '17.205.884-3',
      phone: '+56 9 7654 3210',
    });

    await ensureSeedUser({
      userName: 'operador2',
      password: seedPassword,
      rol: UserRole.POS_OPERATOR,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Nicolás',
      lastName: 'Bravo Soto',
      email: 'nicolas.bravo@empleado.local',
      documentNumber: '17.100.012-2',
      phone: '+56 9 7000 0012',
    });

    await ensureSeedUser({
      userName: 'operador3',
      password: seedPassword,
      rol: UserRole.POS_OPERATOR,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Fernanda',
      lastName: 'Lagos Ruiz',
      email: 'fernanda.lagos@empleado.local',
      documentNumber: '17.100.013-0',
      phone: '+56 9 7000 0013',
    });

    const operatorUserNames = ['operador', 'operador2', 'operador3'] as const;
    const operatorUserIds: Record<string, string> = {};
    for (const opName of operatorUserNames) {
      const opUser = await userRepo.findOne({
        where: { userName: opName, deletedAt: null as never },
      });
      if (!opUser) {
        throw new Error(
          `Usuario operador seed '${opName}' no encontrado tras ensureSeedUser`,
        );
      }
      operatorUserIds[opName] = opUser.id;
    }

    await ensureSeedUser({
      userName: 'mesero1',
      password: seedPassword,
      rol: UserRole.WAITER,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Camila',
      lastName: 'Rojas Paredes',
      email: 'camila.rojas@empleado.local',
      documentNumber: '17.100.009-2',
      phone: '+56 9 7000 0009',
    });

    await ensureSeedUser({
      userName: 'mesero2',
      password: seedPassword,
      rol: UserRole.WAITER,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Diego',
      lastName: 'Muñoz Castillo',
      email: 'diego.munoz@empleado.local',
      documentNumber: '17.100.010-6',
      phone: '+56 9 7000 0010',
    });

    await ensureSeedUser({
      userName: 'mesero3',
      password: seedPassword,
      rol: UserRole.WAITER,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Javiera',
      lastName: 'Soto Ibáñez',
      email: 'javiera.soto@empleado.local',
      documentNumber: '17.100.011-4',
      phone: '+56 9 7000 0011',
    });

    const waiterUserNames = ['mesero1', 'mesero2', 'mesero3'] as const;
    const waiterUserIds: Record<string, string> = {};
    for (const wName of waiterUserNames) {
      const wUser = await userRepo.findOne({
        where: { userName: wName, deletedAt: null as never },
      });
      if (!wUser) {
        throw new Error(
          `Usuario mesero seed '${wName}' no encontrado tras ensureSeedUser`,
        );
      }
      waiterUserIds[wName] = wUser.id;
    }

    await seedDemoOperationalHistory({
      app,
      dataSource,
      companyId: company.id,
      branchId: seedBranch.id,
      adminUserId: adminUser.id,
      operatorUserIds,
    });

    if (foodMode) {
      await seedDemoTipsHistory({
        app,
        dataSource,
        companyId: company.id,
        branchId: seedBranch.id,
        operatorUserIds,
        waiterUserIds,
      });
    }

    await ensureSeedUser({
      userName: 'admin2',
      password: seedPassword,
      rol: UserRole.ADMIN,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Pedro',
      lastName: 'Soto Núñez',
      email: 'admin2@kai.local',
      documentNumber: '15.333.222-1',
      phone: '+56 9 1111 2222',
      preferOwner: false,
    });

    await ensureSeedUser({
      userName: 'delivery1',
      password: seedPassword,
      rol: UserRole.COURIER,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Matías',
      lastName: 'Fuentes Lagos',
      email: 'delivery1@kai.local',
      documentNumber: '18.103.772-5',
      phone: '+56 9 6543 2109',
    });

    await ensureSeedUser({
      userName: 'delivery2',
      password: seedPassword,
      rol: UserRole.COURIER,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Valentina',
      lastName: 'Pizarro Núñez',
      email: 'delivery2@kai.local',
      documentNumber: '19.884.201-7',
      phone: '+56 9 5432 1098',
    });

    await seedDemoDeliveryCalendar({
      dataSource,
      companyId: company.id,
    });

    console.log('✅ Seed mínimo OK. Usuarios listos:');
    console.log(`   • superadmin / ${seedPassword}   (SUPER_ADMIN, sin persona, protegido)`);
    console.log(
      `   • ${userName} / ${seedPassword}        (ADMIN owner · Kai Suite · 10.987.654-3)`,
    );
    console.log(
      `   • admin2 / ${seedPassword}         (ADMIN no-owner · Pedro Soto Núñez · 15.333.222-1)`,
    );
    console.log(
      `   • operador / ${seedPassword}    (POS_OPERATOR · Sofía Vargas · 17.205.884-3 · cajero · comisión 3%)`,
    );
    console.log(
      `   • operador2 / ${seedPassword}   (POS_OPERATOR · Nicolás Bravo · 17.100.012-2 · cajero · comisión 2.5%)`,
    );
    console.log(
      `   • operador3 / ${seedPassword}   (POS_OPERATOR · Fernanda Lagos · 17.100.013-0 · cajero · sin comisión)`,
    );
    console.log(
      `   • delivery1 / ${seedPassword}   (COURIER · Matías Fuentes Lagos · 18.103.772-5)`,
    );
    console.log(
      `   • delivery2 / ${seedPassword}   (COURIER · Valentina Pizarro Núñez · 19.884.201-7)`,
    );
    console.log(
      `   • mesero1 / ${seedPassword}    (WAITER · Camila Rojas · 17.100.009-2 · propinas)`,
    );
    console.log(
      `   • mesero2 / ${seedPassword}    (WAITER · Diego Muñoz · 17.100.010-6 · propinas)`,
    );
    console.log(
      `   • mesero3 / ${seedPassword}    (WAITER · Javiera Soto · 17.100.011-4 · propinas)`,
    );
    console.log(
      `   • Empresas: «${SEED_DEV_COMPANY.nombreFantasia}» (${SEED_DEV_COMPANY.kaiProduct}) + «${SEED_DEV_COMPANY_SECOND.nombreFantasia}» (${SEED_DEV_COMPANY_SECOND.kaiProduct}) — admin en ambas`,
    );
    console.log(
      `   • Preventa: ON | POS preventa «${SEED_PRESALE_POS_NAME}» | Cajas aceptan tickets de preventa`,
    );
    console.log(
      `   • Delivery: repartos + retiros en local (jul–ago 2026) | zona «Parral»`,
    );
      },
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed mínimo:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
