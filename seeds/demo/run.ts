#!/usr/bin/env ts-node

import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DataSource, DeepPartial, IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
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
} from '@modules/employees/domain/employee.entity';
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
import { TenantContext } from '@common/tenant/tenant.context';
import { AppConfigService } from '../../backend/src/config/config.service';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import {
  cleanBackendPublicFolder,
  SEED_COMPANY_LOGO_FILE,
  seedDevCatalogMultimedia,
  seedDevEshopHeroSlides,
  seedDevEshopTestimonials,
  seedMultimediaFileLink,
} from '../shared/seed-multimedia.util';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import type { CompanyPaymentMethodConfig } from '@modules/payment-methods-config/domain/payment-method-config.types';
import {
  SEED_BRANCH_ADDRESS,
  SEED_BRANCH_LOCATION,
  SEED_BRANCH_NAME,
  SEED_BRANCH_PHONE,
  SEED_CASH_HUBS,
  SEED_DEV_COMPANY,
  SEED_DEV_COMPANY_SECOND,
  SEED_DEV_COMPANY_SECOND_ESHOP_SLUG,
  SEED_DEV_SHAREHOLDERS,
  SEED_POS_NAMES,
  SEED_PRICE_LIST_ESHOP_NAME,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_PRICE_LIST_WHOLESALE_NAME,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedEmployeeBankAccount,
  buildSeedEshopPublicContact,
  buildSeedPosPaymentList,
} from './config';
import {
  SEED_DEV_ATTRIBUTES,
  SEED_DEV_ATTRIBUTE_TALLA,
  SEED_DEV_BRANDS,
  SEED_DEV_CATEGORIES,
  SEED_DEV_PRODUCTS,
  SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES,
  SEED_DEV_VARIANT_SKU_PREFIX,
  collectSeedDevCatalogProductNames,
  collectSeedDevCatalogSkus,
  type SeedDevUnitKey,
} from './catalog';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import {
  seedProductsFromDefinitions,
  syncSeedAttributes,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

const SEED_HONORARIUM_RETENTION_NAME = 'Retención pago Honorarios';
const SEED_HONORARIUM_RETENTION_DESCRIPTION =
  'Retención de impuesto aplicable al pago de honorarios (tasa referencial 15,25%).';

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
}): Promise<void> {
  const {
    companyId,
    productRepo,
    variantRepo,
    priceListItemRepo,
    stockLevelRepo,
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
}[] = [
  { name: 'Sueldos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Horas extra', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Cargas sociales', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Capacitación operativa', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Arriendo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Gastos comunes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Mantención', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Limpieza', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Seguridad física', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Embalaje', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Útiles', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Materiales no inventariables', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  {
    name: 'EPP (Elementos de Protección Personal)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
  },
  { name: 'Flete', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Courier', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Combustible operativo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Peajes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Almacenaje externo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Software recurrente', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Hosting', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'POS (Puntos de Venta)', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Soporte', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Licencias', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  {
    name: 'Promociones en tienda',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Señalética',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Muestras',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Contabilidad/tributario recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
  },
  { name: 'Retainer legal', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  { name: 'Auditorías', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  {
    name: 'Comisiones bancarias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  { name: 'Seguros operativos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA },
  {
    name: 'Costos de líneas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  {
    name: 'Mermas autorizadas',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Diferencias de caja menores',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Obsolescencia (gasto operativo)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Permisos municipales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Fiscalización',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Certificaciones obligatorias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
] as const;

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
  };
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
      documentType: DocumentType.RUN,
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
      documentType: DocumentType.DNI,
      documentNumber: 'PROV-AR-001',
      phone: '+56 9 4321 1000',
      address: 'Pasaje Las Flores 120, Chillán',
    },
    supplier: {
      supplierType: SupplierType.CONTRACTOR,
      alias: 'A. Rojas',
      defaultPaymentTermDays: 7,
      isActive: true,
      notes: 'Proveedor sin email para validar campos opcionales.',
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
      documentType: DocumentType.RUN,
      documentNumber: '12.345.678-5',
      email: 'carlos.gutierrez@logistica.cl',
      address: 'Los Aromos 450, Rancagua',
    },
    supplier: {
      supplierType: SupplierType.LOGISTICS,
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
 * crédito en 0 para pruebas), un cliente inactivo, RUTs y RUN/PASS.
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
  };
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
      documentType: DocumentType.RUN,
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
      documentType: DocumentType.RUN,
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
      documentType: DocumentType.RUN,
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
      documentType: DocumentType.RUN,
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
      documentType: DocumentType.DNI,
      documentNumber: 'CUST-VS-001',
      phone: '+56 9 4444 1212',
    },
    customer: {
      creditLimit: 100000,
      paymentDayOfMonth: 20,
      isActive: true,
      notes: 'Documento DNI (validar campo opcional documentType).',
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
] as const;

type SeedDevCompanyDef = {
  razonSocial: string;
  nombreFantasia: string;
  rut: string;
  mail: string;
  phone: string;
  address: string;
  businessActivity: string;
  defaultCurrency: string;
};

/** Empresa activa en BD sin catálogo/sucursales — para probar multi-RUT en admin. */
async function upsertMinimalSeedCompany(
  companyRepo: Repository<Company>,
  def: SeedDevCompanyDef,
  eShopPublicSlug: string,
): Promise<Company> {
  assertValidChileCompanyRut(def.rut, `seed company (${def.rut})`);

  let row = await companyRepo.findOne({
    where: { rut: def.rut, deletedAt: null as never },
  });

  if (!row) {
    row = companyRepo.create({
      razonSocial: def.razonSocial,
      nombreFantasia: def.nombreFantasia,
      businessActivity: def.businessActivity,
      rut: def.rut,
      address: def.address,
      mail: def.mail,
      phone: def.phone,
      defaultCurrency: def.defaultCurrency,
      isActive: true,
    });
    await companyRepo.save(row);
    console.log(
      `✅ Empresa mínima creada: id=${row.id} razonSocial='${def.razonSocial}' rut='${def.rut}'`,
    );
  } else {
    row.razonSocial = def.razonSocial;
    row.nombreFantasia = def.nombreFantasia;
    row.businessActivity = def.businessActivity;
    row.address = def.address;
    row.mail = def.mail;
    row.phone = def.phone;
    await companyRepo.save(row);
    console.log(
      `✅ Empresa mínima ya existía: id=${row.id} rut='${row.rut}' (datos básicos actualizados)`,
    );
  }

  const seedBankRows = buildSeedCompanyBankAccounts(row.razonSocial);
  const byKey = new Map(
    (row.bankAccounts ?? []).map((a) => [
      a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
      a,
    ] as const),
  );
  for (const bankRow of seedBankRows) {
    byKey.set(bankRow.accountKey!, bankRow);
  }
  row.bankAccounts = Array.from(byKey.values());

  const seedCompanyPaymentCatalog = buildSeedCompanyPaymentCatalog();
  const settings = buildSeedCompanySettings(
    row.settings as Record<string, unknown> | undefined,
    seedCompanyPaymentCatalog,
  );
  settings.eShopEnabled = true;
  settings.eShopPublicSlug = eShopPublicSlug;
  settings.companyIdentity = {
    tagline: `Tienda ${def.nombreFantasia}`,
  };
  settings.publicContact = buildSeedEshopPublicContact(
    eShopPublicSlug,
    def.mail,
    def.phone,
  );
  row.settings = settings;
  await companyRepo.save(row);

  console.log(
    `✅ Empresa mínima lista: companyId=${row.id} eShop slug='${eShopPublicSlug}'`,
  );
  return row;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(AppConfigService);

    if (configService.storage.strategy !== 'local') {
      console.log(
        '⚠️  STORAGE_STRATEGY≠local — se omite limpieza de public/ y multimedia seed desde archivos.',
      );
    } else {
      await cleanBackendPublicFolder(configService.storage.local.path);
      console.log(
        `✅ Carpeta public del backend limpiada (${path.dirname(path.resolve(configService.storage.local.path))})`,
      );
    }

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

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@kai.local';
    const razonSocial =
      process.env.SEED_COMPANY_RAZON_SOCIAL || SEED_DEV_COMPANY.razonSocial;
    const nombreFantasia =
      process.env.SEED_NOMBRE_FANTASIA || SEED_DEV_COMPANY.nombreFantasia;
    const businessActivity =
      process.env.SEED_BUSINESS_ACTIVITY || SEED_DEV_COMPANY.businessActivity;
    const rut = process.env.SEED_COMPANY_RUT || SEED_DEV_COMPANY.rut;
    const companyAddress =
      process.env.SEED_COMPANY_ADDRESS || SEED_DEV_COMPANY.address;
    const companyMail =
      process.env.SEED_COMPANY_MAIL || SEED_DEV_COMPANY.mail;
    const companyPhone =
      process.env.SEED_COMPANY_PHONE || SEED_DEV_COMPANY.phone;

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
        defaultCurrency: SEED_DEV_COMPANY.defaultCurrency,
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(
        `✅ Empresa creada: id=${company.id} razonSocial='${razonSocial}' rut='${rut}'`,
      );
    } else {
      company.razonSocial = razonSocial;
      company.nombreFantasia = nombreFantasia;
      company.businessActivity = businessActivity;
      company.address = companyAddress;
      company.mail = companyMail;
      company.phone = companyPhone;
      await companyRepo.save(company);
      console.log(
        `✅ Empresa ya existía: id=${company.id} razonSocial='${company.razonSocial}' rut='${company.rut}' (datos básicos actualizados)`,
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
    company.settings = syncedSettings;
    await companyRepo.save(company);
    console.log(
      `✅ Settings empresa sincronizados: medios (${seedCompanyPaymentCatalog
        .map((c) => c.method)
        .join(', ')}), cotizaciones 10/20 días, cheques off, crédito interno off`,
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

    await upsertMinimalSeedCompany(
      companyRepo,
      SEED_DEV_COMPANY_SECOND,
      SEED_DEV_COMPANY_SECOND_ESHOP_SLUG,
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

    if (configService.storage.strategy === 'local') {
      const multimediaAssetRepo = dataSource.getRepository(MultimediaAsset);
      const multimediaLinkRepo = dataSource.getRepository(MultimediaLink);
      try {
        const logoAsset = await seedMultimediaFileLink({
          assetRepo: multimediaAssetRepo,
          linkRepo: multimediaLinkRepo,
          sourceRelativePath: SEED_COMPANY_LOGO_FILE,
          localStoragePath: configService.storage.local.path,
          publicBasePath: configService.storage.publicBasePath,
          storageProvider: configService.storage.strategy,
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

    // Almacén ejemplo: sala de venta en sucursal seed (único almacén del seed)
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

    // Único almacén activo de la empresa seed: Sala de venta (predeterminado).
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
      if (st.id === seedSalaVenta.id) {
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

    const categoryByName = await syncSeedCategories(
      categoryRepo,
      SEED_DEV_CATEGORIES,
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
      opts: { isDefault: boolean; priority: number; nonDeletable?: boolean },
    ): Promise<PriceList> => {
      const existing = await priceListRepo.findOne({
        where: { companyId: company.id, name },
      });
      const payload = {
        companyId: company.id,
        priceListType: PriceListType.RETAIL,
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
    const listaMayorista = await upsertPriceList(SEED_PRICE_LIST_WHOLESALE_NAME, {
      isDefault: false,
      priority: 1,
    });
    const listaEshop = await upsertPriceList(SEED_PRICE_LIST_ESHOP_NAME, {
      isDefault: false,
      priority: 2,
      nonDeletable: true,
    });
    console.log(
      `✅ Listas de precios: «${listaMinorista.name}» id=${listaMinorista.id} (default), «${listaMayorista.name}» id=${listaMayorista.id}, «${listaEshop.name}» id=${listaEshop.id} (eShop, no eliminable)`,
    );

    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const brandRepo = dataSource.getRepository(Brand);

    const brandIdByName = await syncSeedBrands(
      brandRepo,
      company.id,
      SEED_DEV_BRANDS,
      'Seed dev',
    );
    console.log(`✅ Marcas desarrollo sincronizadas: ${SEED_DEV_BRANDS.length}`);

    const { variantCount: devVariantCount, stockByVariantId: devStockByVariantId } =
      await seedProductsFromDefinitions(SEED_DEV_PRODUCTS, {
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
        listaMayoristaId: listaMayorista.id,
        listaEshopId: listaEshop.id,
        logPrefix: 'Seed dev',
      });

    console.log(`✅ Catálogo desarrollo: ${devVariantCount} variante(s) en ${SEED_DEV_PRODUCTS.length} producto(s)`);

    await productRepo.update({ companyId: company.id }, { visibleInEShop: true });
    await variantRepo.update({ companyId: company.id }, { visibleInEShop: true });
    console.log('✅ eShop: todos los productos y variantes marcados visibleInEShop=true');

    await cleanupOrphanSeedDevCatalog({
      companyId: company.id,
      productRepo,
      variantRepo,
      priceListItemRepo,
      stockLevelRepo: dataSource.getRepository(StockLevel),
    });

    await variantRepo.update(
      { companyId: company.id },
      { pmp: null, pmpHistory: null },
    );
    console.log('✅ PMP e historial en null para todas las variantes de la empresa seed');

    const companyForEshop = await companyRepo.findOne({ where: { id: company.id } });
    if (companyForEshop) {
      const settings = {
        ...((companyForEshop.settings as Record<string, unknown>) ?? {}),
      };
      settings.eShopDefaultBranchId = seedBranch.id;
      settings.eShopDefaultPriceListId = listaEshop.id;
      settings.eShopDefaultStorageId = seedSalaVenta.id;

      const featuredProductIds: string[] = [];
      for (const productName of SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES) {
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

      if (featuredProductIds.length < SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES.length) {
        console.warn(
          `⚠️ Seed dev: solo ${featuredProductIds.length}/${SEED_DEV_ESHOP_FEATURED_PRODUCT_NAMES.length} producto(s) destacados eShop encontrados`,
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
      localStoragePath: configService.storage.local.path,
      publicBasePath: configService.storage.publicBasePath,
      storageProvider: configService.storage.strategy as 'local' | 'cloudflare',
      seedImages: configService.storage.strategy === 'local',
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
      { id: listaMayorista.id, name: listaMayorista.name, isActive: true },
    ];

    const reloadedCompany = await companyRepo.findOne({
      where: { id: company.id },
    });
    const companyCatalog: CompanyPaymentMethodConfig[] =
      reloadedCompany?.settings &&
      typeof reloadedCompany.settings === 'object' &&
      Array.isArray((reloadedCompany.settings as { paymentMethods?: unknown }).paymentMethods)
        ? ((reloadedCompany.settings as { paymentMethods: CompanyPaymentMethodConfig[] })
            .paymentMethods)
        : seedCompanyPaymentCatalog;
    const posPaymentList = buildSeedPosPaymentList(companyCatalog);

    const posPoints: PointOfSale[] = [];
    for (const posName of SEED_POS_NAMES) {
      const defaultListId =
        posName === SEED_POS_NAMES[0] ? listaMinorista.id : listaMayorista.id;
      let posRow = await posRepo.findOne({ where: { name: posName } });
      const posPayload = {
        name: posName,
        branchId: seedBranch.id,
        storageId: seedSalaVenta.id,
        isActive: true,
        deviceId: undefined,
        defaultPriceListId: defaultListId,
        priceLists: priceListsJson,
        settings: { paymentMethods: posPaymentList },
      };
      if (!posRow) {
        posRow = await posRepo.save(posRepo.create(posPayload));
        console.log(`✅ Punto de venta creado: «${posName}» id=${posRow.id}`);
      } else {
        posRow = await posRepo.save({ ...posRow, ...posPayload });
        console.log(`✅ Punto de venta sincronizado: «${posName}» id=${posRow.id}`);
      }
      posPoints.push(posRow);
    }

    const stockLevelRepo = dataSource.getRepository(StockLevel);
    const trackedVariants = await variantRepo.find({
      where: { companyId: company.id, trackInventory: true, deletedAt: null as never },
      select: ['id'],
    });
    for (const v of trackedVariants) {
      const physicalQty = devStockByVariantId.get(v.id) ?? 12;
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
      `✅ Stock «${SEED_STORAGE_NAME}»: ${trackedVariants.length} variante(s) con inventario`,
    );

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
        description: item.name,
        requiresApproval: false,
        approvalThreshold: '0',
        defaultResultCenterId: null,
        isActive: true,
        examples: null,
        metadata: null,
      });
      await expenseCategoryRepo.save(row);
      console.log(
        `✅ Categoría de gasto creada: ${row.name} (${row.operationalExpenseGroup}) id=${row.id}`,
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

    for (const item of SEED_EMPLOYEES) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: PersonType.NATURAL,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          documentType: DocumentType.RUN,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
        });
      } else {
        person.type = PersonType.NATURAL;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.documentType = DocumentType.RUN;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
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

      let employee = await employeeRepo.findOne({
        where: { companyId: company.id, personId: person.id },
        withDeleted: true,
      });
      if (!employee) {
        employee = employeeRepo.create({
          companyId: company.id,
          personId: person.id,
          branchId: seedBranch.id,
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
        employee.employmentType = item.employee.employmentType;
        employee.status = item.employee.status;
        employee.hireDate = item.employee.hireDate;
        employee.baseSalary = item.employee.baseSalary;
      }
      employee = await employeeRepo.save(employee);
      console.log(
        `✅ Empleado «${displayName}» sincronizado: id=${employee.id} tipo=${employee.employmentType} estado=${employee.status} sueldo=${employee.baseSalary ?? '—'} cuenta=${seedBankRow.accountNumber}`,
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

    // Helper idempotente: asegura un usuario seed con su persona asociada.
    // Si existe, actualiza rol/companyId/nonDeletable/email para que el
    // estado seed siempre coincida con el modelo declarado.
    const ensureSeedUser = async (params: {
      userName: string;
      password: string;
      rol: UserRole;
      companyId: string | null;
      nonDeletable: boolean;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
    }) => {
      let u = await userRepo.findOne({
        where: { userName: params.userName, deletedAt: null as never },
        relations: ['person'],
      });

      if (!u) {
        const personEntity = personRepo.create({
          type: PersonType.NATURAL,
          firstName: params.firstName,
          lastName: params.lastName,
          documentType: DocumentType.RUT,
          documentNumber: params.documentNumber,
          email: params.email,
        });
        const savedPerson = await personRepo.save(personEntity);

        u = userRepo.create({
          userName: params.userName,
          pass: await bcrypt.hash(params.password, 12),
          mail: params.email,
          rol: params.rol,
          companyId: params.companyId,
          nonDeletable: params.nonDeletable,
          person: savedPerson,
        });
        await userRepo.save(u);

        console.log(
          `✅ Usuario seed creado: rol=${params.rol} userName='${params.userName}' password='${params.password}'`,
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

      if (!u.person) {
        const personEntity = personRepo.create({
          type: PersonType.NATURAL,
          firstName: params.firstName,
          lastName: params.lastName,
          documentType: DocumentType.RUT,
          documentNumber: params.documentNumber,
          email: params.email,
        });
        u.person = await personRepo.save(personEntity);
      } else {
        u.person.firstName = params.firstName;
        u.person.lastName = params.lastName;
        u.person.documentNumber = params.documentNumber;
        u.person.email = params.email;
        await personRepo.save(u.person);
      }

      await userRepo.save(u);

      console.log(
        `✅ Usuario seed actualizado: rol=${params.rol} userName='${params.userName}' password='${params.password}'`,
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
      userName: userName, // 'admin' por defecto, configurable via SEED_ADMIN_USERNAME
      password: seedPassword,
      rol: UserRole.ADMIN,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Administrador',
      lastName: 'de empresa',
      email,
      documentNumber: '22222222-2',
    });

    await ensureSeedUser({
      userName: 'operador',
      password: seedPassword,
      rol: UserRole.OPERATOR,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Operador',
      lastName: 'POS',
      email: 'operador@kai.local',
      documentNumber: '33333333-3',
    });

    console.log('✅ Seed mínimo OK. Tres usuarios listos:');
    console.log(`   • superadmin / ${seedPassword}   (SUPER_ADMIN, protegido)`);
    console.log(`   • ${userName} / ${seedPassword}        (ADMIN de la empresa)`);
    console.log(`   • operador / ${seedPassword}    (OPERATOR de la empresa)`);
    console.log(
      `   • Empresas en BD: «${SEED_DEV_COMPANY.nombreFantasia}» (${SEED_DEV_COMPANY.rut}, eShop demo) + «${SEED_DEV_COMPANY_SECOND.nombreFantasia}» (${SEED_DEV_COMPANY_SECOND.rut}, eShop ${SEED_DEV_COMPANY_SECOND_ESHOP_SLUG})`,
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
